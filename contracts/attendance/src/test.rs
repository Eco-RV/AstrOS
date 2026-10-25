#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    Address, Env, Event as _, String,
    testutils::{Address as _, Events as _, Ledger as _},
};

const NOW: u64 = 1_700_000_000;
const HOUR: u64 = 3_600;

fn setup() -> (Env, AttendanceClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(NOW);
    let admin = Address::generate(&env);
    let id = env.register(Attendance, (admin,));
    let client = AttendanceClient::new(&env, &id);
    (env, client)
}

fn s(env: &Env, text: &str) -> String {
    String::from_str(env, text)
}

/// Event running now (started 1h ago, ends in 1h).
fn create(env: &Env, client: &AttendanceClient, organizer: &Address, max_claims: u32) -> u32 {
    client.create_event(
        organizer,
        &s(env, "Stellar Meetup"),
        &s(env, "Workshop"),
        &s(env, "San José"),
        &s(env, "https://example.com/badge.png"),
        &(NOW - HOUR),
        &(NOW + HOUR),
        &max_claims,
    )
}

#[test]
fn creates_and_lists_events() {
    let (env, client) = setup();
    let organizer = Address::generate(&env);

    let first = create(&env, &client, &organizer, 0);
    assert_eq!(
        env.events().all(),
        std::vec![
            EventCreated {
                organizer: organizer.clone(),
                id: first
            }
            .to_xdr(&env, &client.address)
        ]
    );
    assert_eq!(env.auths()[0].0, organizer);
    let second = create(&env, &client, &organizer, 0);

    assert_eq!((first, second), (0, 1));
    assert_eq!(client.event_count(), 2);
    let event = client.get_event(&first);
    assert_eq!(event.organizer, organizer);
    assert_eq!(event.claimed, 0);
    assert!(!event.closed);

    let latest = client.latest_events(&10);
    assert_eq!(latest.len(), 2);
    assert_eq!(latest.get(0).unwrap().id, 1); // newest first
    assert_eq!(client.latest_events(&1).len(), 1);
}

#[test]
fn validates_new_events() {
    let (env, client) = setup();
    let o = Address::generate(&env);
    let long = s(&env, &"x".repeat(MAX_DESCRIPTION_LEN as usize + 1));
    let url = s(&env, "");
    let ok = s(&env, "ok");

    assert_eq!(
        client.try_create_event(&o, &s(&env, ""), &ok, &ok, &url, &NOW, &(NOW + HOUR), &0),
        Err(Ok(Error::InvalidName))
    );
    assert_eq!(
        client.try_create_event(&o, &ok, &long, &ok, &url, &NOW, &(NOW + HOUR), &0),
        Err(Ok(Error::TextTooLong))
    );
    // Ends before it starts.
    assert_eq!(
        client.try_create_event(&o, &ok, &ok, &ok, &url, &(NOW + HOUR), &NOW, &0),
        Err(Ok(Error::InvalidDates))
    );
    // Already over.
    assert_eq!(
        client.try_create_event(
            &o,
            &ok,
            &ok,
            &ok,
            &url,
            &(NOW - 2 * HOUR),
            &(NOW - HOUR),
            &0
        ),
        Err(Ok(Error::InvalidDates))
    );
}

#[test]
fn claims_one_badge_per_attendee() {
    let (env, client) = setup();
    let organizer = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let id = create(&env, &client, &organizer, 0);

    assert_eq!(client.claim(&alice, &id), 1);
    assert_eq!(
        env.events().all(),
        std::vec![
            BadgeClaimed {
                event_id: id,
                attendee: alice.clone(),
                number: 1
            }
            .to_xdr(&env, &client.address)
        ]
    );
    assert_eq!(env.auths()[0].0, alice);
    assert_eq!(client.claim(&bob, &id), 2);
    assert_eq!(
        client.try_claim(&alice, &id),
        Err(Ok(Error::AlreadyClaimed))
    );

    assert_eq!(client.get_event(&id).claimed, 2);
    let badge = client.get_badge(&id, &alice).unwrap();
    assert_eq!(badge.number, 1);
    assert_eq!(badge.claimed_at, NOW);
    assert_eq!(badge.event_name, s(&env, "Stellar Meetup"));
    assert_eq!(client.badges_of(&alice).len(), 1);
    assert_eq!(client.get_badge(&id, &organizer), None);
    assert_eq!(client.badges_of(&organizer).len(), 0);
}

#[test]
fn claims_only_inside_the_window() {
    let (env, client) = setup();
    let organizer = Address::generate(&env);
    let alice = Address::generate(&env);
    let id = client.create_event(
        &organizer,
        &s(&env, "Later"),
        &s(&env, ""),
        &s(&env, ""),
        &s(&env, ""),
        &(NOW + HOUR),
        &(NOW + 2 * HOUR),
        &0,
    );

    assert_eq!(client.try_claim(&alice, &id), Err(Ok(Error::NotStarted)));
    env.ledger().set_timestamp(NOW + HOUR);
    assert_eq!(client.claim(&alice, &id), 1);
    env.ledger().set_timestamp(NOW + 2 * HOUR + 1);
    let bob = Address::generate(&env);
    assert_eq!(client.try_claim(&bob, &id), Err(Ok(Error::EventEnded)));
    assert_eq!(client.try_claim(&bob, &99), Err(Ok(Error::EventNotFound)));
}

#[test]
fn respects_max_claims() {
    let (env, client) = setup();
    let organizer = Address::generate(&env);
    let id = create(&env, &client, &organizer, 1);

    client.claim(&Address::generate(&env), &id);
    assert_eq!(
        client.try_claim(&Address::generate(&env), &id),
        Err(Ok(Error::SoldOut))
    );
}

#[test]
fn only_organizer_closes_the_event() {
    let (env, client) = setup();
    let organizer = Address::generate(&env);
    let stranger = Address::generate(&env);
    let id = create(&env, &client, &organizer, 0);

    assert_eq!(
        client.try_close_event(&stranger, &id),
        Err(Ok(Error::NotOrganizer))
    );
    client.close_event(&organizer, &id);
    assert_eq!(env.auths()[0].0, organizer);
    assert!(client.get_event(&id).closed);
    assert_eq!(client.try_claim(&stranger, &id), Err(Ok(Error::EventEnded)));
}

#[test]
fn caps_badges_per_owner() {
    let (env, client) = setup();
    let organizer = Address::generate(&env);
    let alice = Address::generate(&env);
    for _ in 0..MAX_BADGES_PER_OWNER {
        let id = create(&env, &client, &organizer, 0);
        client.claim(&alice, &id);
    }
    let id = create(&env, &client, &organizer, 0);
    assert_eq!(client.try_claim(&alice, &id), Err(Ok(Error::TooManyBadges)));
    assert_eq!(client.badges_of(&alice).len(), MAX_BADGES_PER_OWNER);
}

// ── 2.1.0: spaces, roles, proof, moderation, billing ────────────────────────

use ed25519_dalek::{Signer, SigningKey};
use soroban_sdk::{
    BytesN, Vec as SVec,
    token::{StellarAssetClient, TokenClient},
};

const XLM: i128 = 10_000_000;

fn setup_with_admin() -> (Env, AttendanceClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(NOW);
    let admin = Address::generate(&env);
    let id = env.register(Attendance, (admin.clone(),));
    let client = AttendanceClient::new(&env, &id);
    (env, client, admin)
}

fn space(env: &Env, client: &AttendanceClient, owner: &Address, slug: &str) -> u32 {
    client.create_space(
        owner,
        &s(env, slug),
        &s(env, "Barbería Central"),
        &s(env, "Cortes y eventos"),
        &Category::Belleza,
        &s(env, ""),
        &1,
    )
}

fn input(env: &Env, proof: ProofMode, key: Option<BytesN<32>>, max_claims: u32) -> EventInput {
    EventInput {
        name: s(env, "Taller de barbería"),
        description: s(env, "Demo"),
        location: s(env, "San José"),
        image_url: s(env, ""),
        starts_at: NOW - HOUR,
        ends_at: NOW + HOUR,
        max_claims,
        mode: AttendMode::Presencial,
        proof,
        event_key: key,
    }
}

fn signing_key(seed: u8) -> SigningKey {
    SigningKey::from_bytes(&[seed; 32])
}

fn public_key(env: &Env, key: &SigningKey) -> BytesN<32> {
    BytesN::from_array(env, &key.verifying_key().to_bytes())
}

/// What the projector signs: `astros:` + event id + window (big endian).
fn sign_window(env: &Env, key: &SigningKey, event_id: u32, window: u64) -> BytesN<64> {
    let mut message = std::vec::Vec::from(&b"astros:"[..]);
    message.extend_from_slice(&event_id.to_be_bytes());
    message.extend_from_slice(&window.to_be_bytes());
    BytesN::from_array(env, &key.sign(&message).to_bytes())
}

fn try_space(
    env: &Env,
    client: &AttendanceClient,
    owner: &Address,
    slug: &str,
    accent: u32,
) -> Result<u32, Error> {
    match client.try_create_space(
        owner,
        &s(env, slug),
        &s(env, "x"),
        &s(env, ""),
        &Category::Otro,
        &s(env, ""),
        &accent,
    ) {
        Ok(Ok(id)) => Ok(id),
        Err(Ok(e)) => Err(e),
        other => panic!("unexpected result: {other:?}"),
    }
}

#[test]
fn creates_and_edits_spaces() {
    let (env, client, _) = setup_with_admin();
    let owner = Address::generate(&env);
    let stranger = Address::generate(&env);

    let id = space(&env, &client, &owner, "barberia-central");
    assert_eq!(env.auths()[0].0, owner);
    let created = client.get_space(&id);
    assert_eq!(created.owner, owner);
    assert!(!created.verified && !created.hidden);
    assert_eq!(client.space_by_slug(&s(&env, "barberia-central")).id, id);
    assert_eq!(client.spaces_of(&owner).len(), 1);

    for bad in ["ab", "Mayus", "con espacio", "-guion", "guion-", "ñandu"] {
        assert_eq!(
            try_space(&env, &client, &owner, bad, 0),
            Err(Error::InvalidSlug),
            "{bad}"
        );
    }
    assert_eq!(
        try_space(&env, &client, &stranger, "barberia-central", 0),
        Err(Error::SlugTaken)
    );
    assert_eq!(
        try_space(&env, &client, &owner, "otro", ACCENT_COUNT),
        Err(Error::InvalidAccent)
    );

    assert_eq!(
        client.try_update_space(
            &stranger,
            &id,
            &s(&env, "Robada"),
            &s(&env, ""),
            &Category::Otro,
            &s(&env, ""),
            &0
        ),
        Err(Ok(Error::NotSpaceMember))
    );
    client.update_space(
        &owner,
        &id,
        &s(&env, "Barbería Norte"),
        &s(&env, ""),
        &Category::Belleza,
        &s(&env, ""),
        &2,
    );
    assert_eq!(client.get_space(&id).name, s(&env, "Barbería Norte"));
    assert_eq!(client.get_space(&id).accent, 2);
}

#[test]
fn staff_can_create_events_for_the_space() {
    let (env, client, _) = setup_with_admin();
    let owner = Address::generate(&env);
    let staff = Address::generate(&env);
    let stranger = Address::generate(&env);
    let sid = space(&env, &client, &owner, "uni");

    assert_eq!(
        client.try_create_event_v2(
            &stranger,
            &sid,
            &input(&env, ProofMode::CheckInStaff, None, 0)
        ),
        Err(Ok(Error::NotSpaceMember))
    );
    client.add_staff(&owner, &sid, &staff);
    assert!(client.is_space_member(&sid, &staff));
    assert_eq!(client.staff_spaces(&staff).len(), 1);

    let eid = client.create_event_v2(&staff, &sid, &input(&env, ProofMode::CheckInStaff, None, 0));
    let meta = client.get_event_v2(&eid).meta.get(0).unwrap();
    assert_eq!(meta.space_id, sid);
    assert_eq!(meta.category, Category::Belleza);
    assert_eq!(meta.billing, BillingKind::Free);
    assert_eq!(client.space_events(&sid, &10).len(), 1);

    client.remove_staff(&owner, &sid, &staff);
    assert!(!client.is_space_member(&sid, &staff));
    assert_eq!(client.staff_spaces(&staff).len(), 0);
}

#[test]
fn v1_claim_is_refused_for_events_with_proof() {
    let (env, client, _) = setup_with_admin();
    let owner = Address::generate(&env);
    let sid = space(&env, &client, &owner, "uni");
    let eid = client.create_event_v2(&owner, &sid, &input(&env, ProofMode::CheckInStaff, None, 0));
    assert_eq!(
        client.try_claim(&Address::generate(&env), &eid),
        Err(Ok(Error::ProofRequired))
    );
    // v1 events have no proof method.
    let v1 = create(&env, &client, &owner, 0);
    assert_eq!(
        client.try_attest(&owner, &v1, &Address::generate(&env)),
        Err(Ok(Error::WrongProofMode))
    );
    assert_eq!(client.get_event_v2(&v1).meta.len(), 0);
}

#[test]
fn rotating_qr_accepts_only_fresh_signed_codes() {
    let (env, client, _) = setup_with_admin();
    let owner = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let key = signing_key(7);
    let sid = space(&env, &client, &owner, "conf");
    let eid = client.create_event_v2(
        &owner,
        &sid,
        &input(&env, ProofMode::QrRotativo, Some(public_key(&env, &key)), 0),
    );

    let now_window = NOW / PROOF_WINDOW_SECS;
    let sig = sign_window(&env, &key, eid, now_window);
    assert_eq!(client.claim_v2(&alice, &eid, &now_window, &sig), 1);
    let attestation = client.get_attestation(&eid, &alice).unwrap();
    assert_eq!(attestation.method, ProofMode::QrRotativo);
    assert_eq!(attestation.attested_by, owner);

    // A code older than 2 minutes is refused.
    let old = now_window - PROOF_MAX_AGE_WINDOWS - 1;
    let old_sig = sign_window(&env, &key, eid, old);
    assert_eq!(
        client.try_claim_v2(&bob, &eid, &old, &old_sig),
        Err(Ok(Error::ExpiredProof))
    );
    // A signature from another key fails verification.
    let fake = sign_window(&env, &signing_key(9), eid, now_window);
    assert!(client.try_claim_v2(&bob, &eid, &now_window, &fake).is_err());
    // A code signed for one window can't be used for another.
    assert!(
        client
            .try_claim_v2(&bob, &eid, &(now_window - 1), &sig)
            .is_err()
    );
    assert_eq!(client.get_badge(&eid, &bob), None);

    // Rotating the key makes codes of the old one useless.
    let new_key = signing_key(3);
    client.rotate_event_key(&owner, &eid, &public_key(&env, &new_key));
    assert!(client.try_claim_v2(&bob, &eid, &now_window, &sig).is_err());
    let new_sig = sign_window(&env, &new_key, eid, now_window);
    assert_eq!(client.claim_v2(&bob, &eid, &now_window, &new_sig), 2);
}

#[test]
fn staff_check_in_vouches_for_attendees() {
    let (env, client, _) = setup_with_admin();
    let owner = Address::generate(&env);
    let staff = Address::generate(&env);
    let alice = Address::generate(&env);
    let sid = space(&env, &client, &owner, "uni");
    client.add_staff(&owner, &sid, &staff);
    let eid = client.create_event_v2(&owner, &sid, &input(&env, ProofMode::CheckInStaff, None, 0));

    assert_eq!(
        client.try_attest(&Address::generate(&env), &eid, &alice),
        Err(Ok(Error::NotSpaceMember))
    );
    assert_eq!(client.attest(&staff, &eid, &alice), 1);
    assert_eq!(env.auths()[0].0, staff);
    assert_eq!(
        client.get_attestation(&eid, &alice).unwrap().attested_by,
        staff
    );
    assert_eq!(
        client.try_attest(&staff, &eid, &alice),
        Err(Ok(Error::AlreadyClaimed))
    );

    env.ledger()
        .set_timestamp(NOW + HOUR + CHECKIN_GRACE_SECS + 1);
    assert_eq!(
        client.try_attest(&staff, &eid, &Address::generate(&env)),
        Err(Ok(Error::AttestWindowClosed))
    );
}

#[test]
fn virtual_events_are_approved_by_the_organizer() {
    let (env, client, _) = setup_with_admin();
    let owner = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let sid = space(&env, &client, &owner, "online");
    let eid = client.create_event_v2(&owner, &sid, &input(&env, ProofMode::Aprobacion, None, 0));

    client.request_attendance(&alice, &eid);
    client.request_attendance(&alice, &eid); // idempotent
    assert_eq!(client.pending_requests(&eid).len(), 1);

    let mut both = SVec::new(&env);
    both.push_back(alice.clone());
    both.push_back(bob.clone());
    assert_eq!(
        client.try_approve_attendance(&owner, &eid, &both),
        Err(Ok(Error::NotRequested))
    );

    let mut only_alice = SVec::new(&env);
    only_alice.push_back(alice.clone());
    assert_eq!(
        client.try_approve_attendance(&bob, &eid, &only_alice),
        Err(Ok(Error::NotSpaceMember))
    );
    // Approving after the event ends is fine (reviewing the Zoom list).
    env.ledger().set_timestamp(NOW + 2 * HOUR);
    assert_eq!(client.approve_attendance(&owner, &eid, &only_alice), 1);
    assert_eq!(client.pending_requests(&eid).len(), 0);
    assert_eq!(
        client.get_attestation(&eid, &alice).unwrap().method,
        ProofMode::Aprobacion
    );
    // Approving the same person again issues nothing.
    assert_eq!(client.approve_attendance(&owner, &eid, &only_alice), 0);
    assert_eq!(
        client.try_request_attendance(&bob, &eid),
        Err(Ok(Error::EventEnded))
    );
}

#[test]
fn certificate_name_hash_needs_the_badge() {
    let (env, client, _) = setup_with_admin();
    let owner = Address::generate(&env);
    let alice = Address::generate(&env);
    let sid = space(&env, &client, &owner, "uni");
    let eid = client.create_event_v2(&owner, &sid, &input(&env, ProofMode::CheckInStaff, None, 0));
    let hash = BytesN::from_array(&env, &[1u8; 32]);

    assert_eq!(
        client.try_set_name_hash(&alice, &eid, &hash),
        Err(Ok(Error::NoBadge))
    );
    client.attest(&owner, &eid, &alice);
    client.set_name_hash(&alice, &eid, &hash);
    assert_eq!(client.get_name_hash(&eid, &alice), Some(hash));
}

#[test]
fn public_listing_shows_only_verified_visible_spaces() {
    let (env, client, admin) = setup_with_admin();
    let owner = Address::generate(&env);
    let moderator = Address::generate(&env);
    let sid = space(&env, &client, &owner, "uni");
    let eid = client.create_event_v2(&owner, &sid, &input(&env, ProofMode::CheckInStaff, None, 0));
    create(&env, &client, &owner, 0); // v1 events are never public

    assert_eq!(client.latest_public_events(&10).len(), 0);
    assert_eq!(client.latest_spaces(&10, &true).len(), 0);
    assert_eq!(
        client.try_set_space_verified(&moderator, &sid, &true),
        Err(Ok(Error::NotModerator))
    );

    client.add_moderator(&moderator);
    assert_eq!(env.auths()[0].0, admin);
    assert!(client.is_moderator(&moderator));
    assert!(client.is_moderator(&admin));
    client.set_space_verified(&moderator, &sid, &true);
    assert_eq!(client.latest_spaces(&10, &true).len(), 1);
    assert_eq!(client.latest_public_events(&10).len(), 1);

    client.set_event_hidden(&moderator, &eid, &true);
    assert_eq!(client.latest_public_events(&10).len(), 0);
    assert!(client.get_event_v2(&eid).hidden);
    client.set_event_hidden(&moderator, &eid, &false);
    client.set_space_hidden(&moderator, &sid, &true);
    assert_eq!(client.latest_public_events(&10).len(), 0);
    assert_eq!(client.latest_spaces(&10, &false).len(), 0);
    assert_eq!(client.all_spaces(&10).len(), 1);

    client.remove_moderator(&moderator);
    assert!(!client.is_moderator(&moderator));
}

#[test]
fn reports_are_counted_once_per_account() {
    let (env, client, _) = setup_with_admin();
    let owner = Address::generate(&env);
    let alice = Address::generate(&env);
    let sid = space(&env, &client, &owner, "uni");
    let eid = client.create_event_v2(&owner, &sid, &input(&env, ProofMode::CheckInStaff, None, 0));

    assert_eq!(client.report_event(&alice, &eid, &1), 1);
    assert_eq!(
        client.try_report_event(&alice, &eid, &1),
        Err(Ok(Error::AlreadyReported))
    );
    assert_eq!(client.report_event(&Address::generate(&env), &eid, &0), 2);
    let queue = client.reported_events();
    assert_eq!(queue.len(), 1);
    assert_eq!(queue.get(0).unwrap().count, 2);
    assert_eq!(client.get_event_v2(&eid).reports, 2);
    assert_eq!(
        client.try_report_event(&alice, &99, &0),
        Err(Ok(Error::EventNotFound))
    );
}

#[test]
fn billing_free_quota_then_single_payment_or_plan() {
    let (env, client, admin) = setup_with_admin();
    let owner = Address::generate(&env);
    let treasury = Address::generate(&env);
    let sid = space(&env, &client, &owner, "barberia");

    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let xlm = TokenClient::new(&env, &sac.address());
    StellarAssetClient::new(&env, &sac.address()).mint(&owner, &(200 * XLM));

    // Without prices everything is free and uncapped.
    assert!(!client.space_billing(&sid).pricing_set);
    assert_eq!(
        client.try_subscribe(&owner, &sid, &1),
        Err(Ok(Error::PricingNotSet))
    );

    let mut pricing = Pricing {
        token: sac.address(),
        treasury: treasury.clone(),
        free_events_per_month: 2,
        free_claims_per_event: 50,
        monthly_price: 0,
        single_event_price: 10 * XLM,
    };
    assert_eq!(
        client.try_set_pricing(&pricing),
        Err(Ok(Error::InvalidPricing))
    );
    pricing.monthly_price = 50 * XLM;
    client.set_pricing(&pricing);
    assert_eq!(env.auths()[0].0, admin);

    // Two free events, capped at 50 attendees.
    let first =
        client.create_event_v2(&owner, &sid, &input(&env, ProofMode::CheckInStaff, None, 0));
    assert_eq!(client.get_event(&first).max_claims, 50);
    client.create_event_v2(
        &owner,
        &sid,
        &input(&env, ProofMode::CheckInStaff, None, 20),
    );
    let status = client.space_billing(&sid);
    assert_eq!(status.events_this_month, 2);
    assert_eq!(status.next_event, BillingKind::Single);
    assert_eq!(status.next_event_cost, 10 * XLM);

    // The third one is paid once, in the same signature, and isn't capped.
    let third =
        client.create_event_v2(&owner, &sid, &input(&env, ProofMode::CheckInStaff, None, 0));
    assert_eq!(xlm.balance(&treasury), 10 * XLM);
    assert_eq!(client.get_event(&third).max_claims, 0);
    assert_eq!(
        client.get_event_v2(&third).meta.get(0).unwrap().billing,
        BillingKind::Single
    );

    // The monthly plan covers the rest.
    assert_eq!(
        client.try_subscribe(&owner, &sid, &13),
        Err(Ok(Error::InvalidMonths))
    );
    let until = client.subscribe(&owner, &sid, &2);
    assert_eq!(until, NOW + 2 * BILLING_MONTH_SECS);
    assert_eq!(xlm.balance(&treasury), 110 * XLM);
    let planned =
        client.create_event_v2(&owner, &sid, &input(&env, ProofMode::CheckInStaff, None, 0));
    assert_eq!(
        client.get_event_v2(&planned).meta.get(0).unwrap().billing,
        BillingKind::Plan
    );
    assert_eq!(xlm.balance(&treasury), 110 * XLM);
    assert!(client.space_billing(&sid).plan_active);

    // A new month resets the free quota once the plan is over.
    env.ledger().set_timestamp(NOW + 3 * BILLING_MONTH_SECS);
    let status = client.space_billing(&sid);
    assert!(!status.plan_active);
    assert_eq!(status.events_this_month, 0);
    assert_eq!(status.next_event, BillingKind::Free);
}

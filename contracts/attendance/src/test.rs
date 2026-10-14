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

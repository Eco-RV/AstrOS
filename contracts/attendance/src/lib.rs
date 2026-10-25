#![no_std]
//! # Attendance (POAP-style badges)
//!
//! Proof-of-attendance badges on Stellar:
//!
//! - Anyone can create an event and becomes its organizer.
//! - While the event is open (between `starts_at` and `ends_at`, not closed by
//!   the organizer and below `max_claims`), anyone can claim its badge once.
//! - Badges are personal (soulbound): there is no transfer function, so a
//!   badge always stays with the account that claimed it.
//!
//! Honest limits: claiming is open during the event window, so it proves "this
//! account claimed during the event", not physical presence. One account is not
//! one person.
//!
//! ## 2.1.0: AstrOS as a SaaS
//!
//! Added on top, without touching the stored `Event` and `Badge` types:
//!
//! - **Spaces**: each business (barbershop, university, community…) gets its
//!   own space with a category and an accent color. Events v2 belong to one.
//! - **Roles**: the admin adds moderators; space owners add staff.
//! - **Attendance proof** (events v2): a rotating QR signed by an event key, a
//!   check-in by staff, or an approval list for virtual events. Each badge
//!   records who vouched for it ([`Attestation`]). The open `claim` is refused
//!   for these events.
//! - **Moderation**: reports, hidden events/spaces and verified spaces. Only
//!   events of verified spaces appear in the public listing.
//! - **Billing**: a free monthly quota per space, then a monthly plan or a
//!   one-off payment per event, in the token set by the admin (XLM on testnet).
//!
//! No personal data goes on-chain: a certificate name is stored only as a
//! salted hash chosen by the attendee.
use soroban_sdk::{
    Address, Bytes, BytesN, Env, IntoVal, String, Val, Vec, contract, contracterror, contractevent,
    contractimpl, contracttype, token,
};

/// Max length (bytes, UTF-8) of each text field.
pub const MAX_NAME_LEN: u32 = 60;
pub const MAX_DESCRIPTION_LEN: u32 = 280;
pub const MAX_LOCATION_LEN: u32 = 100;
pub const MAX_IMAGE_URL_LEN: u32 = 200;
/// Max badges an account can hold (keeps its storage entry small).
pub const MAX_BADGES_PER_OWNER: u32 = 100;
/// Max events returned by `latest_events`.
pub const MAX_PAGE: u32 = 50;

/// Space link (`/s/<slug>`): 3 to 32 chars, lowercase letters, digits, dashes.
pub const MIN_SLUG_LEN: u32 = 3;
pub const MAX_SLUG_LEN: u32 = 32;
/// Spaces one account can own, and spaces it can be staff of.
pub const MAX_SPACES_PER_OWNER: u32 = 10;
pub const MAX_STAFF_SPACES: u32 = 20;
/// Accent colors a space can pick (index into the app's curated list).
pub const ACCENT_COUNT: u32 = 6;
/// Pending attendance requests kept per event, and addresses per approval.
pub const MAX_REQUESTS_PER_EVENT: u32 = 300;
pub const MAX_APPROVE_BATCH: u32 = 50;
/// Reported events kept in the moderation queue.
pub const MAX_REPORT_QUEUE: u32 = 100;
/// Max entries a listing walks through (keeps reads bounded).
pub const MAX_SCAN: u32 = 200;
/// Rotating QR: a new code every 30 s, accepted for 2 minutes.
pub const PROOF_WINDOW_SECS: u64 = 30;
pub const PROOF_MAX_AGE_WINDOWS: u64 = 4;
/// Staff can check people in from 1 h before the start to 1 h after the end.
pub const CHECKIN_GRACE_SECS: u64 = 3_600;
/// Virtual events can be approved up to 7 days after they end.
pub const APPROVAL_GRACE_SECS: u64 = 7 * 86_400;
/// A billing month, and the longest subscription bought at once.
pub const BILLING_MONTH_SECS: u64 = 30 * 86_400;
pub const MAX_SUBSCRIBE_MONTHS: u32 = 12;

// Persistent entries live ~30 days (in ledgers, ~5s each) after each write.
const DAY_IN_LEDGERS: u32 = 17_280;
const TTL_EXTEND_TO: u32 = 30 * DAY_IN_LEDGERS;
const TTL_THRESHOLD: u32 = TTL_EXTEND_TO - DAY_IN_LEDGERS;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Ese evento no existe.
    EventNotFound = 1,
    /// El nombre debe tener entre 1 y 60 caracteres.
    InvalidName = 2,
    /// Alguno de los textos es demasiado largo.
    TextTooLong = 3,
    /// La fecha de fin debe ser posterior al inicio y estar en el futuro.
    InvalidDates = 4,
    /// Solo el organizador del evento puede hacer esto.
    NotOrganizer = 5,
    /// El evento todavía no empieza: podrás reclamar la insignia cuando comience.
    NotStarted = 6,
    /// El evento ya terminó o fue cerrado.
    EventEnded = 7,
    /// Ya no quedan insignias para este evento.
    SoldOut = 8,
    /// Ya tienes la insignia de este evento.
    AlreadyClaimed = 9,
    /// Alcanzaste el máximo de insignias por cuenta.
    TooManyBadges = 10,
    /// Ese espacio no existe.
    SpaceNotFound = 11,
    /// Solo el dueño o el staff del espacio puede hacer esto.
    NotSpaceMember = 12,
    /// Ese enlace ya lo usa otro espacio. Elige otro.
    SlugTaken = 13,
    /// El enlace debe tener de 3 a 32 caracteres: minúsculas, números o guiones.
    InvalidSlug = 14,
    /// Este evento pide una prueba de asistencia: escanea el QR del evento o pide tu insignia al organizador.
    ProofRequired = 15,
    /// El código QR ya venció. Escanea el QR que se proyecta ahora.
    ExpiredProof = 16,
    /// Este evento no usa ese método de verificación.
    WrongProofMode = 17,
    /// Esta persona no pidió su insignia para este evento.
    NotRequested = 18,
    /// Ya reportaste este evento.
    AlreadyReported = 19,
    /// Solo un administrador o moderador puede hacer esto.
    NotModerator = 20,
    /// Los precios deben ser mayores que cero.
    InvalidPricing = 21,
    /// Elige entre 1 y 12 meses.
    InvalidMonths = 22,
    /// Alcanzaste el máximo de espacios por cuenta.
    TooManySpaces = 23,
    /// La lista de solicitudes de este evento está llena.
    TooManyRequests = 24,
    /// Ese color no está disponible.
    InvalidAccent = 25,
    /// Este evento no tiene llave de QR. Ábrelo en el proyector para crear una.
    NoEventKey = 26,
    /// Ya no se puede dar fe de la asistencia a este evento.
    AttestWindowClosed = 27,
    /// Todavía no tienes la insignia de este evento.
    NoBadge = 28,
    /// Los cobros todavía no están configurados.
    PricingNotSet = 29,
    /// Puedes aprobar hasta 50 personas a la vez.
    BatchTooLarge = 30,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Event {
    pub id: u32,
    pub organizer: Address,
    pub name: String,
    pub description: String,
    pub location: String,
    /// Image hosted off-chain (only the URL is stored).
    pub image_url: String,
    /// Unix seconds.
    pub starts_at: u64,
    /// Unix seconds.
    pub ends_at: u64,
    /// 0 = unlimited.
    pub max_claims: u32,
    pub claimed: u32,
    pub closed: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Badge {
    pub event_id: u32,
    pub event_name: String,
    pub owner: Address,
    /// 1 = first attendee to claim, 2 = second…
    pub number: u32,
    /// Ledger timestamp (unix seconds) when it was claimed.
    pub claimed_at: u64,
}

/// Kind of business a space belongs to.
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Category {
    Universidad = 0,
    Empresa = 1,
    Comunidad = 2,
    Belleza = 3,
    Bienestar = 4,
    Conferencia = 5,
    Otro = 6,
}

/// Where the event happens.
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum AttendMode {
    Presencial = 0,
    Virtual = 1,
    Hibrido = 2,
}

/// How attendance is proven for an event v2.
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ProofMode {
    /// The projector shows a QR signed by the event key that changes every 30 s.
    QrRotativo = 0,
    /// Staff scan the attendee's personal QR and sign for them.
    CheckInStaff = 1,
    /// Attendees ask for it; the organizer approves the list (virtual events).
    Aprobacion = 2,
}

/// How an event v2 was paid for.
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum BillingKind {
    /// Free monthly quota (attendees capped at `free_claims_per_event`).
    Free = 0,
    /// Covered by the space's monthly plan.
    Plan = 1,
    /// Paid once for this event.
    Single = 2,
}

/// A business inside AstrOS (only public business data).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Space {
    pub id: u32,
    pub owner: Address,
    /// Unique link: `/s/<slug>`. Can't be changed.
    pub slug: String,
    pub name: String,
    pub description: String,
    pub category: Category,
    pub logo_url: String,
    /// Index into the app's curated accent colors (0..ACCENT_COUNT).
    pub accent: u32,
    /// Approved by a moderator: its events appear in the public listing.
    pub verified: bool,
    /// Hidden by a moderator.
    pub hidden: bool,
    pub created_at: u64,
}

/// Extra data of an event v2 (events created with `create_event` have none).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventMeta {
    pub space_id: u32,
    pub category: Category,
    pub mode: AttendMode,
    pub proof: ProofMode,
    /// Ed25519 public key that signs the rotating QR (QrRotativo only).
    pub event_key: Option<BytesN<32>>,
    pub billing: BillingKind,
}

/// Fields to create an event v2.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventInput {
    pub name: String,
    pub description: String,
    pub location: String,
    pub image_url: String,
    pub starts_at: u64,
    pub ends_at: u64,
    /// 0 = unlimited (capped on the free quota).
    pub max_claims: u32,
    pub mode: AttendMode,
    pub proof: ProofMode,
    pub event_key: Option<BytesN<32>>,
}

/// An event as the app shows it. `meta` has one entry for events v2 and is
/// empty for v1 events (an `Option` of a struct can't be a field).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventView {
    pub event: Event,
    pub meta: Vec<EventMeta>,
    pub hidden: bool,
    pub reports: u32,
}

/// Who vouched for a badge of an event v2, and how.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Attestation {
    pub event_id: u32,
    pub attendee: Address,
    pub method: ProofMode,
    /// The organizer (QR, approval) or the staff member who checked them in.
    pub attested_by: Address,
    pub at: u64,
}

/// Prices set by the admin. Amounts in the token's units (7 decimals).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Pricing {
    pub token: Address,
    pub treasury: Address,
    pub free_events_per_month: u32,
    /// 0 = no cap.
    pub free_claims_per_event: u32,
    pub monthly_price: i128,
    pub single_event_price: i128,
}

/// A space's plan and what its next event would cost.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BillingStatus {
    pub pricing_set: bool,
    pub paid_until: u64,
    pub plan_active: bool,
    pub events_this_month: u32,
    pub free_events_per_month: u32,
    pub free_claims_per_event: u32,
    pub monthly_price: i128,
    pub single_event_price: i128,
    pub next_event: BillingKind,
    pub next_event_cost: i128,
}

/// An entry of the moderation queue.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReportInfo {
    pub event_id: u32,
    pub count: u32,
    pub hidden: bool,
}

#[contracttype]
enum DataKey {
    Admin,
    /// Number of events created (next id).
    EventCount,
    /// id -> Event
    Event(u32),
    /// (event id, attendee) -> Badge
    Badge(u32, Address),
    /// owner -> Vec<Badge>
    BadgesOf(Address),
    // ── 2.1.0 (new keys only) ──
    /// address -> true
    Moderator(Address),
    /// Number of spaces (next id).
    SpaceCount,
    /// id -> Space
    Space(u32),
    /// slug -> space id
    SpaceBySlug(String),
    /// owner -> Vec<space id>
    SpacesOf(Address),
    /// staff member -> Vec<space id>
    StaffOf(Address),
    /// (space id, address) -> true
    SpaceStaff(u32, Address),
    /// space id -> number of events v2
    SpaceEventCount(u32),
    /// (space id, index) -> event id
    SpaceEventAt(u32, u32),
    /// event id -> EventMeta
    EventMeta(u32),
    /// event id -> true
    EventHidden(u32),
    /// event id -> number of reports
    ReportCount(u32),
    /// (event id, reporter) -> true
    Reported(u32, Address),
    /// Vec<event id> with reports, oldest first
    ReportQueue,
    /// (event id, attendee) -> Attestation
    Attestation(u32, Address),
    /// (event id, attendee) -> salted hash of the certificate name
    NameHash(u32, Address),
    /// event id -> Vec<attendee> who asked for their badge
    AttendRequests(u32),
    /// (event id, attendee) -> true
    Requested(u32, Address),
    /// Pricing (instance)
    Pricing,
    /// space id -> paid until (unix seconds)
    SpacePlan(u32),
    /// (space id, billing month) -> events created
    SpaceUsage(u32, u32),
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventCreated {
    #[topic]
    pub organizer: Address,
    pub id: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BadgeClaimed {
    #[topic]
    pub event_id: u32,
    #[topic]
    pub attendee: Address,
    pub number: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventClosed {
    #[topic]
    pub event_id: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SpaceCreated {
    #[topic]
    pub owner: Address,
    pub id: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AttendanceRequested {
    #[topic]
    pub event_id: u32,
    #[topic]
    pub attendee: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventReported {
    #[topic]
    pub event_id: u32,
    pub reason: u32,
    pub count: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Subscribed {
    #[topic]
    pub space_id: u32,
    pub paid_until: u64,
}

#[contract]
pub struct Attendance;

#[contractimpl]
impl Attendance {
    /// `admin` upgrades the contract code, sets prices and adds moderators.
    /// It has no power over events or badges.
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Create an event. The signer (`organizer`) becomes its organizer.
    #[allow(clippy::too_many_arguments)]
    pub fn create_event(
        env: Env,
        organizer: Address,
        name: String,
        description: String,
        location: String,
        image_url: String,
        starts_at: u64,
        ends_at: u64,
        max_claims: u32,
    ) -> Result<u32, Error> {
        organizer.require_auth();
        validate_event(
            &env,
            &name,
            &description,
            &location,
            &image_url,
            starts_at,
            ends_at,
        )?;
        let id = new_event(
            &env,
            &organizer,
            name,
            description,
            location,
            image_url,
            starts_at,
            ends_at,
            max_claims,
        );
        Ok(id)
    }

    /// Claim the badge for `event_id`. Must be signed by `attendee`.
    /// Returns the badge number (1 = first to claim). Events v2 need a proof
    /// instead (`claim_v2`, `attest`, `request_attendance`).
    pub fn claim(env: Env, attendee: Address, event_id: u32) -> Result<u32, Error> {
        attendee.require_auth();
        if env
            .storage()
            .persistent()
            .has(&DataKey::EventMeta(event_id))
        {
            return Err(Error::ProofRequired);
        }
        let mut event = load_event(&env, event_id)?;
        check_open(&env, &event)?;
        issue_badge(&env, &mut event, &attendee)
    }

    /// Close the event early (no more badges can be claimed). Organizer only.
    pub fn close_event(env: Env, organizer: Address, event_id: u32) -> Result<(), Error> {
        organizer.require_auth();
        let mut event = load_event(&env, event_id)?;
        if event.organizer != organizer {
            return Err(Error::NotOrganizer);
        }
        event.closed = true;
        save_event(&env, &event);
        EventClosed { event_id }.publish(&env);
        Ok(())
    }

    pub fn get_event(env: Env, event_id: u32) -> Result<Event, Error> {
        load_event(&env, event_id)
    }

    /// How many events have been created (ids go from 0 to count - 1).
    pub fn event_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::EventCount)
            .unwrap_or(0)
    }

    /// The latest events, newest first (at most `MAX_PAGE`).
    pub fn latest_events(env: Env, limit: u32) -> Vec<Event> {
        let count = Self::event_count(env.clone());
        let take = limit.min(MAX_PAGE).min(count);
        let mut out = Vec::new(&env);
        for i in 0..take {
            if let Some(event) = env
                .storage()
                .persistent()
                .get::<_, Event>(&DataKey::Event(count - 1 - i))
            {
                out.push_back(event);
            }
        }
        out
    }

    /// The badge `attendee` claimed for `event_id`, if any.
    pub fn get_badge(env: Env, event_id: u32, attendee: Address) -> Option<Badge> {
        env.storage()
            .persistent()
            .get(&DataKey::Badge(event_id, attendee))
    }

    /// All badges of `owner` (oldest first).
    pub fn badges_of(env: Env, owner: Address) -> Vec<Badge> {
        env.storage()
            .persistent()
            .get(&DataKey::BadgesOf(owner))
            .unwrap_or(Vec::new(&env))
    }

    /// Replace the contract code keeping its data (used by Scaffold on every save).
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }
}

// ── 2.1.0: roles, spaces, events v2, proof, moderation, billing ─────────────

#[contractimpl]
impl Attendance {
    // ── Roles ──

    /// The admin address (upgrades, prices, moderators).
    pub fn admin(env: Env) -> Address {
        admin_of(&env)
    }

    /// Give `moderator` moderation powers. Admin only.
    pub fn add_moderator(env: Env, moderator: Address) {
        admin_of(&env).require_auth();
        put(&env, &DataKey::Moderator(moderator), &true);
    }

    /// Remove moderation powers. Admin only.
    pub fn remove_moderator(env: Env, moderator: Address) {
        admin_of(&env).require_auth();
        env.storage()
            .persistent()
            .remove(&DataKey::Moderator(moderator));
    }

    /// True for the admin and for moderators.
    pub fn is_moderator(env: Env, address: Address) -> bool {
        is_moderator(&env, &address)
    }

    // ── Spaces ──

    /// Create a space for a business. The signer (`owner`) owns it.
    #[allow(clippy::too_many_arguments)]
    pub fn create_space(
        env: Env,
        owner: Address,
        slug: String,
        name: String,
        description: String,
        category: Category,
        logo_url: String,
        accent: u32,
    ) -> Result<u32, Error> {
        owner.require_auth();
        if !valid_slug(&slug) {
            return Err(Error::InvalidSlug);
        }
        validate_space(&name, &description, &logo_url, accent)?;
        let storage = env.storage().persistent();
        if storage.has(&DataKey::SpaceBySlug(slug.clone())) {
            return Err(Error::SlugTaken);
        }
        let mut owned: Vec<u32> = storage
            .get(&DataKey::SpacesOf(owner.clone()))
            .unwrap_or(Vec::new(&env));
        if owned.len() >= MAX_SPACES_PER_OWNER {
            return Err(Error::TooManySpaces);
        }

        let instance = env.storage().instance();
        let id: u32 = instance.get(&DataKey::SpaceCount).unwrap_or(0);
        instance.set(&DataKey::SpaceCount, &(id + 1));
        instance.extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);

        let space = Space {
            id,
            owner: owner.clone(),
            slug: slug.clone(),
            name,
            description,
            category,
            logo_url,
            accent,
            verified: false,
            hidden: false,
            created_at: env.ledger().timestamp(),
        };
        put(&env, &DataKey::Space(id), &space);
        put(&env, &DataKey::SpaceBySlug(slug), &id);
        owned.push_back(id);
        put(&env, &DataKey::SpacesOf(owner.clone()), &owned);

        SpaceCreated { owner, id }.publish(&env);
        Ok(id)
    }

    /// Edit a space (the link can't change). Owner only.
    #[allow(clippy::too_many_arguments)]
    pub fn update_space(
        env: Env,
        owner: Address,
        space_id: u32,
        name: String,
        description: String,
        category: Category,
        logo_url: String,
        accent: u32,
    ) -> Result<(), Error> {
        owner.require_auth();
        let mut space = load_space(&env, space_id)?;
        if space.owner != owner {
            return Err(Error::NotSpaceMember);
        }
        validate_space(&name, &description, &logo_url, accent)?;
        space.name = name;
        space.description = description;
        space.category = category;
        space.logo_url = logo_url;
        space.accent = accent;
        put(&env, &DataKey::Space(space_id), &space);
        Ok(())
    }

    /// Let `staff` create events and check people in for the space. Owner only.
    pub fn add_staff(env: Env, owner: Address, space_id: u32, staff: Address) -> Result<(), Error> {
        owner.require_auth();
        let space = load_space(&env, space_id)?;
        if space.owner != owner {
            return Err(Error::NotSpaceMember);
        }
        let key = DataKey::SpaceStaff(space_id, staff.clone());
        if env.storage().persistent().has(&key) {
            return Ok(());
        }
        let list_key = DataKey::StaffOf(staff);
        let mut list: Vec<u32> = env
            .storage()
            .persistent()
            .get(&list_key)
            .unwrap_or(Vec::new(&env));
        if list.len() >= MAX_STAFF_SPACES {
            return Err(Error::TooManySpaces);
        }
        list.push_back(space_id);
        put(&env, &list_key, &list);
        put(&env, &key, &true);
        Ok(())
    }

    /// Remove a staff member. Owner only.
    pub fn remove_staff(
        env: Env,
        owner: Address,
        space_id: u32,
        staff: Address,
    ) -> Result<(), Error> {
        owner.require_auth();
        let space = load_space(&env, space_id)?;
        if space.owner != owner {
            return Err(Error::NotSpaceMember);
        }
        let storage = env.storage().persistent();
        storage.remove(&DataKey::SpaceStaff(space_id, staff.clone()));
        let list_key = DataKey::StaffOf(staff);
        let list: Vec<u32> = storage.get(&list_key).unwrap_or(Vec::new(&env));
        let mut kept = Vec::new(&env);
        for id in list.iter() {
            if id != space_id {
                kept.push_back(id);
            }
        }
        put(&env, &list_key, &kept);
        Ok(())
    }

    pub fn get_space(env: Env, space_id: u32) -> Result<Space, Error> {
        load_space(&env, space_id)
    }

    pub fn space_by_slug(env: Env, slug: String) -> Result<Space, Error> {
        let id: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::SpaceBySlug(slug))
            .ok_or(Error::SpaceNotFound)?;
        load_space(&env, id)
    }

    /// Spaces owned by `owner`.
    pub fn spaces_of(env: Env, owner: Address) -> Vec<Space> {
        spaces_from(&env, &DataKey::SpacesOf(owner))
    }

    /// Spaces where `staff` is staff (not owner).
    pub fn staff_spaces(env: Env, staff: Address) -> Vec<Space> {
        spaces_from(&env, &DataKey::StaffOf(staff))
    }

    /// True if `address` owns the space or is its staff.
    pub fn is_space_member(env: Env, space_id: u32, address: Address) -> bool {
        load_space(&env, space_id)
            .map(|space| is_member(&env, &space, &address))
            .unwrap_or(false)
    }

    /// Newest spaces first, skipping hidden ones (and unverified ones when
    /// `only_verified`).
    pub fn latest_spaces(env: Env, limit: u32, only_verified: bool) -> Vec<Space> {
        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::SpaceCount)
            .unwrap_or(0);
        let take = limit.min(MAX_PAGE);
        let mut out = Vec::new(&env);
        let mut i = 0;
        while i < count.min(MAX_SCAN) && out.len() < take {
            if let Ok(space) = load_space(&env, count - 1 - i)
                && !space.hidden
                && (space.verified || !only_verified)
            {
                out.push_back(space);
            }
            i += 1;
        }
        out
    }

    /// Spaces of every state, newest first (moderation panel).
    pub fn all_spaces(env: Env, limit: u32) -> Vec<Space> {
        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::SpaceCount)
            .unwrap_or(0);
        let take = limit.min(MAX_PAGE).min(count);
        let mut out = Vec::new(&env);
        for i in 0..take {
            if let Ok(space) = load_space(&env, count - 1 - i) {
                out.push_back(space);
            }
        }
        out
    }

    /// Events of a space, newest first.
    pub fn space_events(env: Env, space_id: u32, limit: u32) -> Vec<EventView> {
        let storage = env.storage().persistent();
        let count: u32 = storage
            .get(&DataKey::SpaceEventCount(space_id))
            .unwrap_or(0);
        let take = limit.min(MAX_PAGE).min(count);
        let mut out = Vec::new(&env);
        for i in 0..take {
            if let Some(event_id) =
                storage.get::<_, u32>(&DataKey::SpaceEventAt(space_id, count - 1 - i))
                && let Ok(view) = event_view(&env, event_id)
            {
                out.push_back(view);
            }
        }
        out
    }

    // ── Events v2 ──

    /// Create an event inside a space, with a proof method. The signer must
    /// own the space or be its staff. Applies billing: monthly plan, free
    /// quota (attendees capped) or a one-off payment in the same signature.
    pub fn create_event_v2(
        env: Env,
        organizer: Address,
        space_id: u32,
        input: EventInput,
    ) -> Result<u32, Error> {
        organizer.require_auth();
        let space = load_space(&env, space_id)?;
        if !is_member(&env, &space, &organizer) {
            return Err(Error::NotSpaceMember);
        }
        validate_event(
            &env,
            &input.name,
            &input.description,
            &input.location,
            &input.image_url,
            input.starts_at,
            input.ends_at,
        )?;

        // Billing.
        let now = env.ledger().timestamp();
        let month = (now / BILLING_MONTH_SECS) as u32;
        let usage_key = DataKey::SpaceUsage(space_id, month);
        let used: u32 = env.storage().persistent().get(&usage_key).unwrap_or(0);
        let mut max_claims = input.max_claims;
        let billing = match pricing_of(&env) {
            None => BillingKind::Free,
            Some(p) => {
                if plan_until(&env, space_id) > now {
                    BillingKind::Plan
                } else if used < p.free_events_per_month {
                    if p.free_claims_per_event > 0
                        && (max_claims == 0 || max_claims > p.free_claims_per_event)
                    {
                        max_claims = p.free_claims_per_event;
                    }
                    BillingKind::Free
                } else {
                    token::TokenClient::new(&env, &p.token).transfer(
                        &organizer,
                        &p.treasury,
                        &p.single_event_price,
                    );
                    BillingKind::Single
                }
            }
        };
        put(&env, &usage_key, &(used + 1));

        let id = new_event(
            &env,
            &organizer,
            input.name,
            input.description,
            input.location,
            input.image_url,
            input.starts_at,
            input.ends_at,
            max_claims,
        );
        let meta = EventMeta {
            space_id,
            category: space.category,
            mode: input.mode,
            proof: input.proof,
            event_key: input.event_key,
            billing,
        };
        put(&env, &DataKey::EventMeta(id), &meta);

        let storage = env.storage().persistent();
        let index: u32 = storage
            .get(&DataKey::SpaceEventCount(space_id))
            .unwrap_or(0);
        put(&env, &DataKey::SpaceEventAt(space_id, index), &id);
        put(&env, &DataKey::SpaceEventCount(space_id), &(index + 1));
        Ok(id)
    }

    /// An event with its v2 data and moderation state.
    pub fn get_event_v2(env: Env, event_id: u32) -> Result<EventView, Error> {
        event_view(&env, event_id)
    }

    /// Newest events of verified, visible spaces (the public listing).
    pub fn latest_public_events(env: Env, limit: u32) -> Vec<EventView> {
        let count = Self::event_count(env.clone());
        let take = limit.min(MAX_PAGE);
        let mut out = Vec::new(&env);
        let mut i = 0;
        while i < count.min(MAX_SCAN) && out.len() < take {
            if let Ok(view) = event_view(&env, count - 1 - i)
                && !view.hidden
                && let Some(meta) = view.meta.first()
                && let Ok(space) = load_space(&env, meta.space_id)
                && space.verified
                && !space.hidden
            {
                out.push_back(view);
            }
            i += 1;
        }
        out
    }

    /// Newest events of every kind and state (moderation panel).
    pub fn latest_event_views(env: Env, limit: u32) -> Vec<EventView> {
        let count = Self::event_count(env.clone());
        let take = limit.min(MAX_PAGE).min(count);
        let mut out = Vec::new(&env);
        for i in 0..take {
            if let Ok(view) = event_view(&env, count - 1 - i) {
                out.push_back(view);
            }
        }
        out
    }

    /// Replace the key that signs the rotating QR (e.g. projecting from another
    /// device). Organizer or space staff.
    pub fn rotate_event_key(
        env: Env,
        organizer: Address,
        event_id: u32,
        event_key: BytesN<32>,
    ) -> Result<(), Error> {
        organizer.require_auth();
        let event = load_event(&env, event_id)?;
        let mut meta = load_meta(&env, event_id)?;
        if meta.proof != ProofMode::QrRotativo {
            return Err(Error::WrongProofMode);
        }
        require_event_staff(&env, &event, &meta, &organizer)?;
        meta.event_key = Some(event_key);
        put(&env, &DataKey::EventMeta(event_id), &meta);
        Ok(())
    }

    // ── Attendance proof ──

    /// Claim with the rotating QR: `window` and `signature` come from the QR,
    /// signed by the event key over `astros:` + event id + window (big endian).
    /// Codes are accepted for `PROOF_MAX_AGE_WINDOWS` windows.
    pub fn claim_v2(
        env: Env,
        attendee: Address,
        event_id: u32,
        window: u64,
        signature: BytesN<64>,
    ) -> Result<u32, Error> {
        attendee.require_auth();
        let meta = load_meta(&env, event_id)?;
        if meta.proof != ProofMode::QrRotativo {
            return Err(Error::WrongProofMode);
        }
        let key = meta.event_key.clone().ok_or(Error::NoEventKey)?;
        let mut event = load_event(&env, event_id)?;
        check_open(&env, &event)?;

        let now_window = env.ledger().timestamp() / PROOF_WINDOW_SECS;
        if window > now_window + 1 || window + PROOF_MAX_AGE_WINDOWS < now_window {
            return Err(Error::ExpiredProof);
        }
        env.crypto()
            .ed25519_verify(&key, &proof_message(&env, event_id, window), &signature);

        let number = issue_badge(&env, &mut event, &attendee)?;
        let organizer = event.organizer.clone();
        save_attestation(&env, event_id, &attendee, ProofMode::QrRotativo, &organizer);
        Ok(number)
    }

    /// Staff vouch for an attendee in person (they scanned the attendee's QR).
    pub fn attest(
        env: Env,
        staff: Address,
        event_id: u32,
        attendee: Address,
    ) -> Result<u32, Error> {
        staff.require_auth();
        let meta = load_meta(&env, event_id)?;
        if meta.proof != ProofMode::CheckInStaff {
            return Err(Error::WrongProofMode);
        }
        let mut event = load_event(&env, event_id)?;
        require_event_staff(&env, &event, &meta, &staff)?;
        let now = env.ledger().timestamp();
        if event.closed
            || now > event.ends_at + CHECKIN_GRACE_SECS
            || now + CHECKIN_GRACE_SECS < event.starts_at
        {
            return Err(Error::AttestWindowClosed);
        }
        let number = issue_badge(&env, &mut event, &attendee)?;
        save_attestation(&env, event_id, &attendee, ProofMode::CheckInStaff, &staff);
        Ok(number)
    }

    /// Ask for the badge of a virtual event; the organizer approves it later.
    pub fn request_attendance(env: Env, attendee: Address, event_id: u32) -> Result<(), Error> {
        attendee.require_auth();
        let meta = load_meta(&env, event_id)?;
        if meta.proof != ProofMode::Aprobacion {
            return Err(Error::WrongProofMode);
        }
        let event = load_event(&env, event_id)?;
        check_open(&env, &event)?;
        let storage = env.storage().persistent();
        if storage.has(&DataKey::Badge(event_id, attendee.clone())) {
            return Err(Error::AlreadyClaimed);
        }
        let flag = DataKey::Requested(event_id, attendee.clone());
        if storage.has(&flag) {
            return Ok(());
        }
        let list_key = DataKey::AttendRequests(event_id);
        let mut list: Vec<Address> = storage.get(&list_key).unwrap_or(Vec::new(&env));
        if list.len() >= MAX_REQUESTS_PER_EVENT {
            return Err(Error::TooManyRequests);
        }
        list.push_back(attendee.clone());
        put(&env, &list_key, &list);
        put(&env, &flag, &true);
        AttendanceRequested { event_id, attendee }.publish(&env);
        Ok(())
    }

    /// Approve attendees who asked for their badge (up to 50 at once). Allowed
    /// until 7 days after the event ends. Returns how many badges were issued.
    pub fn approve_attendance(
        env: Env,
        organizer: Address,
        event_id: u32,
        attendees: Vec<Address>,
    ) -> Result<u32, Error> {
        organizer.require_auth();
        if attendees.len() > MAX_APPROVE_BATCH {
            return Err(Error::BatchTooLarge);
        }
        let meta = load_meta(&env, event_id)?;
        if meta.proof != ProofMode::Aprobacion {
            return Err(Error::WrongProofMode);
        }
        let mut event = load_event(&env, event_id)?;
        require_event_staff(&env, &event, &meta, &organizer)?;
        if env.ledger().timestamp() > event.ends_at + APPROVAL_GRACE_SECS {
            return Err(Error::AttestWindowClosed);
        }
        let mut issued = 0;
        for attendee in attendees.iter() {
            let storage = env.storage().persistent();
            if !storage.has(&DataKey::Requested(event_id, attendee.clone())) {
                return Err(Error::NotRequested);
            }
            if storage.has(&DataKey::Badge(event_id, attendee.clone())) {
                continue;
            }
            issue_badge(&env, &mut event, &attendee)?;
            save_attestation(&env, event_id, &attendee, ProofMode::Aprobacion, &organizer);
            issued += 1;
        }
        Ok(issued)
    }

    /// Attendees who asked for their badge and don't have it yet.
    pub fn pending_requests(env: Env, event_id: u32) -> Vec<Address> {
        let storage = env.storage().persistent();
        let list: Vec<Address> = storage
            .get(&DataKey::AttendRequests(event_id))
            .unwrap_or(Vec::new(&env));
        let mut out = Vec::new(&env);
        for attendee in list.iter() {
            if !storage.has(&DataKey::Badge(event_id, attendee.clone())) {
                out.push_back(attendee);
            }
        }
        out
    }

    /// Who vouched for `attendee`'s badge, and how (events v2).
    pub fn get_attestation(env: Env, event_id: u32, attendee: Address) -> Option<Attestation> {
        env.storage()
            .persistent()
            .get(&DataKey::Attestation(event_id, attendee))
    }

    /// Save the salted hash of the name printed on the certificate. Only the
    /// badge owner; the name itself never goes on-chain.
    pub fn set_name_hash(
        env: Env,
        attendee: Address,
        event_id: u32,
        name_hash: BytesN<32>,
    ) -> Result<(), Error> {
        attendee.require_auth();
        if !env
            .storage()
            .persistent()
            .has(&DataKey::Badge(event_id, attendee.clone()))
        {
            return Err(Error::NoBadge);
        }
        put(&env, &DataKey::NameHash(event_id, attendee), &name_hash);
        Ok(())
    }

    pub fn get_name_hash(env: Env, event_id: u32, attendee: Address) -> Option<BytesN<32>> {
        env.storage()
            .persistent()
            .get(&DataKey::NameHash(event_id, attendee))
    }

    // ── Moderation ──

    /// Report an event (once per account). `reason`: 0 offensive, 1 mockery or
    /// nonsense, 2 spam, 3 other.
    pub fn report_event(
        env: Env,
        reporter: Address,
        event_id: u32,
        reason: u32,
    ) -> Result<u32, Error> {
        reporter.require_auth();
        load_event(&env, event_id)?;
        let storage = env.storage().persistent();
        let flag = DataKey::Reported(event_id, reporter);
        if storage.has(&flag) {
            return Err(Error::AlreadyReported);
        }
        put(&env, &flag, &true);
        let count_key = DataKey::ReportCount(event_id);
        let count: u32 = storage.get(&count_key).unwrap_or(0) + 1;
        put(&env, &count_key, &count);
        if count == 1 {
            let mut queue: Vec<u32> = storage.get(&DataKey::ReportQueue).unwrap_or(Vec::new(&env));
            if queue.len() >= MAX_REPORT_QUEUE {
                queue.pop_front();
            }
            queue.push_back(event_id);
            put(&env, &DataKey::ReportQueue, &queue);
        }
        EventReported {
            event_id,
            reason: reason.min(3),
            count,
        }
        .publish(&env);
        Ok(count)
    }

    /// Reported events, newest report first.
    pub fn reported_events(env: Env) -> Vec<ReportInfo> {
        let storage = env.storage().persistent();
        let queue: Vec<u32> = storage.get(&DataKey::ReportQueue).unwrap_or(Vec::new(&env));
        let mut out = Vec::new(&env);
        for i in (0..queue.len()).rev() {
            let event_id = queue.get_unchecked(i);
            out.push_back(ReportInfo {
                event_id,
                count: storage.get(&DataKey::ReportCount(event_id)).unwrap_or(0),
                hidden: storage.has(&DataKey::EventHidden(event_id)),
            });
        }
        out
    }

    /// Hide or show an event in every listing. Moderators.
    pub fn set_event_hidden(
        env: Env,
        moderator: Address,
        event_id: u32,
        hidden: bool,
    ) -> Result<(), Error> {
        moderator.require_auth();
        require_moderator(&env, &moderator)?;
        load_event(&env, event_id)?;
        let key = DataKey::EventHidden(event_id);
        if hidden {
            put(&env, &key, &true);
        } else {
            env.storage().persistent().remove(&key);
        }
        Ok(())
    }

    /// Approve a space: its events appear in the public listing. Moderators.
    pub fn set_space_verified(
        env: Env,
        moderator: Address,
        space_id: u32,
        verified: bool,
    ) -> Result<(), Error> {
        moderator.require_auth();
        require_moderator(&env, &moderator)?;
        let mut space = load_space(&env, space_id)?;
        space.verified = verified;
        put(&env, &DataKey::Space(space_id), &space);
        Ok(())
    }

    /// Hide or show a space and all its events. Moderators.
    pub fn set_space_hidden(
        env: Env,
        moderator: Address,
        space_id: u32,
        hidden: bool,
    ) -> Result<(), Error> {
        moderator.require_auth();
        require_moderator(&env, &moderator)?;
        let mut space = load_space(&env, space_id)?;
        space.hidden = hidden;
        put(&env, &DataKey::Space(space_id), &space);
        Ok(())
    }

    // ── Billing ──

    /// Set prices and the token they are paid in. Admin only.
    pub fn set_pricing(env: Env, pricing: Pricing) -> Result<(), Error> {
        admin_of(&env).require_auth();
        if pricing.monthly_price <= 0 || pricing.single_event_price <= 0 {
            return Err(Error::InvalidPricing);
        }
        let instance = env.storage().instance();
        instance.set(&DataKey::Pricing, &pricing);
        instance.extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
        Ok(())
    }

    pub fn pricing(env: Env) -> Option<Pricing> {
        pricing_of(&env)
    }

    /// Pay `months` of the monthly plan for a space (anyone can pay for it).
    /// Returns the new end date.
    pub fn subscribe(env: Env, payer: Address, space_id: u32, months: u32) -> Result<u64, Error> {
        payer.require_auth();
        if months == 0 || months > MAX_SUBSCRIBE_MONTHS {
            return Err(Error::InvalidMonths);
        }
        load_space(&env, space_id)?;
        let p = pricing_of(&env).ok_or(Error::PricingNotSet)?;
        token::TokenClient::new(&env, &p.token).transfer(
            &payer,
            &p.treasury,
            &(p.monthly_price * months as i128),
        );
        let now = env.ledger().timestamp();
        let paid_until = plan_until(&env, space_id).max(now) + months as u64 * BILLING_MONTH_SECS;
        put(&env, &DataKey::SpacePlan(space_id), &paid_until);
        Subscribed {
            space_id,
            paid_until,
        }
        .publish(&env);
        Ok(paid_until)
    }

    /// The space's plan, this month's usage and what the next event costs.
    pub fn space_billing(env: Env, space_id: u32) -> BillingStatus {
        let now = env.ledger().timestamp();
        let month = (now / BILLING_MONTH_SECS) as u32;
        let used: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::SpaceUsage(space_id, month))
            .unwrap_or(0);
        let paid_until = plan_until(&env, space_id);
        let plan_active = paid_until > now;
        match pricing_of(&env) {
            None => BillingStatus {
                pricing_set: false,
                paid_until,
                plan_active,
                events_this_month: used,
                free_events_per_month: 0,
                free_claims_per_event: 0,
                monthly_price: 0,
                single_event_price: 0,
                next_event: BillingKind::Free,
                next_event_cost: 0,
            },
            Some(p) => {
                let (next_event, next_event_cost) = if plan_active {
                    (BillingKind::Plan, 0)
                } else if used < p.free_events_per_month {
                    (BillingKind::Free, 0)
                } else {
                    (BillingKind::Single, p.single_event_price)
                };
                BillingStatus {
                    pricing_set: true,
                    paid_until,
                    plan_active,
                    events_this_month: used,
                    free_events_per_month: p.free_events_per_month,
                    free_claims_per_event: p.free_claims_per_event,
                    monthly_price: p.monthly_price,
                    single_event_price: p.single_event_price,
                    next_event,
                    next_event_cost,
                }
            }
        }
    }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/// Write a persistent entry and extend its TTL.
fn put<V: IntoVal<Env, Val>>(env: &Env, key: &DataKey, value: &V) {
    let storage = env.storage().persistent();
    storage.set(key, value);
    storage.extend_ttl(key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

fn admin_of(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

fn is_moderator(env: &Env, address: &Address) -> bool {
    admin_of(env) == *address
        || env
            .storage()
            .persistent()
            .has(&DataKey::Moderator(address.clone()))
}

fn require_moderator(env: &Env, address: &Address) -> Result<(), Error> {
    if is_moderator(env, address) {
        Ok(())
    } else {
        Err(Error::NotModerator)
    }
}

#[allow(clippy::too_many_arguments)]
fn validate_event(
    env: &Env,
    name: &String,
    description: &String,
    location: &String,
    image_url: &String,
    starts_at: u64,
    ends_at: u64,
) -> Result<(), Error> {
    if name.is_empty() || name.len() > MAX_NAME_LEN {
        return Err(Error::InvalidName);
    }
    if description.len() > MAX_DESCRIPTION_LEN
        || location.len() > MAX_LOCATION_LEN
        || image_url.len() > MAX_IMAGE_URL_LEN
    {
        return Err(Error::TextTooLong);
    }
    if ends_at <= starts_at || ends_at <= env.ledger().timestamp() {
        return Err(Error::InvalidDates);
    }
    Ok(())
}

/// Store a new event (already validated) and return its id.
#[allow(clippy::too_many_arguments)]
fn new_event(
    env: &Env,
    organizer: &Address,
    name: String,
    description: String,
    location: String,
    image_url: String,
    starts_at: u64,
    ends_at: u64,
    max_claims: u32,
) -> u32 {
    let instance = env.storage().instance();
    let id: u32 = instance.get(&DataKey::EventCount).unwrap_or(0);
    instance.set(&DataKey::EventCount, &(id + 1));
    instance.extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);

    let event = Event {
        id,
        organizer: organizer.clone(),
        name,
        description,
        location,
        image_url,
        starts_at,
        ends_at,
        max_claims,
        claimed: 0,
        closed: false,
    };
    save_event(env, &event);

    EventCreated {
        organizer: organizer.clone(),
        id,
    }
    .publish(env);
    id
}

/// The event is accepting badges right now.
fn check_open(env: &Env, event: &Event) -> Result<(), Error> {
    let now = env.ledger().timestamp();
    if event.closed || now > event.ends_at {
        return Err(Error::EventEnded);
    }
    if now < event.starts_at {
        return Err(Error::NotStarted);
    }
    Ok(())
}

/// Give `attendee` the event's badge (capacity and duplicates checked here).
fn issue_badge(env: &Env, event: &mut Event, attendee: &Address) -> Result<u32, Error> {
    if event.max_claims > 0 && event.claimed >= event.max_claims {
        return Err(Error::SoldOut);
    }

    let storage = env.storage().persistent();
    let badge_key = DataKey::Badge(event.id, attendee.clone());
    if storage.has(&badge_key) {
        return Err(Error::AlreadyClaimed);
    }
    let owned_key = DataKey::BadgesOf(attendee.clone());
    let mut owned: Vec<Badge> = storage.get(&owned_key).unwrap_or(Vec::new(env));
    if owned.len() >= MAX_BADGES_PER_OWNER {
        return Err(Error::TooManyBadges);
    }

    event.claimed += 1;
    let badge = Badge {
        event_id: event.id,
        event_name: event.name.clone(),
        owner: attendee.clone(),
        number: event.claimed,
        claimed_at: env.ledger().timestamp(),
    };

    storage.set(&badge_key, &badge);
    storage.extend_ttl(&badge_key, TTL_THRESHOLD, TTL_EXTEND_TO);
    owned.push_back(badge);
    storage.set(&owned_key, &owned);
    storage.extend_ttl(&owned_key, TTL_THRESHOLD, TTL_EXTEND_TO);
    save_event(env, event);

    BadgeClaimed {
        event_id: event.id,
        attendee: attendee.clone(),
        number: event.claimed,
    }
    .publish(env);
    Ok(event.claimed)
}

fn save_attestation(
    env: &Env,
    event_id: u32,
    attendee: &Address,
    method: ProofMode,
    attested_by: &Address,
) {
    let attestation = Attestation {
        event_id,
        attendee: attendee.clone(),
        method,
        attested_by: attested_by.clone(),
        at: env.ledger().timestamp(),
    };
    put(
        env,
        &DataKey::Attestation(event_id, attendee.clone()),
        &attestation,
    );
}

/// Bytes the event key signs for the rotating QR.
fn proof_message(env: &Env, event_id: u32, window: u64) -> Bytes {
    let mut message = Bytes::from_slice(env, b"astros:");
    message.extend_from_array(&event_id.to_be_bytes());
    message.extend_from_array(&window.to_be_bytes());
    message
}

fn load_event(env: &Env, event_id: u32) -> Result<Event, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Event(event_id))
        .ok_or(Error::EventNotFound)
}

fn save_event(env: &Env, event: &Event) {
    let key = DataKey::Event(event.id);
    env.storage().persistent().set(&key, event);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

/// v2 data of an event; v1 events have none.
fn load_meta(env: &Env, event_id: u32) -> Result<EventMeta, Error> {
    let storage = env.storage().persistent();
    match storage.get(&DataKey::EventMeta(event_id)) {
        Some(meta) => Ok(meta),
        None if storage.has(&DataKey::Event(event_id)) => Err(Error::WrongProofMode),
        None => Err(Error::EventNotFound),
    }
}

fn event_view(env: &Env, event_id: u32) -> Result<EventView, Error> {
    let event = load_event(env, event_id)?;
    let storage = env.storage().persistent();
    let mut meta = Vec::new(env);
    if let Some(m) = storage.get::<_, EventMeta>(&DataKey::EventMeta(event_id)) {
        meta.push_back(m);
    }
    Ok(EventView {
        event,
        meta,
        hidden: storage.has(&DataKey::EventHidden(event_id)),
        reports: storage.get(&DataKey::ReportCount(event_id)).unwrap_or(0),
    })
}

fn load_space(env: &Env, space_id: u32) -> Result<Space, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Space(space_id))
        .ok_or(Error::SpaceNotFound)
}

fn is_member(env: &Env, space: &Space, address: &Address) -> bool {
    space.owner == *address
        || env
            .storage()
            .persistent()
            .has(&DataKey::SpaceStaff(space.id, address.clone()))
}

/// The organizer of the event or a member of its space.
fn require_event_staff(
    env: &Env,
    event: &Event,
    meta: &EventMeta,
    address: &Address,
) -> Result<(), Error> {
    if event.organizer == *address {
        return Ok(());
    }
    match load_space(env, meta.space_id) {
        Ok(space) if is_member(env, &space, address) => Ok(()),
        _ => Err(Error::NotSpaceMember),
    }
}

fn spaces_from(env: &Env, key: &DataKey) -> Vec<Space> {
    let ids: Vec<u32> = env.storage().persistent().get(key).unwrap_or(Vec::new(env));
    let mut out = Vec::new(env);
    for id in ids.iter() {
        if let Ok(space) = load_space(env, id) {
            out.push_back(space);
        }
    }
    out
}

fn validate_space(
    name: &String,
    description: &String,
    logo_url: &String,
    accent: u32,
) -> Result<(), Error> {
    if name.is_empty() || name.len() > MAX_NAME_LEN {
        return Err(Error::InvalidName);
    }
    if description.len() > MAX_DESCRIPTION_LEN || logo_url.len() > MAX_IMAGE_URL_LEN {
        return Err(Error::TextTooLong);
    }
    if accent >= ACCENT_COUNT {
        return Err(Error::InvalidAccent);
    }
    Ok(())
}

/// 3 to 32 chars of `a-z`, `0-9` and `-`, not starting or ending with `-`.
fn valid_slug(slug: &String) -> bool {
    let len = slug.len();
    if !(MIN_SLUG_LEN..=MAX_SLUG_LEN).contains(&len) {
        return false;
    }
    let mut buf = [0u8; MAX_SLUG_LEN as usize];
    let bytes = &mut buf[..len as usize];
    slug.copy_into_slice(bytes);
    bytes
        .iter()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || *c == b'-')
        && bytes[0] != b'-'
        && bytes[len as usize - 1] != b'-'
}

fn pricing_of(env: &Env) -> Option<Pricing> {
    env.storage().instance().get(&DataKey::Pricing)
}

fn plan_until(env: &Env, space_id: u32) -> u64 {
    env.storage()
        .persistent()
        .get(&DataKey::SpacePlan(space_id))
        .unwrap_or(0)
}

mod test;

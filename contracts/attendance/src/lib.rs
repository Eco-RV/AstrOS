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
use soroban_sdk::{
    Address, BytesN, Env, String, Vec, contract, contracterror, contractevent, contractimpl,
    contracttype,
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

#[contract]
pub struct Attendance;

#[contractimpl]
impl Attendance {
    /// `admin` can only upgrade the contract code (dev loop); it has no power
    /// over events or badges.
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
        save_event(&env, &event);

        EventCreated { organizer, id }.publish(&env);
        Ok(id)
    }

    /// Claim the badge for `event_id`. Must be signed by `attendee`.
    /// Returns the badge number (1 = first to claim).
    pub fn claim(env: Env, attendee: Address, event_id: u32) -> Result<u32, Error> {
        attendee.require_auth();

        let mut event = load_event(&env, event_id)?;
        let now = env.ledger().timestamp();
        if event.closed || now > event.ends_at {
            return Err(Error::EventEnded);
        }
        if now < event.starts_at {
            return Err(Error::NotStarted);
        }
        if event.max_claims > 0 && event.claimed >= event.max_claims {
            return Err(Error::SoldOut);
        }

        let storage = env.storage().persistent();
        let badge_key = DataKey::Badge(event_id, attendee.clone());
        if storage.has(&badge_key) {
            return Err(Error::AlreadyClaimed);
        }
        let owned_key = DataKey::BadgesOf(attendee.clone());
        let mut owned: Vec<Badge> = storage.get(&owned_key).unwrap_or(Vec::new(&env));
        if owned.len() >= MAX_BADGES_PER_OWNER {
            return Err(Error::TooManyBadges);
        }

        event.claimed += 1;
        let badge = Badge {
            event_id,
            event_name: event.name.clone(),
            owner: attendee.clone(),
            number: event.claimed,
            claimed_at: now,
        };

        storage.set(&badge_key, &badge);
        storage.extend_ttl(&badge_key, TTL_THRESHOLD, TTL_EXTEND_TO);
        owned.push_back(badge);
        storage.set(&owned_key, &owned);
        storage.extend_ttl(&owned_key, TTL_THRESHOLD, TTL_EXTEND_TO);
        save_event(&env, &event);

        BadgeClaimed {
            event_id,
            attendee,
            number: event.claimed,
        }
        .publish(&env);
        Ok(event.claimed)
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

mod test;

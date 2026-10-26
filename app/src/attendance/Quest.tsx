import { Link } from "react-router-dom"
import { SpaceChip } from "../spaces/SpaceUi"
import { type Space } from "../spaces/useSaas"
import styles from "./attendance.module.css"
import { EventArt } from "./EventArt"
import {
	type AttendanceEvent,
	type EventStatus,
	eventStatus,
	formatDate,
	STATUS_LABEL,
} from "./useAttendance"

/** How an event looks as a mission: running, upcoming, done (badge owned) or locked. */
export type QuestState = "live" | "soon" | "done" | "locked"

export const questState = (status: EventStatus, owned: boolean): QuestState =>
	owned
		? "done"
		: status === "open"
			? "live"
			: status === "upcoming"
				? "soon"
				: "locked"

const STICKER_LABEL: Record<QuestState, string> = {
	live: "En curso",
	soon: "Próximo",
	done: "Insignia obtenida",
	locked: "",
}

/**
 * Status sticker, one fixed color per state: running = signal (pulsing dot),
 * upcoming = raised, done = paper, locked = stripes with a lock.
 */
export const StateChip = ({
	state,
	status,
}: {
	state: QuestState
	status: EventStatus
}) => (
	<span className={`sticker ${styles[`sticker_${state}`]}`}>
		{state === "locked" ? (
			<LockIcon size={10} />
		) : (
			<span className={`dot ${state === "live" ? "pulse" : ""}`} />
		)}
		{state === "locked" ? STATUS_LABEL[status] : STICKER_LABEL[state]}
	</span>
)

export const LockIcon = ({ size = 11 }: { size?: number }) => (
	<svg viewBox="0 0 16 16" width={size} height={size} aria-hidden>
		<rect x="2.5" y="7" width="11" height="8" fill="currentColor" />
		<path
			d="M5 7V5a3 3 0 0 1 6 0v2"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		/>
	</svg>
)

/** Group heading: 18px state dot, condensed title, mono counter, chevrons. */
export const GroupHead = ({
	title,
	count,
	state,
}: {
	title: string
	count: number
	state: QuestState
}) => (
	<div className={styles.groupHead}>
		<span
			className={`dot ${state === "live" ? "pulse" : ""} ${styles.groupDot} ${styles[`groupDot_${state}`]}`}
			aria-hidden
		/>
		<h3 className="title">{title}</h3>
		<span className={`num ${styles.groupCount}`}>
			{String(count).padStart(2, "0")} {count === 1 ? "misión" : "misiones"}
		</span>
		<span className="chevrons" aria-hidden />
	</div>
)

/**
 * Mission card: the event's own art on the left (stretched to the card height),
 * metadata sticker, name, description, chips and the action block.
 */
export const QuestCard = ({
	event,
	owned,
	space,
}: {
	event: AttendanceEvent
	owned: boolean
	/** The space it belongs to (events v2). */
	space?: Space
}) => {
	const status = eventStatus(event)
	const state = questState(status, owned)
	const to = `/evento/${event.id}`
	return (
		<article className={`${styles.quest} ${styles[`quest_${state}`]}`}>
			<Link to={to} className={styles.questArt} tabIndex={-1} aria-hidden>
				<EventArt
					eventId={event.id}
					name={event.name}
					imageUrl={event.image_url}
					locked={state === "locked"}
				/>
				{state === "locked" && (
					<span className={styles.lock}>
						<LockIcon size={16} />
					</span>
				)}
			</Link>
			<div className={styles.questBody}>
				<div className={styles.questMeta}>
					<StateChip state={state} status={status} />
					{space ? (
						<SpaceChip space={space} />
					) : (
						<span>Evento #{event.id}</span>
					)}
				</div>
				<h3>
					<Link to={to}>{event.name}</Link>
				</h3>
				{event.description && (
					<p className={styles.questDesc}>{event.description}</p>
				)}
				<ul className={styles.questChips}>
					<li className="chip">{formatDate(event.starts_at)}</li>
					<li className="chip">{event.location || "En línea"}</li>
					<li className="chip num">
						{event.claimed}
						{event.max_claims > 0 && ` / ${event.max_claims}`}{" "}
						{event.claimed === 1 && event.max_claims === 0
							? "insignia"
							: "insignias"}
					</li>
				</ul>
				<Link
					to={to}
					className={`btn ${state === "live" ? "btn-alert" : ""} ${styles.questAction}`}
				>
					{state === "live" ? "Reclamar insignia ↗" : "Ver evento"}
				</Link>
			</div>
		</article>
	)
}

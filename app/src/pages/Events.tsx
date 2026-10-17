import { useState } from "react"
import { Link } from "react-router-dom"
import styles from "../attendance/attendance.module.css"
import { BadgeArt } from "../attendance/BadgeArt"
import {
	type AttendanceEvent,
	type EventStatus,
	eventStatus,
	formatDate,
	STATUS_LABEL,
	useEvent,
	useLatestEvents,
} from "../attendance/useAttendance"

const featuredRaw = import.meta.env.PUBLIC_FEATURED_EVENT_ID as
	| string
	| undefined
const FEATURED_ID =
	featuredRaw && /^\d+$/.test(featuredRaw) ? Number(featuredRaw) : undefined

type Filter = "all" | "open" | "upcoming" | "past"
const FILTERS: { id: Filter; label: string }[] = [
	{ id: "all", label: "Todos" },
	{ id: "open", label: "Abiertos" },
	{ id: "upcoming", label: "Próximos" },
	{ id: "past", label: "Terminados" },
]
const matches = (filter: Filter, status: EventStatus) =>
	filter === "all" ||
	filter === status ||
	(filter === "past" && status !== "open" && status !== "upcoming")

const Events = () => {
	const { data: events, isLoading, error } = useLatestEvents()
	const { data: featured } = useEvent(
		FEATURED_ID ?? -1,
		FEATURED_ID !== undefined,
	)
	const [filter, setFilter] = useState<Filter>("all")

	const visible = events?.filter((e) => matches(filter, eventStatus(e))) ?? []

	return (
		<div className={styles.page}>
			<section className={styles.hero}>
				<span className={styles.kicker}>Stellar · red de pruebas</span>
				<h1>
					Cada evento, <span className={styles.gradientText}>una estrella</span>
				</h1>
				<p>
					Reclama la insignia de los eventos a los que asistes. Queda a tu
					nombre en la blockchain: nadie te la puede quitar y cualquiera puede
					verificarla.
				</p>
			</section>

			{featured && <FeaturedEvent event={featured} />}

			<section id="comunidad">
				<h2 className={styles.sectionTitle}>
					Eventos de la comunidad
					{events && <small>{events.length} en total</small>}
				</h2>
				<div className={styles.chips} role="toolbar" aria-label="Filtrar">
					{FILTERS.map((f) => (
						<button
							key={f.id}
							aria-pressed={filter === f.id}
							onClick={() => setFilter(f.id)}
						>
							{f.label}
						</button>
					))}
				</div>

				{isLoading && (
					<div className={styles.grid}>
						{[0, 1, 2, 3].map((i) => (
							<div key={i} className={styles.skeleton} />
						))}
					</div>
				)}
				{error && (
					<p className={styles.error}>
						No se pudieron leer los eventos: {error.message}
					</p>
				)}
				{events && visible.length === 0 && (
					<div className={styles.empty}>
						<strong>Aquí todavía no brilla nada</strong>
						<span>
							{events.length === 0
								? "Aún no hay eventos. ¡Crea el primero!"
								: "No hay eventos con este filtro."}
						</span>
						<Link to="/crear" className={`${styles.linkButton} btn-primary`}>
							＋ Crear evento
						</Link>
					</div>
				)}
				<div className={styles.grid}>
					{visible.map((event, i) => (
						<EventCard key={event.id} event={event} index={i} />
					))}
				</div>
			</section>
		</div>
	)
}

const FeaturedEvent = ({ event }: { event: AttendanceEvent }) => {
	const status = eventStatus(event)
	return (
		<Link to={`/evento/${event.id}`} className={styles.featured}>
			<BadgeArt
				eventId={event.id}
				name={event.name}
				imageUrl={event.image_url}
				size={104}
				orbit={status === "open"}
			/>
			<div className={styles.featuredBody}>
				<span className={styles.featuredTag}>★ Evento destacado</span>
				<h3>{event.name}</h3>
				<p className={styles.meta}>
					{event.location || "En línea"} · {event.claimed}{" "}
					{event.claimed === 1 ? "insignia reclamada" : "insignias reclamadas"}
				</p>
				<span className={`${styles.pill} ${styles[status]}`}>
					{STATUS_LABEL[status]}
				</span>
			</div>
		</Link>
	)
}

const EventCard = ({
	event,
	index,
}: {
	event: AttendanceEvent
	index: number
}) => {
	const status = eventStatus(event)
	return (
		<Link
			to={`/evento/${event.id}`}
			className={`card ${styles.eventCard} ${styles.stagger}`}
			style={{ "--i": index } as React.CSSProperties}
		>
			<BadgeArt
				eventId={event.id}
				name={event.name}
				imageUrl={event.image_url}
				size={64}
				muted={status !== "open" && status !== "upcoming"}
			/>
			<div>
				<span className={`${styles.pill} ${styles[status]}`}>
					{STATUS_LABEL[status]}
				</span>
				<h3>{event.name}</h3>
				<p className={styles.meta}>
					{formatDate(event.starts_at)}
					{event.location && ` · ${event.location}`}
				</p>
				<p className={styles.meta}>
					✦ {event.claimed}
					{event.max_claims > 0 && ` / ${event.max_claims}`}{" "}
					{event.claimed === 1 ? "insignia" : "insignias"}
				</p>
			</div>
		</Link>
	)
}

export default Events

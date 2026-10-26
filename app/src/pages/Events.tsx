import { Link } from "react-router-dom"
import styles from "../attendance/attendance.module.css"
import { Bauhaus } from "../attendance/Bauhaus"
import { EventArt } from "../attendance/EventArt"
import {
	GroupHead,
	QuestCard,
	type QuestState,
	questState,
} from "../attendance/Quest"
import {
	type AttendanceEvent,
	eventStatus,
	useBadgesOf,
	useEvent,
	useLatestEvents,
} from "../attendance/useAttendance"
import { Seal } from "../brand/Logo"
import { SideIndex } from "../components/SideIndex"
import { Ticker } from "../components/Ticker"
import { useWallet } from "../hooks/useWallet"
import { useMagnetic, useReveal } from "../motion/motion"
import { RiseText } from "../motion/RiseText"

const featuredRaw = import.meta.env.PUBLIC_FEATURED_EVENT_ID as
	| string
	| undefined
const FEATURED_ID =
	featuredRaw && /^\d+$/.test(featuredRaw) ? Number(featuredRaw) : undefined

const GROUPS: { state: QuestState; title: string }[] = [
	{ state: "live", title: "En curso" },
	{ state: "soon", title: "Próximas" },
	{ state: "done", title: "Completadas" },
	{ state: "locked", title: "Terminadas" },
]

const SECTIONS = [
	{ id: "inicio", label: "Inicio" },
	{ id: "misiones", label: "Misiones" },
	{ id: "organiza", label: "Organiza" },
]

const Events = () => {
	const { address } = useWallet()
	const { data: events, isLoading, error } = useLatestEvents()
	const { data: badges } = useBadgesOf(address)
	const { data: featured } = useEvent(
		FEATURED_ID ?? -1,
		FEATURED_ID !== undefined,
	)
	const heroRef = useReveal<HTMLElement>()
	const ctaRef = useReveal<HTMLElement>()
	const magnetic = useMagnetic<HTMLAnchorElement>(0.25)

	const owned = new Set(badges?.map((b) => b.event_id))
	const byState = (state: QuestState) =>
		events?.filter(
			(e) =>
				e.id !== featured?.id &&
				questState(eventStatus(e), owned.has(e.id)) === state,
		) ?? []
	const live = events?.filter((e) => eventStatus(e) === "open").length ?? 0
	// Hero art: the featured event, else the most recent one with a photo.
	const heroEvent = featured ?? events?.find((e) => e.image_url) ?? events?.[0]

	return (
		<div className={styles.page}>
			<SideIndex items={SECTIONS} />

			<section id="inicio" ref={heroRef} className={`grid ${styles.hero}`}>
				<div className={`cell ${styles.heroArt}`}>
					{heroEvent ? (
						<Link to={`/evento/${heroEvent.id}`} className={styles.heroArtLink}>
							<EventArt
								eventId={heroEvent.id}
								name={heroEvent.name}
								imageUrl={heroEvent.image_url}
								medalSize={180}
							/>
							<span className={styles.heroCaption}>{heroEvent.name} ↗</span>
						</Link>
					) : (
						<div className={styles.heroSeal}>
							<Seal size={160} inverted />
						</div>
					)}
					<span className={styles.heroSticker}>Testnet</span>
				</div>
				<div className={`cell ${styles.rail}`}>
					<RailWord word="Stellar" />
					<RailWord word="Testnet" />
					{events && (
						<RailWord
							word={`${String(live).padStart(2, "0")} en curso`}
							live={live > 0}
						/>
					)}
				</div>
				<div className={`cell ${styles.heroTitle}`}>
					<h1 className="title">
						<RiseText text="Cada evento," />
						<br />
						<RiseText text="una insignia" delay={0.6} />
					</h1>
				</div>
				<div className={`cell ${styles.heroLead}`}>
					<span className="kicker">Tu constelación de eventos</span>
					<p>
						Reclama la insignia de los eventos a los que asistes. Queda a tu
						nombre en la blockchain de Stellar: nadie te la puede quitar y
						cualquiera puede verificarla.
					</p>
				</div>
				<div className={`cell ${styles.heroAction}`}>
					<a ref={magnetic} href="#misiones" className="btn btn-primary">
						Ver misiones ↓
					</a>
				</div>
			</section>

			{events && events.length > 0 && (
				<Ticker words={events.slice(0, 8).map((e) => e.name)} />
			)}

			<section id="misiones" className="slab">
				<div className="wrap">
					<header className="section-head">
						<div>
							<span className="chapter" aria-hidden>
								01
							</span>
							<span className="kicker">Eventos de la comunidad</span>
							<h2 className="title">Misiones</h2>
						</div>
						<p>
							Cada evento es una misión: asiste, reclama su insignia y queda en
							tu wallet para siempre.
						</p>
					</header>

					<div className={styles.groups}>
						{featured && (
							<section className={styles.group}>
								<GroupHead title="Destacada" count={1} state="soon" />
								<div className={styles.quests}>
									<QuestCard event={featured} owned={owned.has(featured.id)} />
								</div>
							</section>
						)}

						{isLoading && (
							<div className={styles.quests}>
								{[0, 1, 2].map((i) => (
									<div key={i} className={styles.skeleton} />
								))}
							</div>
						)}
						{error && (
							<p className={styles.error}>
								No se pudieron leer los eventos de la red de pruebas. Revisa tu
								conexión y recarga la página. ({error.message})
							</p>
						)}
						{events && events.length === 0 && (
							<div className={styles.empty}>
								<Bauhaus seed={1} size={120} />
								<div>
									<strong>Aún no hay misiones</strong>
									<span>
										Crea el primer evento y comparte su enlace con tu grupo.
									</span>
									<Link to="/crear" className="btn btn-primary">
										Crear evento
									</Link>
								</div>
							</div>
						)}

						{GROUPS.map(({ state, title }) => (
							<QuestGroup
								key={state}
								state={state}
								title={title}
								events={byState(state)}
								owned={owned}
							/>
						))}
					</div>
				</div>
			</section>

			<section id="organiza" ref={ctaRef} className={styles.cta}>
				<span className="chapter" aria-hidden>
					02
				</span>
				<div>
					<h2 className="title">¿Organizas un evento?</h2>
					<p>
						Crea la misión en un minuto: tus asistentes reclaman la insignia
						desde el celular con un QR.
					</p>
				</div>
				<Link to="/crear" className="btn btn-dark">
					Crear evento
				</Link>
			</section>
		</div>
	)
}

/** Status rail word: outlined, fills with signal on hover. */
const RailWord = ({ word, live = false }: { word: string; live?: boolean }) => (
	<div className={styles.railItem}>
		<span className={`${styles.railNode} ${live ? styles.railLive : ""}`} />
		<span className={styles.railWord}>{word}</span>
	</div>
)

const QuestGroup = ({
	state,
	title,
	events,
	owned,
}: {
	state: QuestState
	title: string
	events: AttendanceEvent[]
	owned: Set<number>
}) => {
	const ref = useReveal<HTMLElement>()
	if (events.length === 0) return null
	return (
		<section ref={ref} className={styles.group} id={`grupo-${state}`}>
			<GroupHead title={title} count={events.length} state={state} />
			<div className={styles.quests}>
				{events.map((event) => (
					<QuestCard key={event.id} event={event} owned={owned.has(event.id)} />
				))}
			</div>
		</section>
	)
}

export default Events

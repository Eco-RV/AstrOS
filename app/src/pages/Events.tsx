import { type Category } from "attendance"
import { useState } from "react"
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
import { eventStatus, useBadgesOf } from "../attendance/useAttendance"
import { Seal } from "../brand/Logo"
import { SideIndex } from "../components/SideIndex"
import { Ticker } from "../components/Ticker"
import { useWallet } from "../hooks/useWallet"
import { useMagnetic, useReveal } from "../motion/motion"
import { RiseText } from "../motion/RiseText"
import { CATEGORIES } from "../spaces/catalog"
import saas from "../spaces/saas.module.css"
import { SpaceCard } from "../spaces/SpaceUi"
import {
	type EventView,
	metaOf,
	type Space,
	useLatestSpaces,
	usePublicEvents,
} from "../spaces/useSaas"

const GROUPS: { state: QuestState; title: string }[] = [
	{ state: "live", title: "En curso" },
	{ state: "soon", title: "Próximas" },
	{ state: "done", title: "Completadas" },
	{ state: "locked", title: "Terminadas" },
]

const SECTIONS = [
	{ id: "inicio", label: "Inicio" },
	{ id: "misiones", label: "Misiones" },
	{ id: "espacios", label: "Espacios" },
	{ id: "organiza", label: "Organiza" },
]

/**
 * Public home: only events of spaces verified by a moderator, filterable by
 * category, plus the verified spaces themselves.
 */
const Events = () => {
	const { address } = useWallet()
	const { data: events, isLoading, error } = usePublicEvents()
	const { data: spaces } = useLatestSpaces(true)
	const { data: badges } = useBadgesOf(address)
	const [category, setCategory] = useState<Category | "all">("all")
	const heroRef = useReveal<HTMLElement>()
	const ctaRef = useReveal<HTMLElement>()
	const magnetic = useMagnetic<HTMLAnchorElement>(0.25)

	const spaceById = new Map(spaces?.map((s) => [s.id, s]))
	const owned = new Set(badges?.map((b) => b.event_id))
	const inCategory = (v: EventView) =>
		category === "all" || metaOf(v)?.category === category
	const visible = events?.filter(inCategory) ?? []
	const byState = (state: QuestState) =>
		visible.filter(
			(v) => questState(eventStatus(v.event), owned.has(v.event.id)) === state,
		)
	const live =
		events?.filter((v) => eventStatus(v.event) === "open").length ?? 0
	const heroEvent = events?.find((v) => v.event.image_url) ?? events?.[0]
	const shownSpaces =
		spaces?.filter((s) => category === "all" || s.category === category) ?? []

	return (
		<div className={styles.page}>
			<SideIndex items={SECTIONS} />

			<section id="inicio" ref={heroRef} className={`grid ${styles.hero}`}>
				<div className={`cell ${styles.heroArt}`}>
					{heroEvent ? (
						<Link
							to={`/evento/${heroEvent.event.id}`}
							className={styles.heroArtLink}
						>
							<EventArt
								eventId={heroEvent.event.id}
								name={heroEvent.event.name}
								imageUrl={heroEvent.event.image_url}
								medalSize={180}
							/>
							<span className={styles.heroCaption}>
								{heroEvent.event.name} ↗
							</span>
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
					{spaces && (
						<RailWord
							word={`${String(spaces.length).padStart(2, "0")} espacios`}
						/>
					)}
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
						Asiste, reclama tu insignia y llévate un certificado que cualquiera
						puede verificar. Universidades, empresas, comunidades y negocios dan
						fe de tu asistencia en la blockchain de Stellar.
					</p>
				</div>
				<div className={`cell ${styles.heroAction}`}>
					<a ref={magnetic} href="#misiones" className="btn btn-primary">
						Ver misiones ↓
					</a>
				</div>
			</section>

			{events && events.length > 0 && (
				<Ticker words={events.slice(0, 8).map((v) => v.event.name)} />
			)}

			<section id="misiones" className="slab">
				<div className="wrap">
					<header className="section-head">
						<div>
							<span className="chapter" aria-hidden>
								01
							</span>
							<span className="kicker">Espacios verificados</span>
							<h2 className="title">Misiones</h2>
						</div>
						<p>
							Solo se muestran eventos de espacios que AstrOS verificó. Cada uno
							dice cómo se comprueba la asistencia.
						</p>
					</header>

					<div
						className={saas.filters}
						role="group"
						aria-label="Categoría"
						style={{ marginBottom: "2rem" }}
					>
						<button
							aria-pressed={category === "all"}
							onClick={() => setCategory("all")}
						>
							Todas
						</button>
						{CATEGORIES.map((c) => (
							<button
								key={c.id}
								aria-pressed={category === c.id}
								onClick={() => setCategory(c.id)}
							>
								{c.label}
							</button>
						))}
					</div>

					<div className={styles.groups}>
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
						{events && visible.length === 0 && (
							<div className={styles.empty}>
								<Bauhaus seed={1} size={120} />
								<div>
									<strong>
										{events.length === 0
											? "Todavía no hay espacios verificados con eventos"
											: "No hay eventos en esta categoría"}
									</strong>
									<span>
										Crea el espacio de tu negocio y tus primeros eventos. Un
										moderador lo verifica para mostrarlo aquí.
									</span>
									<Link to="/organizar" className="btn btn-primary">
										Crear mi espacio
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
								spaces={spaceById}
							/>
						))}
					</div>
				</div>
			</section>

			<section id="espacios" className={saas.page}>
				<header className="section-head">
					<div>
						<span className="chapter" aria-hidden>
							02
						</span>
						<span className="kicker">Quién organiza</span>
						<h2 className="title">Espacios</h2>
					</div>
					<p>
						Negocios, universidades y comunidades con su propio espacio dentro
						de AstrOS.
					</p>
				</header>
				{shownSpaces.length === 0 ? (
					<p className={saas.muted}>
						Todavía no hay espacios verificados en esta categoría.
					</p>
				) : (
					<div className={saas.cards}>
						{shownSpaces.map((s) => (
							<SpaceCard key={s.id} space={s} />
						))}
					</div>
				)}
			</section>

			<section id="organiza" ref={ctaRef} className={styles.cta}>
				<span className="chapter" aria-hidden>
					03
				</span>
				<div>
					<h2 className="title">¿Organizas eventos?</h2>
					<p>
						Crea el espacio de tu negocio, elige cómo comprobar la asistencia y
						entrega insignias y certificados verificables. Gratis para empezar.
					</p>
				</div>
				<Link to="/organizar" className="btn btn-dark">
					Crear mi espacio
				</Link>
			</section>
		</div>
	)
}

/** Status rail word, outlined. */
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
	spaces,
}: {
	state: QuestState
	title: string
	events: EventView[]
	owned: Set<number>
	spaces: Map<number, Space>
}) => {
	const ref = useReveal<HTMLElement>()
	if (events.length === 0) return null
	return (
		<section ref={ref} className={styles.group} id={`grupo-${state}`}>
			<GroupHead title={title} count={events.length} state={state} />
			<div className={styles.quests}>
				{events.map((v) => {
					const meta = metaOf(v)
					return (
						<QuestCard
							key={v.event.id}
							event={v.event}
							owned={owned.has(v.event.id)}
							space={meta ? spaces.get(meta.space_id) : undefined}
						/>
					)
				})}
			</div>
		</section>
	)
}

export default Events

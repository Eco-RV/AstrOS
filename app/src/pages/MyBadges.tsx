import { shortAddress, stellarNetwork } from "@stellar-scaffold/app-lib"
import { attendance } from "@stellar-scaffold/app-lib/clients"
import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import styles from "../attendance/attendance.module.css"
import { BadgeArt } from "../attendance/BadgeArt"
import { Bauhaus } from "../attendance/Bauhaus"
import { LockIcon } from "../attendance/Quest"
import {
	type AttendanceEvent,
	type Badge,
	eventStatus,
	formatDate,
	useBadgesOf,
	useLatestEvents,
} from "../attendance/useAttendance"
import { useCavosState } from "../cavos/context"
import { SideIndex } from "../components/SideIndex"
import { useWallet } from "../hooks/useWallet"
import { explorerContract } from "../lib/explorer"
import { useReveal } from "../motion/motion"
import { RiseText } from "../motion/RiseText"
import { certificatePath } from "../proof/certificate"
import { MyAttendanceQr } from "../proof/ProofUi"
import saas from "../spaces/saas.module.css"

/** Contract limit (MAX_BADGES_PER_OWNER in contracts/attendance). */
const MAX_BADGES = 100

const SECTIONS = [
	{ id: "ficha", label: "Ficha" },
	{ id: "coleccion", label: "Colección" },
]

const MyBadges = () => {
	const { address, connector } = useWallet()
	const cavos = useCavosState()
	const { data: badges, isLoading } = useBadgesOf(address)
	const { data: events } = useLatestEvents()
	const [view, setView] = useState<"sky" | "list">("sky")

	// Badges don't store the image: take it from the event when we have it.
	const images = useMemo(
		() => new Map(events?.map((e) => [e.id, e.image_url])),
		[events],
	)
	const organized = events?.filter((e) => e.organizer === address).length ?? 0
	const owned = new Set(badges?.map((b) => b.event_id))
	// Badges still to win: open or upcoming events without a badge.
	const pending =
		events?.filter((e) => {
			const s = eventStatus(e)
			return !owned.has(e.id) && (s === "open" || s === "upcoming")
		}) ?? []

	const alias =
		connector === "cavos" && cavos?.email
			? cavos.email.split("@")[0]
			: address
				? shortAddress(address)
				: "Jugador"

	return (
		<div className={styles.page}>
			<SideIndex items={SECTIONS} />
			<PlayerCard
				alias={alias ?? "Jugador"}
				address={address}
				badges={badges?.length ?? 0}
				organized={organized}
				loading={isLoading}
			/>

			{address && (
				<details className={saas.card}>
					<summary>Mi QR de asistencia (para el check-in)</summary>
					<MyAttendanceQr address={address} />
				</details>
			)}

			{isLoading ? (
				<div className={styles.skeleton} style={{ height: 260 }} />
			) : !badges?.length ? (
				<div className={styles.empty}>
					<Bauhaus seed={2} size={120} />
					<div>
						<strong>Aún no tienes insignias</strong>
						<span>
							Tu primera misión aparece cuando asistes a un evento y reclamas su
							insignia.
						</span>
						<Link to="/" className="btn btn-primary">
							Ver eventos abiertos
						</Link>
					</div>
				</div>
			) : (
				<section
					id="coleccion"
					className={view === "list" ? "slab" : styles.collectionDark}
				>
					<div className={view === "list" ? "wrap" : undefined}>
						<header className="section-head">
							<div>
								<span className="chapter" aria-hidden>
									02
								</span>
								<span className="kicker">Tu colección</span>
								<h2 className="title">
									{view === "sky" ? "Constelación" : "Logros"}
								</h2>
							</div>
							<div className={styles.sectionAside}>
								<p>
									{view === "sky"
										? "Cada insignia es un nodo, en el orden en que las reclamaste."
										: "Voltea una insignia para ver su fecha y verla en Stellar Expert."}
								</p>
								<div
									className={styles.viewToggle}
									role="group"
									aria-label="Vista"
								>
									<button
										aria-pressed={view === "sky"}
										onClick={() => setView("sky")}
									>
										Constelación
									</button>
									<button
										aria-pressed={view === "list"}
										onClick={() => setView("list")}
									>
										Logros
									</button>
								</div>
							</div>
						</header>

						{view === "sky" ? (
							<Constellation badges={badges} />
						) : (
							<Achievements badges={badges} images={images} pending={pending} />
						)}
					</div>
				</section>
			)}
		</div>
	)
}

/** Player card: alias, level (= badges), segmented XP bar and a definition list. */
const PlayerCard = ({
	alias,
	address,
	badges,
	organized,
	loading,
}: {
	alias: string
	address?: string
	badges: number
	organized: number
	loading: boolean
}) => {
	const ref = useReveal<HTMLElement>()
	const xp = Math.min(100, (badges / MAX_BADGES) * 100)

	return (
		<section id="ficha" ref={ref} className={`grid ${styles.player}`}>
			<div className={`cell ${styles.playerMain}`}>
				<span className="kicker">
					<span className="chapter" aria-hidden>
						01
					</span>{" "}
					Ficha de jugador
				</span>
				<h1 className={`title ${styles.playerName}`}>
					<RiseText key={alias} text={alias} breakWords />
				</h1>
				<div className={styles.level}>
					<span>Nivel</span>
					<strong>{loading ? "–" : String(badges).padStart(2, "0")}</strong>
				</div>
				<div className={styles.xp}>
					<div className={styles.xpLabel}>
						<span>XP</span>
						<span>
							{badges} / {MAX_BADGES} insignias
						</span>
					</div>
					<div
						className={styles.xpBar}
						role="progressbar"
						aria-valuemin={0}
						aria-valuemax={MAX_BADGES}
						aria-valuenow={badges}
						aria-label="Insignias en tu wallet"
					>
						<span style={{ width: `${xp}%` }} />
					</div>
				</div>
			</div>
			<dl className={`cell ${styles.playerFacts}`}>
				<div>
					<dt>Wallet</dt>
					<dd title={address}>{address ? shortAddress(address) : "–"}</dd>
				</div>
				<div>
					<dt>Red</dt>
					<dd>{stellarNetwork === "PUBLIC" ? "Mainnet" : "Testnet"}</dd>
				</div>
				<div>
					<dt>Insignias</dt>
					<dd>{badges}</dd>
				</div>
				<div>
					<dt>Eventos creados</dt>
					<dd>{organized}</dd>
				</div>
			</dl>
		</section>
	)
}

const W = 720
const H = 380

/**
 * Places badges as nodes, left to right in the order they were claimed, with
 * a deterministic vertical wobble so every collection draws its own shape.
 */
const layout = (badges: Badge[]) =>
	badges.map((b, i) => {
		const n = badges.length
		const x = n === 1 ? W / 2 : 70 + (i * (W - 140)) / (n - 1)
		const wobble = Math.sin(b.event_id * 12.9898 + i * 4.1) * 0.5 + 0.5
		const y = 70 + wobble * (H - 150)
		return { badge: b, x, y }
	})

/** Technical star map: grid, slow dotted rings, yellow links, red latest route. */
const Constellation = ({ badges }: { badges: Badge[] }) => {
	const navigate = useNavigate()
	const ref = useReveal<HTMLDivElement>()
	const points = layout(badges)
	const last = points.length - 1

	return (
		<div ref={ref} className={styles.sky}>
			<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tu constelación">
				<defs>
					<pattern
						id="sky-grid"
						width="40"
						height="40"
						patternUnits="userSpaceOnUse"
					>
						<path d="M40 0H0V40" className={styles.skyGrid} />
					</pattern>
				</defs>
				<rect width={W} height={H} fill="url(#sky-grid)" />
				<g className={styles.skyRings}>
					<circle cx={W / 2} cy={H / 2} r="110" />
					<circle cx={W / 2} cy={H / 2} r="170" strokeDasharray="1 9" />
				</g>
				<g className={`${styles.skyRings} ${styles.skyRingsReverse}`}>
					<circle cx={W / 2} cy={H / 2} r="230" strokeDasharray="2 14" />
				</g>
				{points.slice(1).map((p, i) => {
					const prev = points[i]
					if (!prev) return null
					return (
						<line
							key={`l${i}`}
							className={i + 1 === last ? styles.skyRoute : styles.skyLine}
							style={{ "--i": i } as React.CSSProperties}
							x1={prev.x}
							y1={prev.y}
							x2={p.x}
							y2={p.y}
						/>
					)
				})}
				{points.map(({ badge, x, y }, i) => (
					<g
						key={badge.event_id}
						className={styles.skyStar}
						style={{ "--i": i } as React.CSSProperties}
						tabIndex={0}
						role="link"
						aria-label={`${badge.event_name}, insignia #${badge.number}`}
						onClick={() => void navigate(`/evento/${badge.event_id}`)}
						onKeyDown={(e) => {
							if (e.key === "Enter") void navigate(`/evento/${badge.event_id}`)
						}}
					>
						<circle cx={x} cy={y} r="16" className={styles.skyHalo} />
						<circle cx={x} cy={y} r="9" className={styles.skyNode} />
						{badges.length <= 10 && (
							<text
								x={x}
								y={y + 32}
								textAnchor="middle"
								className={styles.skyLabel}
							>
								{badge.event_name.length > 16
									? `${badge.event_name.slice(0, 15)}…`
									: badge.event_name}
							</text>
						)}
					</g>
				))}
			</svg>
			<p className={styles.skyLegend}>
				<span className={styles.legendLine} /> conexión
				<span className={styles.legendRoute} /> última ruta
			</p>
		</div>
	)
}

/** Achievement grid: medals that flip to show date, event and explorer link. */
const Achievements = ({
	badges,
	images,
	pending,
}: {
	badges: Badge[]
	images: Map<number, string>
	pending: AttendanceEvent[]
}) => {
	const ref = useReveal<HTMLDivElement>()
	return (
		<div ref={ref} className={`grid ${styles.achievements}`}>
			{[...badges].reverse().map((b) => (
				<FlipBadge
					key={b.event_id}
					badge={b}
					imageUrl={images.get(b.event_id)}
				/>
			))}
			{pending.map((e) => (
				<Link
					key={e.id}
					to={`/evento/${e.id}`}
					className={`cell ${styles.lockedBadge}`}
				>
					<span className={styles.lock}>
						<LockIcon size={14} />
					</span>
					<BadgeArt eventId={e.id} name={e.name} size={96} muted />
					<strong>{e.name}</strong>
					<span className={styles.meta}>
						{eventStatus(e) === "open"
							? "Abierta: reclámala en el evento"
							: `Desde el ${formatDate(e.starts_at)}`}
					</span>
				</Link>
			))}
		</div>
	)
}

const FlipBadge = ({
	badge,
	imageUrl,
}: {
	badge: Badge
	imageUrl?: string
}) => {
	const [flipped, setFlipped] = useState(false)
	const date = formatDate(badge.claimed_at)
	return (
		<div
			className={`cell ${styles.flip} ${flipped ? styles.flipped : ""}`}
			role="button"
			tabIndex={0}
			aria-pressed={flipped}
			aria-label={`${badge.event_name}. Insignia #${badge.number}, reclamada el ${date}.`}
			onClick={() => setFlipped((f) => !f)}
			onKeyDown={(e) => {
				if (e.target !== e.currentTarget) return
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault()
					setFlipped((f) => !f)
				}
			}}
		>
			<div className={styles.flipInner}>
				<div className={styles.flipFront}>
					<BadgeArt
						eventId={badge.event_id}
						name={badge.event_name}
						imageUrl={imageUrl}
						size={104}
					/>
					<strong>{badge.event_name}</strong>
					<span className={styles.meta}>#{badge.number}</span>
				</div>
				<div className={styles.flipBack}>
					<span className={styles.flipNumber}>#{badge.number}</span>
					<strong>{badge.event_name}</strong>
					<span>{date}</span>
					<Link
						to={certificatePath(badge.event_id, badge.owner)}
						onClick={(e) => e.stopPropagation()}
						tabIndex={flipped ? 0 : -1}
					>
						Certificado
					</Link>
					<Link
						to={`/evento/${badge.event_id}`}
						onClick={(e) => e.stopPropagation()}
						tabIndex={flipped ? 0 : -1}
					>
						Ver evento
					</Link>
					<a
						href={explorerContract(attendance.options.contractId)}
						target="_blank"
						rel="noreferrer"
						onClick={(e) => e.stopPropagation()}
						tabIndex={flipped ? 0 : -1}
					>
						Ver en Stellar Expert ↗
					</a>
				</div>
			</div>
		</div>
	)
}

export default MyBadges

import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import styles from "../attendance/attendance.module.css"
import { BadgeArt } from "../attendance/BadgeArt"
import {
	type Badge,
	formatDate,
	useBadgesOf,
	useLatestEvents,
} from "../attendance/useAttendance"
import { sparklePath } from "../brand/Logo"
import { useWallet } from "../hooks/useWallet"

const W = 360
const H = 220

/**
 * Places badges as stars, left to right in the order they were claimed, with
 * a deterministic vertical wobble so every collection draws its own shape.
 */
const layout = (badges: Badge[]) =>
	badges.map((b, i) => {
		const n = badges.length
		const x = n === 1 ? W / 2 : 36 + (i * (W - 72)) / (n - 1)
		const wobble = Math.sin(b.event_id * 12.9898 + i * 4.1) * 0.5 + 0.5
		const y = 40 + wobble * (H - 90)
		return { badge: b, x, y }
	})

const Constellation = ({ badges }: { badges: Badge[] }) => {
	const navigate = useNavigate()
	const points = layout(badges)
	return (
		<div className={`card ${styles.sky}`}>
			<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tu constelación">
				{points.slice(1).map((p, i) => {
					const prev = points[i]
					if (!prev) return null
					return (
						<line
							key={`l${i}`}
							className={styles.skyLine}
							style={{ "--i": i } as React.CSSProperties}
							x1={prev.x}
							y1={prev.y}
							x2={p.x}
							y2={p.y}
							pathLength={1}
							stroke="rgba(155,123,255,0.7)"
							strokeWidth="1.2"
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
						aria-label={badge.event_name}
						onClick={() => void navigate(`/evento/${badge.event_id}`)}
						onKeyDown={(e) => {
							if (e.key === "Enter") void navigate(`/evento/${badge.event_id}`)
						}}
					>
						<circle cx={x} cy={y} r="14" fill="rgba(255,214,107,0.12)" />
						<path d={sparklePath(x, y, 9)} fill="#FFD66B" />
						<circle cx={x} cy={y} r="2.2" fill="#fff" />
						{badges.length <= 8 && (
							<text
								x={x}
								y={y + 26}
								textAnchor="middle"
								className={styles.skyLabel}
							>
								{badge.event_name.length > 14
									? `${badge.event_name.slice(0, 13)}…`
									: badge.event_name}
							</text>
						)}
					</g>
				))}
			</svg>
		</div>
	)
}

const MyBadges = () => {
	const { address } = useWallet()
	const { data: badges, isLoading } = useBadgesOf(address)
	const { data: events } = useLatestEvents()
	const [view, setView] = useState<"sky" | "list">("sky")

	// Badges don't store the image: take it from the event when we have it.
	const images = useMemo(
		() => new Map(events?.map((e) => [e.id, e.image_url])),
		[events],
	)
	const organized = events?.filter((e) => e.organizer === address).length ?? 0
	const firstNumbers = badges?.filter((b) => b.number === 1).length ?? 0

	return (
		<div className={styles.page}>
			<section className={styles.hero}>
				<h1>
					Mi <span className={styles.gradientText}>constelación</span>
				</h1>
				<p>
					Cada insignia es una estrella. Viven en el contrato{" "}
					<code>attendance</code>: nadie, ni quien organiza, te las puede
					quitar.
				</p>
			</section>

			{isLoading ? (
				<div className={styles.skeleton} style={{ height: 240 }} />
			) : !badges?.length ? (
				<div className={styles.empty}>
					<strong>Tu cielo está vacío</strong>
					<span>Reclama tu primera estrella en un evento abierto.</span>
					<Link to="/" className={`${styles.linkButton} btn-primary`}>
						Buscar eventos
					</Link>
				</div>
			) : (
				<>
					<div className={styles.stats}>
						<div className={`card ${styles.stat}`}>
							<strong className={styles.gradientText}>{badges.length}</strong>
							<span>{badges.length === 1 ? "estrella" : "estrellas"}</span>
						</div>
						<div className={`card ${styles.stat}`}>
							<strong>{firstNumbers}</strong>
							<span>veces fuiste #1</span>
						</div>
						<div className={`card ${styles.stat}`}>
							<strong>{organized}</strong>
							<span>
								{organized === 1 ? "evento creado" : "eventos creados"}
							</span>
						</div>
					</div>

					<div>
						<div className={styles.viewToggle} role="group" aria-label="Vista">
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
								Insignias
							</button>
						</div>
					</div>

					{view === "sky" ? (
						<Constellation badges={badges} />
					) : (
						<div className={styles.collection}>
							{[...badges].reverse().map((b, i) => (
								<Link
									key={b.event_id}
									to={`/evento/${b.event_id}`}
									className={`card ${styles.collected} ${styles.stagger}`}
									style={{ "--i": i } as React.CSSProperties}
								>
									<BadgeArt
										eventId={b.event_id}
										name={b.event_name}
										imageUrl={images.get(b.event_id)}
										size={96}
									/>
									<strong>{b.event_name}</strong>
									<span className={styles.meta}>
										<span className={styles.number}>#{b.number}</span> ·{" "}
										{formatDate(b.claimed_at)}
									</span>
								</Link>
							))}
						</div>
					)}
				</>
			)}
		</div>
	)
}

export default MyBadges

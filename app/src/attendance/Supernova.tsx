import { useEffect } from "react"
import { Link } from "react-router-dom"
import styles from "./attendance.module.css"
import { BadgeArt } from "./BadgeArt"

/** Squares that burst out of the medal: flat geometry, no glow. */
const BITS = Array.from({ length: 12 }, (_, i) => ({
	angle: (360 / 12) * i,
	distance: 120 + (i % 3) * 30,
	delay: (i % 4) * 0.04,
	red: i % 3 === 0,
}))

/** Full-screen celebration after claiming a badge (achievement unlocked). */
export const Supernova = ({
	eventId,
	name,
	imageUrl,
	number,
	onClose,
}: {
	eventId: number
	name: string
	imageUrl?: string
	number: number
	onClose: () => void
}) => {
	useEffect(() => {
		navigator.vibrate?.([40, 60, 80])
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose()
		}
		window.addEventListener("keydown", onKey)
		return () => window.removeEventListener("keydown", onKey)
	}, [onClose])

	return (
		<div
			className={styles.nova}
			role="dialog"
			aria-modal="true"
			aria-labelledby="nova-title"
		>
			<div className={styles.novaCard}>
				<span className={styles.novaKicker}>Logro desbloqueado</span>
				<div className={styles.novaBadge}>
					<span className={styles.novaRing} aria-hidden />
					{BITS.map((s, i) => (
						<span
							key={i}
							className={`${styles.spark} ${s.red ? styles.sparkRed : ""}`}
							style={
								{
									"--a": `${s.angle}deg`,
									"--r": `-${s.distance}px`,
									"--d": `${s.delay}s`,
								} as React.CSSProperties
							}
							aria-hidden
						/>
					))}
					<BadgeArt
						eventId={eventId}
						name={name}
						imageUrl={imageUrl}
						size={170}
					/>
				</div>
				<h2 id="nova-title">Es tuya</h2>
				<p>
					Insignia <span className={styles.number}>#{number}</span> de «{name}».
					Ya está registrada en la blockchain a tu nombre.
				</p>
				<div className={styles.novaActions}>
					<Link to="/insignias" className="btn btn-dark">
						Ver mi constelación
					</Link>
					<Link to="/crear" className={`btn ${styles.novaLine}`}>
						Crear mi evento
					</Link>
					<button className={styles.novaLine} onClick={onClose}>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	)
}

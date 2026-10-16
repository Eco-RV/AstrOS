import { useEffect } from "react"
import { Link } from "react-router-dom"
import styles from "./attendance.module.css"
import { BadgeArt } from "./BadgeArt"

const SPARKS = Array.from({ length: 14 }, (_, i) => ({
	angle: (360 / 14) * i,
	distance: 110 + (i % 3) * 35,
	delay: (i % 4) * 0.05,
}))

/** Full-screen celebration after claiming a badge. */
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
				<div className={styles.novaBadge}>
					{SPARKS.map((s, i) => (
						<span
							key={i}
							className={styles.spark}
							style={
								{
									"--a": `${s.angle}deg`,
									"--r": `-${s.distance}px`,
									"--d": `${s.delay}s`,
								} as React.CSSProperties
							}
							aria-hidden
						>
							✦
						</span>
					))}
					<BadgeArt
						eventId={eventId}
						name={name}
						imageUrl={imageUrl}
						size={170}
					/>
				</div>
				<h2 id="nova-title">¡Es tuya!</h2>
				<p>
					Insignia <span className={styles.number}>#{number}</span> de «{name}».
					Ya está registrada en la blockchain a tu nombre.
				</p>
				<div className={styles.novaActions}>
					<Link to="/insignias" className={`${styles.linkButton} btn-primary`}>
						Ver mi constelación
					</Link>
					<Link to="/crear" className={styles.linkButton}>
						Crear mi evento
					</Link>
					<button className="btn-ghost" onClick={onClose}>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	)
}

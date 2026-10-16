import { Link } from "react-router-dom"
import { useCavosState } from "../cavos/context"
import styles from "./attendance.module.css"

/**
 * The 3-step onboarding for the class demo. Each step is checked from real
 * data (session, badges, events on-chain), so it ticks itself off.
 */
export const Mission = ({
	signedIn,
	hasBadge,
	hasEvent,
	claimTo,
}: {
	signedIn: boolean
	hasBadge: boolean
	hasEvent: boolean
	/** Where "Reclamar" points: the featured event, or the list. */
	claimTo: string
}) => {
	const cavos = useCavosState()
	const steps = [
		{
			title: "Entra con tu correo",
			text: "Se crea tu wallet de Stellar al instante, sin instalar nada.",
			done: signedIn,
			action: cavos ? (
				<button className="btn-primary" onClick={cavos.signIn}>
					Entrar
				</button>
			) : null,
		},
		{
			title: "Reclama tu primera insignia",
			text: "Firma una transacción y la insignia queda a tu nombre.",
			done: hasBadge,
			action: (
				<Link to={claimTo} className={`${styles.linkButton} btn-primary`}>
					Reclamar
				</Link>
			),
		},
		{
			title: "Crea tu propio evento",
			text: "Ponle nombre y foto, y comparte el enlace.",
			done: hasEvent,
			action: (
				<Link to="/crear" className={`${styles.linkButton} btn-primary`}>
					Crear
				</Link>
			),
		},
	]
	const doneCount = steps.filter((s) => s.done).length
	const current = steps.findIndex((s) => !s.done)

	return (
		<section className={`card ${styles.mission}`} aria-label="Tu misión">
			<div className={styles.missionHead}>
				<h2>
					{doneCount === 3
						? "¡Misión cumplida! ✦"
						: `Tu misión · ${doneCount}/3`}
				</h2>
				<div className={styles.progress} aria-hidden>
					<span style={{ width: `${(doneCount / 3) * 100}%` }} />
				</div>
			</div>
			<ol className={styles.steps}>
				{steps.map((s, i) => (
					<li
						key={s.title}
						className={`${styles.step} ${s.done ? styles.done : ""} ${i === current ? styles.current : ""}`}
					>
						<span className={styles.stepNum}>{s.done ? "✓" : i + 1}</span>
						<strong>{s.title}</strong>
						<small>{s.text}</small>
						{i === current && s.action && (
							<div className={styles.stepAction}>{s.action}</div>
						)}
					</li>
				))}
			</ol>
		</section>
	)
}

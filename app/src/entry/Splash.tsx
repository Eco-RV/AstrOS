import { useEffect, useState } from "react"
import { Blueprint } from "../brand/Blueprint"
import { Seal } from "../brand/Logo"
import styles from "./entry.module.css"

/**
 * Full-screen loading screen: the seal with its tick ring turning, a
 * segmented bar and "Cargando constelación · NN %". The percentage only
 * tracks the opening animation (it is not a real progress value). With a
 * `message` (opening the wallet, welcome) it shows that text instead.
 * `onSkip` lets a click or key press skip the opening.
 */
export const Splash = ({
	message,
	duration = 1300,
	onSkip,
}: {
	message?: string
	duration?: number
	onSkip?: () => void
}) => {
	const [percent, setPercent] = useState(0)

	useEffect(() => {
		if (message) return
		const start = performance.now()
		let frame = 0
		const tick = (now: number) => {
			const t = Math.min(1, (now - start) / duration)
			setPercent(Math.round(100 * (1 - (1 - t) ** 3)))
			if (t < 1) frame = requestAnimationFrame(tick)
		}
		frame = requestAnimationFrame(tick)
		return () => cancelAnimationFrame(frame)
	}, [message, duration])

	useEffect(() => {
		if (!onSkip) return
		window.addEventListener("keydown", onSkip)
		return () => window.removeEventListener("keydown", onSkip)
	}, [onSkip])

	return (
		<div
			className={styles.splash}
			role="status"
			aria-live="polite"
			onClick={onSkip}
		>
			<Blueprint grid />
			<div className={styles.splashCenter}>
				<Seal size={88} spin />
				<span className="kicker">AstrOS · Stellar testnet</span>
				{message ? (
					<p key={message} className={styles.splashText}>
						{message}
					</p>
				) : (
					<>
						<div className={styles.splashBar} aria-hidden>
							<span style={{ width: `${percent}%` }} />
						</div>
						<p className={styles.splashText}>
							Cargando constelación · {String(percent).padStart(2, "0")} %
						</p>
					</>
				)}
				{onSkip && (
					<small className={styles.splashSkip}>Clic para saltar</small>
				)}
			</div>
		</div>
	)
}

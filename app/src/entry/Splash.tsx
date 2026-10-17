import { useEffect, useState } from "react"
import { sparklePath, Wordmark } from "../brand/Logo"
import { Starfield } from "../brand/Starfield"
import styles from "./entry.module.css"

/** The "A" constellation of the logo: stars and the lines between them. */
const STARS = [
	{ x: 30, y: 104, r: 5 },
	{ x: 47, y: 68, r: 6 },
	{ x: 81, y: 68, r: 6 },
	{ x: 98, y: 104, r: 5 },
]
const LINES = [
	[30, 104, 47, 68],
	[47, 68, 64, 30],
	[64, 30, 81, 68],
	[81, 68, 98, 104],
	[47, 68, 81, 68],
]

const DEFAULT_MESSAGES = [
	"Alineando las estrellas…",
	"Conectando con Stellar…",
	"Preparando tu constelación…",
]

/**
 * Full-screen loading screen in the AstrOS theme: the logo's constellation
 * draws itself line by line while the messages rotate.
 */
export const Splash = ({ message }: { message?: string }) => {
	const [index, setIndex] = useState(0)

	useEffect(() => {
		if (message) return
		const timer = setInterval(
			() => setIndex((i) => (i + 1) % DEFAULT_MESSAGES.length),
			1400,
		)
		return () => clearInterval(timer)
	}, [message])

	const text = message ?? DEFAULT_MESSAGES[index]

	return (
		<div className={styles.splash} role="status" aria-live="polite">
			<Starfield />
			<div className={styles.splashCenter}>
				<svg viewBox="0 0 128 128" className={styles.constellation} aria-hidden>
					<defs>
						<linearGradient
							id="splash-aurora"
							gradientUnits="userSpaceOnUse"
							x1="20"
							y1="20"
							x2="108"
							y2="108"
						>
							<stop offset="0" stopColor="#7B61FF" />
							<stop offset=".55" stopColor="#C86DD7" />
							<stop offset="1" stopColor="#3DD6F5" />
						</linearGradient>
					</defs>
					<circle
						cx="64"
						cy="68"
						r="58"
						className={styles.orbitRing}
						fill="none"
					/>
					{LINES.map(([x1, y1, x2, y2], i) => (
						<line
							key={i}
							x1={x1}
							y1={y1}
							x2={x2}
							y2={y2}
							pathLength={1}
							className={styles.splashLine}
							style={{ "--i": i } as React.CSSProperties}
							stroke="url(#splash-aurora)"
						/>
					))}
					{STARS.map((s, i) => (
						<circle
							key={i}
							cx={s.x}
							cy={s.y}
							r={s.r}
							fill="#fff"
							className={styles.splashStar}
							style={{ "--i": i } as React.CSSProperties}
						/>
					))}
					<path
						d={sparklePath(64, 30, 18)}
						fill="#FFD66B"
						className={styles.splashApex}
					/>
				</svg>
				<Wordmark height={42} className={styles.splashWordmark} />
				<p key={text} className={styles.splashText}>
					{text}
				</p>
			</div>
		</div>
	)
}

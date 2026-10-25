import { useEffect, useState } from "react"
import styles from "./attendance.module.css"

const R = 80
const ARC = Math.PI * R

/**
 * Semicircle gauge: a `--line` track, a yellow fill, tick marks on an inner
 * arc and a red needle that swings from -90° to the value with a spring.
 * `value` goes from 0 to 1.
 */
export const Gauge = ({ value, label }: { value: number; label: string }) => {
	const v = Math.min(1, Math.max(0, value))
	// Start at 0 and move to the value after mounting, so the needle swings.
	const [shown, setShown] = useState(0)
	useEffect(() => {
		const frame = requestAnimationFrame(() => setShown(v))
		return () => cancelAnimationFrame(frame)
	}, [v])

	return (
		<figure className={styles.gauge}>
			<svg viewBox="0 0 200 116" role="img" aria-label={label}>
				<path
					d={`M${100 - R} 100 A${R} ${R} 0 0 1 ${100 + R} 100`}
					className={styles.gaugeTrack}
				/>
				<path
					d={`M${100 - R} 100 A${R} ${R} 0 0 1 ${100 + R} 100`}
					className={styles.gaugeFill}
					strokeDasharray={ARC}
					strokeDashoffset={ARC * (1 - shown)}
				/>
				<path d="M36 100 A64 64 0 0 1 164 100" className={styles.gaugeTicks} />
				<g
					className={styles.gaugeNeedle}
					style={{ transform: `rotate(${-90 + 180 * shown}deg)` }}
				>
					<rect x="98.5" y="34" width="3" height="66" />
				</g>
				<circle cx="100" cy="100" r="9" className={styles.gaugeHub} />
			</svg>
			<figcaption>{label}</figcaption>
		</figure>
	)
}

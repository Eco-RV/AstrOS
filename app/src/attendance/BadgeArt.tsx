import { useState } from "react"
import { imageSources } from "../lib/ipfs"
import styles from "./attendance.module.css"

export const initials = (name: string) =>
	name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase())
		.join("")

/**
 * Badge medal: signal outer ring, a ring of tick marks and a signal center
 * disc with the initials (Oswald 700, on-signal), or the event photo in the disc
 * when it has one. If a gateway fails it tries the next one, and falls back to
 * the initials when none works. `muted` is the locked look; `orbit` turns the
 * tick ring slowly (events open right now).
 */
export const BadgeArt = ({
	name,
	imageUrl,
	size = 96,
	muted = false,
	orbit = false,
}: {
	/** Kept for callers; the medal no longer varies its colors by event. */
	eventId?: number
	name: string
	imageUrl?: string
	size?: number
	muted?: boolean
	orbit?: boolean
}) => {
	// Failed attempts for the current image (reset when the image changes).
	const [failed, setFailed] = useState({ url: imageUrl, count: 0 })
	const attempt = failed.url === imageUrl ? failed.count : 0
	const src = imageSources(imageUrl)[attempt]

	return (
		<div
			className={`${styles.medal} ${muted ? styles.muted : ""} ${orbit ? styles.orbit : ""}`}
			style={{ width: size, height: size }}
			aria-hidden
		>
			<svg viewBox="0 0 100 100" width={size} height={size}>
				<circle className={styles.medalRing} cx="50" cy="50" r="48" />
				<circle className={styles.medalTicks} cx="50" cy="50" r="40" />
				<circle className={styles.medalDisc} cx="50" cy="50" r="31" />
				{!src && (
					<text
						className={styles.medalText}
						x="50"
						y="50"
						dominantBaseline="central"
						textAnchor="middle"
					>
						{initials(name) || "A"}
					</text>
				)}
			</svg>
			{src && (
				<img
					key={src}
					src={src}
					alt=""
					loading="lazy"
					onError={() => setFailed({ url: imageUrl, count: attempt + 1 })}
				/>
			)}
		</div>
	)
}

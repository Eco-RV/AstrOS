import { useState } from "react"
import { imageSources } from "../lib/ipfs"
import styles from "./attendance.module.css"

const GRADIENTS = [
	["#7b61ff", "#c86dd7"],
	["#0ea5e9", "#22c55e"],
	["#f97316", "#ef4444"],
	["#14b8a6", "#6366f1"],
	["#eab308", "#f97316"],
	["#ec4899", "#8b5cf6"],
] as const

const initials = (name: string) =>
	name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase())
		.join("")

/**
 * Round badge with a notched seal edge: the event image if it has one,
 * otherwise a colored seal with the initials. If a gateway fails it tries the
 * next one, and falls back to the seal when none works. `orbit` adds a spinning ring
 * (used for events that are open right now).
 */
export const BadgeArt = ({
	eventId,
	name,
	imageUrl,
	size = 96,
	muted = false,
	orbit = false,
}: {
	eventId: number
	name: string
	imageUrl?: string
	size?: number
	muted?: boolean
	orbit?: boolean
}) => {
	// Failed attempts for the current image (reset when the image changes).
	const [failed, setFailed] = useState({ url: imageUrl, count: 0 })
	const attempt = failed.url === imageUrl ? failed.count : 0
	const [from, to] = GRADIENTS[eventId % GRADIENTS.length] ?? GRADIENTS[0]
	const src = imageSources(imageUrl)[attempt]

	return (
		<div className={`${styles.badgeWrap} ${orbit ? styles.orbit : ""}`}>
			<div
				className={`${styles.badgeArt} ${muted ? styles.muted : ""}`}
				style={{
					width: size,
					height: size,
					fontSize: size / 3,
					background: `linear-gradient(135deg, ${from}, ${to})`,
				}}
				aria-hidden
			>
				{src ? (
					<img
						key={src}
						src={src}
						alt=""
						loading="lazy"
						onError={() => setFailed({ url: imageUrl, count: attempt + 1 })}
					/>
				) : (
					initials(name) || "★"
				)}
			</div>
		</div>
	)
}

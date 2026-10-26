import { useState } from "react"
import { imageSources } from "../lib/ipfs"
import styles from "./attendance.module.css"
import { BadgeArt } from "./BadgeArt"

/**
 * The event's own art: its photo filling the box (trying the next IPFS
 * gateway if one fails), or its medal when it has no photo or none loads.
 * `locked` dims it for events that no longer give badges.
 */
export const EventArt = ({
	eventId,
	name,
	imageUrl,
	locked = false,
	medalSize = 96,
}: {
	eventId: number
	name: string
	imageUrl?: string
	locked?: boolean
	medalSize?: number
}) => {
	// Failed attempts for the current image (reset when the image changes).
	const [failed, setFailed] = useState({ url: imageUrl, count: 0 })
	const attempt = failed.url === imageUrl ? failed.count : 0
	const src = imageSources(imageUrl)[attempt]

	return (
		<div
			className={`${styles.eventArt} ${locked ? styles.eventArtLocked : ""}`}
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
				<BadgeArt
					eventId={eventId}
					name={name}
					size={medalSize}
					muted={locked}
				/>
			)}
		</div>
	)
}

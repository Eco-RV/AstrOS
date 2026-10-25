import { Link } from "react-router-dom"
import { imageSrc } from "../lib/ipfs"
import { accentColor, categoryLabel } from "./catalog"
import styles from "./saas.module.css"
import { type Space } from "./useSaas"

/** Style that makes `--accent` the space's color for everything inside. */
export const accentStyle = (space?: Pick<Space, "accent">) =>
	({ "--accent": accentColor(space?.accent ?? 0) }) as React.CSSProperties

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "A"

/** The space's logo, or its initial on its accent color. */
export const SpaceLogo = ({ space }: { space: Space }) => {
	const src = imageSrc(space.logo_url)
	return (
		<span className={styles.logo} style={accentStyle(space)} aria-hidden>
			{src ? <img src={src} alt="" loading="lazy" /> : initial(space.name)}
		</span>
	)
}

export const VerifiedSticker = ({ verified }: { verified: boolean }) =>
	verified ? (
		<span className={styles.verified}>✓ Verificado</span>
	) : (
		<span className={styles.unverified}>No verificado</span>
	)

/** Small link from an event to its space. */
export const SpaceChip = ({ space }: { space: Space }) => (
	<Link
		to={`/s/${space.slug}`}
		className={styles.spaceChip}
		style={accentStyle(space)}
	>
		<span className={styles.accentDot} aria-hidden />
		{space.name}
		{space.verified && <span aria-label="verificado">✓</span>}
	</Link>
)

/** A space as a card (landing, admin). */
export const SpaceCard = ({ space }: { space: Space }) => (
	<Link to={`/s/${space.slug}`} className={styles.spaceCard}>
		<div className={styles.spaceTop}>
			<SpaceLogo space={space} />
			<div>
				<p className={styles.spaceName}>{space.name}</p>
				<span className={styles.muted}>{categoryLabel(space.category)}</span>
			</div>
		</div>
		{space.description && <p className={styles.muted}>{space.description}</p>}
		<VerifiedSticker verified={space.verified} />
	</Link>
)

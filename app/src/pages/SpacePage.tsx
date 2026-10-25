import { Link, useParams } from "react-router-dom"
import attendanceStyles from "../attendance/attendance.module.css"
import { QuestCard } from "../attendance/Quest"
import { eventStatus, useBadgesOf } from "../attendance/useAttendance"
import { useWallet } from "../hooks/useWallet"
import { RiseText } from "../motion/RiseText"
import { categoryLabel } from "../spaces/catalog"
import styles from "../spaces/saas.module.css"
import { accentStyle, SpaceLogo, VerifiedSticker } from "../spaces/SpaceUi"
import { useSpaceBySlug, useSpaceEvents } from "../spaces/useSaas"

/** `/s/:slug`: a business's own page inside AstrOS, in its accent color. */
const SpacePage = () => {
	const { slug } = useParams()
	const { address } = useWallet()
	const { data: space, isLoading, error } = useSpaceBySlug(slug)
	const { data: events } = useSpaceEvents(space?.id)
	const { data: badges } = useBadgesOf(address)
	const owned = new Set(badges?.map((b) => b.event_id))

	if (isLoading)
		return <div className={attendanceStyles.skeleton} style={{ height: 300 }} />
	if (error || !space)
		return (
			<p className={styles.warn}>
				No encontramos el espacio “/s/{slug}”. Revisa el enlace.
			</p>
		)
	if (space.hidden)
		return (
			<p className={styles.warn}>
				Este espacio fue ocultado por moderación y ya no se muestra en AstrOS.
			</p>
		)

	const visible = events?.filter((v) => !v.hidden) ?? []
	const live = visible.filter((v) => eventStatus(v.event) === "open")
	const others = visible.filter((v) => eventStatus(v.event) !== "open")

	return (
		<div className={styles.page} style={accentStyle(space)}>
			<section className={styles.spaceHero}>
				<SpaceLogo space={space} />
				<div>
					<span className="kicker" style={{ color: "var(--on-signal)" }}>
						{categoryLabel(space.category)}
					</span>
					<h1 className="title">
						<RiseText text={space.name} />
					</h1>
					{space.description && <p>{space.description}</p>}
					<div className={styles.row} style={{ marginTop: "0.8rem" }}>
						<VerifiedSticker verified={space.verified} />
					</div>
				</div>
			</section>

			{!space.verified && (
				<p className={styles.note}>
					Este espacio todavía no está verificado por AstrOS: no aparece en el
					inicio y solo se puede ver con su enlace.
				</p>
			)}

			<section className="section-head">
				<div>
					<span className="kicker">Misiones</span>
					<h2 className="title">Eventos</h2>
				</div>
				<p>
					{visible.length === 0
						? "Este espacio todavía no tiene eventos."
						: `${visible.length} ${visible.length === 1 ? "evento" : "eventos"} de ${space.name}.`}
				</p>
			</section>

			<div className={attendanceStyles.quests}>
				{[...live, ...others].map((v) => (
					<QuestCard
						key={v.event.id}
						event={v.event}
						owned={owned.has(v.event.id)}
						space={space}
					/>
				))}
			</div>

			<Link to="/" className={attendanceStyles.back}>
				← Todos los eventos
			</Link>
		</div>
	)
}

export default SpacePage

import { attendance } from "@stellar-scaffold/app-lib/clients"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import attendanceStyles from "../attendance/attendance.module.css"
import { useAttendanceWrite } from "../attendance/useAttendance"
import { RiseText } from "../motion/RiseText"
import { categoryLabel, formatXlm } from "../spaces/catalog"
import styles from "../spaces/saas.module.css"
import { SpaceLogo, VerifiedSticker } from "../spaces/SpaceUi"
import {
	type ReportInfo,
	type Space,
	useAllSpaces,
	useEventView,
	useReportedEvents,
	useRole,
} from "../spaces/useSaas"

/**
 * `/admin`: moderation for the admin and moderators. Verify spaces (only
 * verified ones reach the public listing), review reports and hide events.
 * Nothing is deleted on-chain: hidden things just stop showing.
 */
const Admin = () => {
	const { isModerator, isLoading } = useRole()
	const { data: spaces } = useAllSpaces(isModerator)
	const { data: reports } = useReportedEvents(isModerator)
	const { data: pricing } = useQuery({
		queryKey: ["attendance", "pricing"],
		enabled: isModerator,
		queryFn: async () => (await attendance.pricing()).result ?? null,
	})

	if (isLoading)
		return <div className={attendanceStyles.skeleton} style={{ height: 300 }} />
	if (!isModerator)
		return (
			<p className={styles.warn}>
				Esta página es para administradores y moderadores. Pide al administrador
				de AstrOS que agregue tu dirección como moderador.
			</p>
		)

	const pending = spaces?.filter((s) => !s.verified && !s.hidden) ?? []
	const rest = spaces?.filter((s) => s.verified || s.hidden) ?? []

	return (
		<div className={styles.page}>
			<header className={styles.head}>
				<span className="kicker">Moderación</span>
				<h1 className="title">
					<RiseText text="Panel de control" />
				</h1>
				<p>
					Solo los espacios verificados aparecen en el inicio. Lo que ocultes
					sigue en la blockchain, pero AstrOS deja de mostrarlo.
				</p>
			</header>

			<div className={styles.statRow}>
				<div className={styles.stat}>
					<span>Por verificar</span>
					<strong>{pending.length}</strong>
				</div>
				<div className={styles.stat}>
					<span>Espacios</span>
					<strong>{spaces?.length ?? "–"}</strong>
				</div>
				<div className={styles.stat}>
					<span>Eventos reportados</span>
					<strong>{reports?.length ?? "–"}</strong>
				</div>
			</div>

			<section className={styles.card}>
				<h3>Espacios por verificar</h3>
				{pending.length === 0 ? (
					<p className={styles.muted}>No hay espacios esperando revisión.</p>
				) : (
					<ul className={styles.list}>
						{pending.map((s) => (
							<SpaceRow key={s.id} space={s} />
						))}
					</ul>
				)}
			</section>

			<section className={styles.card}>
				<h3>Reportes</h3>
				{!reports?.length ? (
					<p className={styles.muted}>No hay eventos reportados.</p>
				) : (
					<ul className={styles.list}>
						{reports.map((r) => (
							<ReportRow key={r.event_id} report={r} />
						))}
					</ul>
				)}
			</section>

			<section className={styles.card}>
				<h3>Espacios verificados u ocultos</h3>
				{rest.length === 0 ? (
					<p className={styles.muted}>Todavía no hay.</p>
				) : (
					<ul className={styles.list}>
						{rest.map((s) => (
							<SpaceRow key={s.id} space={s} />
						))}
					</ul>
				)}
			</section>

			<section className={styles.card}>
				<h3>Precios</h3>
				{pricing ? (
					<div className={styles.statRow}>
						<div className={styles.stat}>
							<span>Gratis al mes</span>
							<strong>
								{pricing.free_events_per_month} eventos ·{" "}
								{pricing.free_claims_per_event} asist.
							</strong>
						</div>
						<div className={styles.stat}>
							<span>Evento único</span>
							<strong>{formatXlm(pricing.single_event_price)}</strong>
						</div>
						<div className={styles.stat}>
							<span>Plan mensual</span>
							<strong>{formatXlm(pricing.monthly_price)}</strong>
						</div>
					</div>
				) : (
					<p className={styles.muted}>Los cobros no están configurados.</p>
				)}
				<p className={styles.muted}>
					Los precios los cambia el administrador con <code>set_pricing</code>{" "}
					(ver <code>Versionamiento/2.1.0</code>).
				</p>
			</section>
		</div>
	)
}

const SpaceRow = ({ space }: { space: Space }) => {
	const { run, pending } = useAttendanceWrite()
	const set = (verified: boolean | null, hidden: boolean | null) =>
		run(
			(publicKey) =>
				verified !== null
					? attendance.set_space_verified(
							{ moderator: publicKey, space_id: space.id, verified },
							{ publicKey },
						)
					: attendance.set_space_hidden(
							{ moderator: publicKey, space_id: space.id, hidden: hidden! },
							{ publicKey },
						),
			verified === true
				? `“${space.name}” verificado: sus eventos ya aparecen en el inicio.`
				: verified === false
					? `“${space.name}” ya no está verificado.`
					: hidden
						? `“${space.name}” ocultado.`
						: `“${space.name}” visible otra vez.`,
		)

	return (
		<li>
			<div className={styles.spaceTop}>
				<SpaceLogo space={space} />
				<div style={{ minWidth: 0 }}>
					<Link to={`/s/${space.slug}`}>
						<strong>{space.name}</strong>
					</Link>
					<div className={styles.muted}>
						{categoryLabel(space.category)} · /s/{space.slug}
						{space.hidden && " · oculto"}
					</div>
					{space.description && (
						<div className={styles.muted}>{space.description}</div>
					)}
				</div>
			</div>
			<div className={styles.row}>
				<VerifiedSticker verified={space.verified} />
				<button
					className={`${space.verified ? "" : "btn-primary"} ${styles.small}`}
					disabled={pending}
					onClick={() => void set(!space.verified, null)}
				>
					{space.verified ? "Quitar verificación" : "Verificar"}
				</button>
				<button
					className={`btn-ghost ${styles.small}`}
					disabled={pending}
					onClick={() => void set(null, !space.hidden)}
				>
					{space.hidden ? "Mostrar" : "Ocultar"}
				</button>
			</div>
		</li>
	)
}

const ReportRow = ({ report }: { report: ReportInfo }) => {
	const { data: view } = useEventView(report.event_id)
	const { run, pending } = useAttendanceWrite()
	const toggle = () =>
		run(
			(publicKey) =>
				attendance.set_event_hidden(
					{
						moderator: publicKey,
						event_id: report.event_id,
						hidden: !report.hidden,
					},
					{ publicKey },
				),
			report.hidden ? "Evento visible otra vez." : "Evento ocultado.",
		)

	return (
		<li>
			<div>
				<Link to={`/evento/${report.event_id}`}>
					<strong>{view?.event.name ?? `Evento #${report.event_id}`}</strong>
				</Link>
				<div className={styles.muted}>
					{report.count} {report.count === 1 ? "reporte" : "reportes"}
					{view?.event.description && ` · ${view.event.description}`}
				</div>
			</div>
			<div className={styles.row}>
				{report.hidden && <span className="sticker">Oculto</span>}
				<button
					className={`${report.hidden ? "" : "btn-alert"} ${styles.small}`}
					disabled={pending}
					onClick={() => void toggle()}
				>
					{report.hidden ? "Mostrar" : "Ocultar evento"}
				</button>
			</div>
		</li>
	)
}

export default Admin

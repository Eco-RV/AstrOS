import { shortAddress } from "@stellar-scaffold/app-lib"
import { attendance } from "@stellar-scaffold/app-lib/clients"
import { Link, useParams } from "react-router-dom"
import styles from "../attendance/attendance.module.css"
import { BadgeArt } from "../attendance/BadgeArt"
import {
	eventStatus,
	formatDate,
	STATUS_LABEL,
	useAttendanceWrite,
	useEvent,
	useMyBadge,
} from "../attendance/useAttendance"
import { useNotification } from "../hooks/useNotification"

const EventDetail = () => {
	const eventId = Number(useParams().id)
	const { data: event, isLoading, error } = useEvent(eventId)
	const { run, pending, address } = useAttendanceWrite()
	const { data: myBadge } = useMyBadge(eventId, address)
	const { addNotification } = useNotification()

	if (isLoading) return <p className={styles.hint}>Cargando evento…</p>
	if (error || !event)
		return (
			<div className={styles.page}>
				<p className={styles.error}>
					{error?.message ?? "Ese evento no existe."}
				</p>
				<Link to="/">← Volver a los eventos</Link>
			</div>
		)

	const status = eventStatus(event)
	const isOrganizer = address === event.organizer

	const claim = () =>
		run(
			(publicKey) =>
				attendance.claim(
					{ attendee: publicKey, event_id: eventId },
					{ publicKey },
				),
			"¡Insignia reclamada! Ya es tuya en la blockchain ✦",
		)

	const close = () =>
		run(
			(publicKey) =>
				attendance.close_event(
					{ organizer: publicKey, event_id: eventId },
					{ publicKey },
				),
			"Evento cerrado: ya no se pueden reclamar insignias.",
		)

	const share = () => {
		void navigator.clipboard.writeText(window.location.href)
		addNotification("Enlace copiado: compártelo con los asistentes.", "success")
	}

	return (
		<div className={styles.page}>
			<Link to="/" className={styles.back}>
				← Eventos
			</Link>

			<section className={`card ${styles.detail}`}>
				<BadgeArt
					eventId={event.id}
					name={event.name}
					imageUrl={event.image_url}
					size={160}
					muted={!myBadge && status !== "open"}
				/>
				<div className={styles.detailBody}>
					<span className={`${styles.pill} ${styles[status]}`}>
						{STATUS_LABEL[status]}
					</span>
					<h1>{event.name}</h1>
					{event.description && <p>{event.description}</p>}
					<dl className={styles.facts}>
						{event.location && (
							<>
								<dt>Lugar</dt>
								<dd>{event.location}</dd>
							</>
						)}
						<dt>Reclamo abierto</dt>
						<dd>
							{formatDate(event.starts_at)} → {formatDate(event.ends_at)}
						</dd>
						<dt>Insignias</dt>
						<dd>
							{event.claimed}
							{event.max_claims > 0
								? ` de ${event.max_claims}`
								: " (sin límite)"}
						</dd>
						<dt>Organiza</dt>
						<dd title={event.organizer}>
							{isOrganizer ? "Tú" : shortAddress(event.organizer)}
						</dd>
					</dl>

					<div className={styles.actions}>
						{myBadge ? (
							<p className={styles.owned}>
								✓ Tienes la insignia #{myBadge.number} de este evento (reclamada
								el {formatDate(myBadge.claimed_at)}).
							</p>
						) : !address ? (
							<p className={styles.hint}>
								Inicia sesión arriba para reclamar tu insignia.
							</p>
						) : status === "open" ? (
							<button
								className={styles.primary}
								onClick={() => void claim()}
								disabled={pending}
							>
								{pending ? "Confirma en tu wallet…" : "Reclamar mi insignia"}
							</button>
						) : (
							<p className={styles.hint}>
								{status === "upcoming"
									? `Podrás reclamarla a partir del ${formatDate(event.starts_at)}.`
									: "Este evento ya no entrega insignias."}
							</p>
						)}
						<button onClick={share}>Copiar enlace</button>
						{isOrganizer && !event.closed && status !== "ended" && (
							<button onClick={() => void close()} disabled={pending}>
								Cerrar evento
							</button>
						)}
					</div>
				</div>
			</section>

			<p className={styles.hint}>
				Al reclamar firmas una transacción que registra tu insignia en el
				contrato <code>attendance</code>. Es gratis en testnet (pagas una
				comisión mínima con XLM de prueba) y queda pública para siempre.
			</p>
		</div>
	)
}

export default EventDetail

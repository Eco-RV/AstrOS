import { shortAddress } from "@stellar-scaffold/app-lib"
import { attendance } from "@stellar-scaffold/app-lib/clients"
import { useCallback, useState } from "react"
import { Link, useParams } from "react-router-dom"
import styles from "../attendance/attendance.module.css"
import { BadgeArt } from "../attendance/BadgeArt"
import { Supernova } from "../attendance/Supernova"
import {
	eventStatus,
	formatDate,
	STATUS_LABEL,
	useAttendanceWrite,
	useEvent,
	useMyBadge,
} from "../attendance/useAttendance"
import { useCavosState } from "../cavos/context"
import { useNotification } from "../hooks/useNotification"
import { explorerContract } from "../lib/explorer"

const EventDetail = () => {
	const eventId = Number(useParams().id)
	const { data: event, isLoading, error } = useEvent(eventId)
	const { run, pending, address } = useAttendanceWrite()
	const { data: myBadge } = useMyBadge(eventId, address)
	const { addNotification } = useNotification()
	const cavos = useCavosState()
	const [celebrate, setCelebrate] = useState<number>()
	const closeNova = useCallback(() => setCelebrate(undefined), [])

	if (isLoading)
		return (
			<div className={styles.page}>
				<div className={styles.skeleton} style={{ height: 320 }} />
			</div>
		)
	if (error || !event)
		return (
			<div className={styles.page}>
				<div className={styles.empty}>
					<strong>Este evento se perdió en el espacio</strong>
					<span>{error?.message ?? "Ese evento no existe."}</span>
					<Link to="/" className={styles.linkButton}>
						← Volver a los eventos
					</Link>
				</div>
			</div>
		)

	const status = eventStatus(event)
	const isOrganizer = address === event.organizer
	const percent =
		event.max_claims > 0
			? Math.min(100, (event.claimed / event.max_claims) * 100)
			: undefined

	const claim = async () => {
		const number = await run(
			(publicKey) =>
				attendance.claim(
					{ attendee: publicKey, event_id: eventId },
					{ publicKey },
				),
			"¡Insignia reclamada! ✦",
		)
		if (number !== undefined) setCelebrate(number)
	}

	const close = () =>
		run(
			(publicKey) =>
				attendance.close_event(
					{ organizer: publicKey, event_id: eventId },
					{ publicKey },
				),
			"Evento cerrado: ya no se pueden reclamar insignias.",
		)

	const share = async () => {
		const url = window.location.href
		if ("share" in navigator) {
			try {
				await navigator.share({
					title: event.name,
					text: `Reclama tu insignia de «${event.name}» en AstrOS ✦`,
					url,
				})
				return
			} catch {
				// Cancelled or not allowed: fall back to copying the link.
			}
		}
		await navigator.clipboard.writeText(url)
		addNotification("Enlace copiado: compártelo con los asistentes.", "success")
	}

	const claimClass = `btn-primary ${styles.claimButton} ${styles.stickyClaim}`

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
					size={190}
					muted={!myBadge && status !== "open" && status !== "upcoming"}
					orbit={status === "open" && !myBadge}
				/>
				<div className={styles.detailBody}>
					<span className={`${styles.pill} ${styles[status]}`}>
						{STATUS_LABEL[status]}
					</span>
					<h1>{event.name}</h1>
					{event.description && <p>{event.description}</p>}
					<dl className={styles.facts}>
						<div>
							<dt>Lugar</dt>
							<dd>{event.location || "En línea"}</dd>
						</div>
						<div>
							<dt>Organiza</dt>
							<dd title={event.organizer}>
								{isOrganizer ? "Tú ✦" : shortAddress(event.organizer)}
							</dd>
						</div>
						<div>
							<dt>Desde</dt>
							<dd>{formatDate(event.starts_at)}</dd>
						</div>
						<div>
							<dt>Hasta</dt>
							<dd>{formatDate(event.ends_at)}</dd>
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<dt>Insignias reclamadas</dt>
							<dd>
								{event.claimed}
								{event.max_claims > 0
									? ` de ${event.max_claims}`
									: " · sin límite"}
							</dd>
							{percent !== undefined && (
								<div className={styles.meter} aria-hidden>
									<span style={{ width: `${percent}%` }} />
								</div>
							)}
						</div>
					</dl>

					<div className={styles.actions}>
						{myBadge ? (
							<p className={styles.owned}>
								✓ Tienes la insignia{" "}
								<span className={styles.number}>#{myBadge.number}</span> ·{" "}
								{formatDate(myBadge.claimed_at)}
							</p>
						) : !address ? (
							status === "open" && cavos ? (
								<button className={claimClass} onClick={cavos.signIn}>
									Entra para reclamar tu insignia
								</button>
							) : (
								<p className={styles.hint}>
									Inicia sesión arriba para reclamar tu insignia.
								</p>
							)
						) : status === "open" ? (
							<button
								className={claimClass}
								onClick={() => void claim()}
								disabled={pending}
							>
								{pending ? "Firmando en tu wallet…" : "✦ Reclamar mi insignia"}
							</button>
						) : (
							<p className={styles.hint}>
								{status === "upcoming"
									? `Podrás reclamarla a partir del ${formatDate(event.starts_at)}.`
									: "Este evento ya no entrega insignias."}
							</p>
						)}
						<button onClick={() => void share()}>Compartir</button>
						{isOrganizer && !event.closed && status !== "ended" && (
							<button
								className="btn-ghost"
								onClick={() => void close()}
								disabled={pending}
							>
								Cerrar evento
							</button>
						)}
					</div>
				</div>
			</section>

			<div className={styles.explain}>
				<p>
					Al reclamar firmas una <strong>transacción</strong>: un mensaje que
					registra tu insignia en el contrato <code>attendance</code>. En la red
					de pruebas es gratis (la comisión se paga con XLM de prueba) y queda
					pública:{" "}
					<a
						href={explorerContract(attendance.options.contractId)}
						target="_blank"
						rel="noreferrer"
					>
						míralo en el explorador ↗
					</a>
				</p>
			</div>

			{celebrate !== undefined && (
				<Supernova
					eventId={event.id}
					name={event.name}
					imageUrl={event.image_url}
					number={celebrate}
					onClose={closeNova}
				/>
			)}
		</div>
	)
}

export default EventDetail

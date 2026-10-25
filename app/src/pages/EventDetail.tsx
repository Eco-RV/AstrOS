import { shortAddress } from "@stellar-scaffold/app-lib"
import { attendance } from "@stellar-scaffold/app-lib/clients"
import { useCallback, useState } from "react"
import { Link, useParams } from "react-router-dom"
import styles from "../attendance/attendance.module.css"
import { BadgeArt } from "../attendance/BadgeArt"
import { Gauge } from "../attendance/Gauge"
import { questState, StateChip } from "../attendance/Quest"
import { Supernova } from "../attendance/Supernova"
import {
	eventStatus,
	formatDate,
	useAttendanceWrite,
	useEvent,
	useMyBadge,
} from "../attendance/useAttendance"
import { useNotification } from "../hooks/useNotification"
import { explorerContract } from "../lib/explorer"
import { useMagnetic, useReveal } from "../motion/motion"
import { RiseText } from "../motion/RiseText"

const EventDetail = () => {
	const eventId = Number(useParams().id)
	const { data: event, isLoading, error } = useEvent(eventId)
	const { run, pending, address } = useAttendanceWrite()
	const { data: myBadge } = useMyBadge(eventId, address)
	const { addNotification } = useNotification()
	const [celebrate, setCelebrate] = useState<number>()
	const closeNova = useCallback(() => setCelebrate(undefined), [])
	const magnetic = useMagnetic<HTMLButtonElement>(0.25)
	const explainRef = useReveal<HTMLDivElement>()

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
					<strong>No encontramos este evento</strong>
					<span>
						{error?.message ??
							"Ese evento no existe en el contrato. Revisa el enlace o busca el evento en la lista."}
					</span>
					<Link to="/" className="btn">
						← Volver a los eventos
					</Link>
				</div>
			</div>
		)

	const status = eventStatus(event)
	const state = questState(status, Boolean(myBadge))
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
			"Insignia reclamada. Ya está en tu wallet.",
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
					text: `Reclama tu insignia de «${event.name}» en AstrOS`,
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

	return (
		<div className={styles.page}>
			<Link to="/" className={styles.back}>
				← Eventos
			</Link>

			<section className={`grid ${styles.detail}`}>
				<div className={`cell ${styles.detailArt}`}>
					<BadgeArt
						eventId={event.id}
						name={event.name}
						imageUrl={event.image_url}
						size={220}
						muted={state === "locked"}
						orbit={state === "live"}
					/>
				</div>
				<div className={`cell ${styles.detailBody}`}>
					<StateChip state={state} status={status} />
					<h1 className="title">
						<RiseText text={event.name} />
					</h1>
					{event.description && <p>{event.description}</p>}

					<div className={styles.actions}>
						{myBadge ? (
							<p className={styles.owned}>
								Tienes la insignia{" "}
								<span className={styles.number}>#{myBadge.number}</span> ·{" "}
								{formatDate(myBadge.claimed_at)}
							</p>
						) : status === "open" ? (
							<button
								ref={magnetic}
								className={`btn-alert ${styles.claimButton} ${styles.stickyClaim}`}
								onClick={() => void claim()}
								disabled={pending}
							>
								{pending ? "Firmando en tu wallet…" : "Reclamar insignia ↗"}
							</button>
						) : (
							<p className={styles.hint}>
								{status === "upcoming"
									? `Podrás reclamarla a partir del ${formatDate(event.starts_at)}.`
									: "Este evento ya no entrega insignias."}
							</p>
						)}
						<button onClick={() => void share()}>Compartir</button>
						{isOrganizer && (
							<Link
								to={`/evento/${event.id}/proyectar`}
								className="btn"
								title="QR grande y contador en vivo para el proyector"
							>
								Proyectar
							</Link>
						)}
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

			<section className="slab">
				<div className="wrap">
					<header className="section-head">
						<div>
							<span className="chapter" aria-hidden>
								01
							</span>
							<span className="kicker">Datos del evento</span>
							<h2 className="title">Ficha</h2>
						</div>
						<p>
							Todo lo de esta ficha vive en el contrato y cualquiera lo puede
							verificar.
						</p>
					</header>
					<div className={`grid ${styles.facts}`}>
						<dl className="cell">
							<div>
								<dt>Lugar</dt>
								<dd>{event.location || "En línea"}</dd>
							</div>
							<div>
								<dt>Organiza</dt>
								<dd title={event.organizer}>
									{isOrganizer ? "Tú" : shortAddress(event.organizer)}
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
							<div>
								<dt>Insignias reclamadas</dt>
								<dd>
									{event.claimed}
									{event.max_claims > 0
										? ` de ${event.max_claims}`
										: " · sin límite"}
								</dd>
							</div>
						</dl>
						{percent !== undefined && (
							<div className={`cell ${styles.gaugeCell}`}>
								<Gauge
									value={percent / 100}
									label={`${Math.round(percent)} % del cupo reclamado`}
								/>
							</div>
						)}
					</div>

					<div ref={explainRef} className={styles.explain}>
						<span className="kicker">Qué pasa al reclamar</span>
						<p>
							Al reclamar firmas una <strong>transacción</strong>: un mensaje
							que registra tu insignia en el contrato <code>attendance</code>.
							En la red de pruebas es gratis (la comisión se paga con XLM de
							prueba) y queda pública:{" "}
							<a
								href={explorerContract(attendance.options.contractId)}
								target="_blank"
								rel="noreferrer"
							>
								ver en Stellar Expert ↗
							</a>
						</p>
					</div>
				</div>
			</section>

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

import { Buffer } from "buffer"
import { shortAddress } from "@stellar-scaffold/app-lib"
import { attendance } from "@stellar-scaffold/app-lib/clients"
import { useQuery } from "@tanstack/react-query"
import { ProofMode } from "attendance"
import { useCallback, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
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
import { certificatePath } from "../proof/certificate"
import { fromBase64Url } from "../proof/eventKey"
import { MyAttendanceQr } from "../proof/ProofUi"
import { proofLabel } from "../spaces/catalog"
import saas from "../spaces/saas.module.css"
import { SpaceChip } from "../spaces/SpaceUi"
import {
	metaOf,
	usePendingRequests,
	useEventView,
	useSpace,
} from "../spaces/useSaas"

/** Report reasons (same codes as `report_event`). */
const REASONS = [
	"Contenido ofensivo",
	"Burla o evento sin sentido",
	"Spam",
	"Otro motivo",
]

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
	const { data: view } = useEventView(eventId)
	const meta = metaOf(view)
	const { data: space } = useSpace(meta?.space_id)
	const { data: requests } = usePendingRequests(
		eventId,
		meta?.proof === ProofMode.Aprobacion,
	)
	const { data: member } = useQuery({
		queryKey: ["attendance", "member", meta?.space_id, address],
		enabled: Boolean(address && meta),
		queryFn: async () =>
			(
				await attendance.is_space_member({
					space_id: meta!.space_id,
					address: address!,
				})
			).result,
	})
	// The rotating QR opens this page with ?w=<window>&s=<signature>.
	const [search] = useSearchParams()
	const codeWindow = search.get("w")
	const codeSig = search.get("s")
	const [reason, setReason] = useState<number>()

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

	const claimWithCode = async () => {
		if (!codeWindow || !codeSig) return
		const number = await run(
			(publicKey) =>
				attendance.claim_v2(
					{
						attendee: publicKey,
						event_id: eventId,
						window: BigInt(codeWindow),
						signature: Buffer.from(fromBase64Url(codeSig)),
					},
					{ publicKey },
				),
			"Insignia reclamada. Ya está en tu wallet.",
		)
		if (number !== undefined) setCelebrate(number)
	}

	const requestBadge = () =>
		run(
			(publicKey) =>
				attendance.request_attendance(
					{ attendee: publicKey, event_id: eventId },
					{ publicKey },
				),
			"Solicitud enviada: el organizador la revisará y aprobará tu insignia.",
		)

	const report = async () => {
		if (reason === undefined) return
		await run(
			(publicKey) =>
				attendance.report_event(
					{ reporter: publicKey, event_id: eventId, reason },
					{ publicKey },
				),
			"Gracias: un moderador revisará el evento.",
		)
		setReason(undefined)
	}

	const requested = Boolean(address && requests?.includes(address))
	const canManage = isOrganizer || member === true
	const notYet =
		status === "upcoming"
			? `Podrás reclamarla a partir del ${formatDate(event.starts_at)}.`
			: "Este evento ya no entrega insignias."

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
					<div className={saas.row}>
						<StateChip state={state} status={status} />
						{space && <SpaceChip space={space} />}
						{meta && <span className="chip">{proofLabel(meta.proof)}</span>}
					</div>
					<h1 className="title">
						<RiseText text={event.name} />
					</h1>
					{event.description && <p>{event.description}</p>}

					<div className={styles.actions}>
						{myBadge ? (
							<>
								<p className={styles.owned}>
									Tienes la insignia{" "}
									<span className={styles.number}>#{myBadge.number}</span> ·{" "}
									{formatDate(myBadge.claimed_at)}
								</p>
								<Link
									to={certificatePath(event.id, address!)}
									className="btn btn-primary"
								>
									Ver certificado
								</Link>
							</>
						) : meta?.proof === ProofMode.QrRotativo ? (
							status === "open" && codeWindow && codeSig ? (
								<button
									ref={magnetic}
									className={`btn-alert ${styles.claimButton} ${styles.stickyClaim}`}
									onClick={() => void claimWithCode()}
									disabled={pending}
								>
									{pending ? "Firmando en tu wallet…" : "Reclamar insignia ↗"}
								</button>
							) : (
								<p className={styles.hint}>
									{status === "open"
										? "Escanea el QR que se proyecta en el evento: cambia cada 30 segundos y cada código vale 2 minutos."
										: notYet}
								</p>
							)
						) : meta?.proof === ProofMode.CheckInStaff ? (
							<p className={styles.hint}>
								{status === "open" || status === "upcoming"
									? "Al llegar, muestra tu QR de asistencia al staff: ellos confirman que estuviste aquí."
									: notYet}
							</p>
						) : meta?.proof === ProofMode.Aprobacion ? (
							requested ? (
								<p className={styles.hint}>
									Solicitud enviada. El organizador la revisará y, si estuviste,
									aprobará tu insignia.
								</p>
							) : status === "open" ? (
								<button
									className={`btn-alert ${styles.claimButton}`}
									onClick={() => void requestBadge()}
									disabled={pending}
								>
									{pending ? "Firmando en tu wallet…" : "Pedir mi insignia"}
								</button>
							) : (
								<p className={styles.hint}>{notYet}</p>
							)
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
						{meta && canManage && (
							<Link to={`/organizar/evento/${event.id}`} className="btn">
								Administrar
							</Link>
						)}
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

			{meta?.proof === ProofMode.CheckInStaff &&
				!myBadge &&
				address &&
				(status === "open" || status === "upcoming") && (
					<MyAttendanceQr address={address} />
				)}

			{meta && !canManage && (
				<details className={saas.card}>
					<summary>Reportar este evento</summary>
					<p className={saas.muted}>
						Si el evento es ofensivo, una burla o spam, avísanos. Un moderador
						lo revisará y puede ocultarlo.
					</p>
					<div className={saas.filters} role="group" aria-label="Motivo">
						{REASONS.map((label, i) => (
							<button
								key={label}
								aria-pressed={reason === i}
								onClick={() => setReason(i)}
							>
								{label}
							</button>
						))}
					</div>
					<button
						className="btn-alert"
						disabled={reason === undefined || pending}
						onClick={() => void report()}
					>
						Enviar reporte
					</button>
				</details>
			)}

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

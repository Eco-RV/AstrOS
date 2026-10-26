import { Buffer } from "buffer"
import { StrKey } from "@stellar/stellar-sdk"
import { shortAddress } from "@stellar-scaffold/app-lib"
import { attendance } from "@stellar-scaffold/app-lib/clients"
import { useQuery } from "@tanstack/react-query"
import { ProofMode } from "attendance"
import { useCallback, useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import attendanceStyles from "../attendance/attendance.module.css"
import { questState, StateChip } from "../attendance/Quest"
import {
	eventStatus,
	formatDate,
	useAttendanceWrite,
} from "../attendance/useAttendance"
import { useNotification } from "../hooks/useNotification"
import { useWallet } from "../hooks/useWallet"
import { createEventKey, hasEventKey, toHex } from "../proof/eventKey"
import { QrScanner } from "../proof/ProofUi"
import { BILLING_LABEL, modeLabel, proofLabel } from "../spaces/catalog"
import styles from "../spaces/saas.module.css"
import { SpaceChip } from "../spaces/SpaceUi"
import {
	type EventMeta,
	type EventView,
	metaOf,
	usePendingRequests,
	useSpace,
	useEventView,
} from "../spaces/useSaas"

/** `/organizar/evento/:id`: the tools to vouch for attendance. */
const OrganizeEvent = () => {
	const eventId = Number(useParams().id)
	const { address } = useWallet()
	const { data: view, isLoading, error } = useEventView(eventId)
	const meta = metaOf(view)
	const { data: space } = useSpace(meta?.space_id)
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

	if (isLoading)
		return <div className={attendanceStyles.skeleton} style={{ height: 300 }} />
	if (error || !view || !meta)
		return (
			<p className={styles.warn}>
				{error?.message ??
					"Este evento no tiene herramientas de organizador (fue creado antes de los espacios)."}
			</p>
		)
	const allowed = member === true || view.event.organizer === address
	if (member !== undefined && !allowed)
		return (
			<p className={styles.warn}>
				Solo el organizador o el staff del espacio pueden usar esta página.
			</p>
		)

	const status = eventStatus(view.event)

	return (
		<div className={styles.page}>
			<Link to="/organizar" className={attendanceStyles.back}>
				← Consola
			</Link>
			<header className={styles.head}>
				<div className={styles.row}>
					<StateChip state={questState(status, false)} status={status} />
					{space && <SpaceChip space={space} />}
				</div>
				<h1 className="title">{view.event.name}</h1>
				<p>
					{formatDate(view.event.starts_at)} → {formatDate(view.event.ends_at)}{" "}
					· {modeLabel(meta.mode)} · {proofLabel(meta.proof)} ·{" "}
					{BILLING_LABEL[meta.billing]}
				</p>
				<div className={styles.row}>
					<Link to={`/evento/${eventId}`} className="btn">
						Página pública ↗
					</Link>
					<Link to={`/evento/${eventId}/proyectar`} className="btn">
						Proyectar
					</Link>
				</div>
			</header>

			<div className={styles.statRow}>
				<div className={styles.stat}>
					<span>Insignias</span>
					<strong>
						{view.event.claimed}
						{view.event.max_claims > 0 && ` / ${view.event.max_claims}`}
					</strong>
				</div>
				<div className={styles.stat}>
					<span>Reportes</span>
					<strong>{view.reports}</strong>
				</div>
				<div className={styles.stat}>
					<span>Visible</span>
					<strong>{view.hidden ? "Oculto" : "Sí"}</strong>
				</div>
			</div>

			{meta.proof === ProofMode.CheckInStaff && (
				<CheckInTool eventId={eventId} />
			)}
			{meta.proof === ProofMode.Aprobacion && (
				<ApprovalTool eventId={eventId} />
			)}
			{meta.proof === ProofMode.QrRotativo && (
				<QrKeyTool eventId={eventId} meta={meta} view={view} />
			)}
		</div>
	)
}

/** Scan attendees' QR (or paste an address) and sign their attendance. */
const CheckInTool = ({ eventId }: { eventId: number }) => {
	const { run, pending } = useAttendanceWrite()
	const [scanning, setScanning] = useState(false)
	const [candidate, setCandidate] = useState("")
	const [done, setDone] = useState<{ address: string; number: number }[]>([])
	const valid = StrKey.isValidEd25519PublicKey(candidate.trim())

	const onAddress = useCallback((a: string) => setCandidate(a), [])

	const confirm = async () => {
		const attendee = candidate.trim()
		const number = await run(
			(publicKey) =>
				attendance.attest(
					{ staff: publicKey, event_id: eventId, attendee },
					{ publicKey },
				),
			`Asistencia confirmada: ${shortAddress(attendee)} recibió su insignia.`,
		)
		if (number !== undefined) {
			setDone((d) => [{ address: attendee, number }, ...d])
			setCandidate("")
		}
	}

	return (
		<div className={styles.consoleGrid}>
			<div className={styles.card}>
				<h3>Check-in</h3>
				<p className={styles.muted}>
					Escanea el QR de asistencia de cada persona (lo tiene en su página del
					evento o en “Mi constelación”). Al confirmar, firmas que esa persona
					estuvo aquí.
				</p>
				{scanning ? (
					<QrScanner onAddress={onAddress} paused={Boolean(candidate)} />
				) : (
					<button className="btn-primary" onClick={() => setScanning(true)}>
						Abrir cámara
					</button>
				)}
				<label className={styles.field}>
					Dirección del asistente
					<input
						placeholder="GABC…"
						value={candidate}
						onChange={(e) => setCandidate(e.target.value)}
						aria-invalid={candidate.length > 0 && !valid}
					/>
				</label>
				<div className={styles.row}>
					<button
						className="btn-alert"
						disabled={!valid || pending}
						onClick={() => void confirm()}
					>
						{pending ? "Firmando…" : "Confirmar asistencia"}
					</button>
					{candidate && (
						<button className="btn-ghost" onClick={() => setCandidate("")}>
							Descartar
						</button>
					)}
				</div>
			</div>
			<div className={styles.card}>
				<h3>Confirmados en esta sesión</h3>
				{done.length === 0 ? (
					<p className={styles.muted}>Todavía nadie.</p>
				) : (
					<ul className={styles.list}>
						{done.map((d) => (
							<li key={d.address}>
								<code>{shortAddress(d.address)}</code>
								<span className="chip num">#{d.number}</span>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	)
}

/** Review who asked for their badge (virtual events) and approve them. */
const ApprovalTool = ({ eventId }: { eventId: number }) => {
	const { run, pending } = useAttendanceWrite()
	const { data: requests } = usePendingRequests(eventId)
	const [selected, setSelected] = useState<string[]>([])

	const toggle = (a: string) =>
		setSelected((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]))

	const approve = async () => {
		const batch = selected.slice(0, 50)
		const issued = await run(
			(publicKey) =>
				attendance.approve_attendance(
					{ organizer: publicKey, event_id: eventId, attendees: batch },
					{ publicKey },
				),
			`Aprobaste ${batch.length} ${batch.length === 1 ? "asistencia" : "asistencias"}.`,
		)
		if (issued !== undefined) setSelected([])
	}

	return (
		<div className={styles.card}>
			<h3>Solicitudes de asistencia</h3>
			<p className={styles.muted}>
				Compara esta lista con tu registro (por ejemplo, la asistencia de Zoom)
				y aprueba a quienes sí estuvieron. Puedes aprobar hasta 7 días después
				del evento, de a 50 personas.
			</p>
			{!requests?.length ? (
				<p className={styles.muted}>No hay solicitudes pendientes.</p>
			) : (
				<>
					<ul className={styles.list}>
						{requests.map((a) => (
							<li key={a}>
								<label className={styles.row}>
									<input
										type="checkbox"
										checked={selected.includes(a)}
										onChange={() => toggle(a)}
									/>
									<code>{shortAddress(a)}</code>
								</label>
							</li>
						))}
					</ul>
					<div className={styles.row}>
						<button
							className="btn-ghost"
							onClick={() => setSelected(requests.slice(0, 50))}
						>
							Seleccionar todo
						</button>
						<button
							className="btn-alert"
							disabled={!selected.length || pending}
							onClick={() => void approve()}
						>
							{pending ? "Firmando…" : `Aprobar ${selected.length}`}
						</button>
					</div>
				</>
			)}
		</div>
	)
}

/** Whether this device can project the rotating QR, and how to fix it. */
const QrKeyTool = ({
	eventId,
	meta,
	view,
}: {
	eventId: number
	meta: EventMeta
	view: EventView
}) => {
	const { run, pending } = useAttendanceWrite()
	const { addNotification } = useNotification()
	const keyHex = meta.event_key ? toHex(meta.event_key) : undefined
	const [here, setHere] = useState<boolean>()

	useEffect(() => {
		if (!keyHex) return setHere(false)
		void hasEventKey(keyHex).then(setHere)
	}, [keyHex])

	const newKey = async () => {
		try {
			const publicKey = await createEventKey()
			await run(
				(signer) =>
					attendance.rotate_event_key(
						{
							organizer: signer,
							event_id: eventId,
							event_key: Buffer.from(publicKey),
						},
						{ publicKey: signer },
					),
				"Llave nueva lista: ya puedes proyectar desde este dispositivo.",
			)
		} catch {
			addNotification(
				"Este navegador no puede crear la llave del QR. Usa Chrome, Edge, Firefox o Safari actualizados.",
				"error",
			)
		}
	}

	return (
		<div className={styles.card}>
			<h3>QR rotativo</h3>
			{here ? (
				<>
					<p className={styles.muted}>
						Este dispositivo tiene la llave del evento. Abre el proyector: el QR
						cambia cada 30 segundos y cada código vale 2 minutos.
					</p>
					<Link to={`/evento/${eventId}/proyectar`} className="btn btn-primary">
						Abrir proyector
					</Link>
				</>
			) : (
				<>
					<p className={styles.muted}>
						La llave del QR no está en este dispositivo (se creó en otro, o
						borraste los datos del navegador). Crea una nueva aquí: la anterior
						deja de servir.
					</p>
					<button
						className="btn-primary"
						disabled={pending || view.event.closed}
						onClick={() => void newKey()}
					>
						{pending ? "Firmando…" : "Crear llave en este dispositivo"}
					</button>
				</>
			)}
		</div>
	)
}

export default OrganizeEvent

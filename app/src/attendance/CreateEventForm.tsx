import { Buffer } from "buffer"
import { attendance } from "@stellar-scaffold/app-lib/clients"
import { AttendMode, BillingKind, type EventInput, ProofMode } from "attendance"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { tokenSymbol } from "../billing/usdc"
import { contentProblem } from "../lib/moderation"
import { createEventKey, supportsEventKeys } from "../proof/eventKey"
import {
	attendeesLabel,
	formatAmount,
	MODES,
	PROOF_MODES,
} from "../spaces/catalog"
import saas from "../spaces/saas.module.css"
import { usePricing, useQuote } from "../spaces/useSaas"
import styles from "./attendance.module.css"
import { BadgeArt } from "./BadgeArt"
import { PhotoPicker } from "./PhotoPicker"
import { formatDate, useAttendanceWrite } from "./useAttendance"

/** Date → value for <input type="datetime-local"> (local time). */
const toLocalInput = (d: Date) => {
	const pad = (n: number) => String(n).padStart(2, "0")
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const toSeconds = (local: string) =>
	BigInt(Math.floor(new Date(local).getTime() / 1000))

type Preset = "now" | "today" | "tomorrow" | "custom"

/** Claim window for each quick option. */
const presetRange = (preset: Exclude<Preset, "custom">): [Date, Date] => {
	const now = new Date()
	if (preset === "now") return [now, new Date(now.getTime() + 2 * 3600_000)]
	if (preset === "today") {
		const end = new Date(now)
		end.setHours(23, 59, 0, 0)
		return [now, end]
	}
	const start = new Date(now)
	start.setDate(start.getDate() + 1)
	start.setHours(9, 0, 0, 0)
	const end = new Date(start)
	end.setHours(18, 0, 0, 0)
	return [start, end]
}

const PRESETS: { id: Preset; label: string }[] = [
	{ id: "now", label: "Ahora · 2 h" },
	{ id: "today", label: "Todo el día de hoy" },
	{ id: "tomorrow", label: "Mañana" },
	{ id: "custom", label: "Personalizado" },
]

/**
 * Create an event v2 inside `spaceId`: proof method, mode and billing. For the
 * rotating QR it creates the event key on this device before signing.
 */
export const CreateEventForm = ({ spaceId }: { spaceId: number }) => {
	const navigate = useNavigate()
	const { run, pending } = useAttendanceWrite()
	const [name, setName] = useState("")
	const [description, setDescription] = useState("")
	const [location, setLocation] = useState("")
	const [imageUrl, setImageUrl] = useState("")
	const [photoPreview, setPhotoPreview] = useState("")
	const [uploading, setUploading] = useState(false)
	const [preset, setPreset] = useState<Preset>("now")
	const [startsAt, setStartsAt] = useState(() => toLocalInput(new Date()))
	const [endsAt, setEndsAt] = useState(() =>
		toLocalInput(new Date(Date.now() + 2 * 3600_000)),
	)
	const [maxClaims, setMaxClaims] = useState("")
	const [mode, setMode] = useState<AttendMode>(AttendMode.Presencial)
	const [proof, setProof] = useState<ProofMode>(ProofMode.CheckInStaff)
	const { data: pricing } = usePricing()
	// The price depends on the size: ask the contract for the exact quote.
	const { data: quote, error: quoteError } = useQuote(
		spaceId,
		Number(maxClaims) || 0,
	)
	const symbol = tokenSymbol(pricing?.token)
	const problem = contentProblem(name, description, location)
	const paid = quote?.kind === BillingKind.Single

	// Virtual events can only use approval; the QR and check-in need a room.
	const chooseMode = (m: AttendMode) => {
		setMode(m)
		if (m === AttendMode.Virtual) setProof(ProofMode.Aprobacion)
		else if (proof === ProofMode.Aprobacion) setProof(ProofMode.CheckInStaff)
	}

	const choose = (p: Preset) => {
		setPreset(p)
		if (p === "custom") return
		const [start, end] = presetRange(p)
		setStartsAt(toLocalInput(start))
		setEndsAt(toLocalInput(end))
	}

	const submit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (problem) return
		let eventKey: Buffer | undefined
		if (proof === ProofMode.QrRotativo) {
			if (!(await supportsEventKeys())) {
				alert(
					"Este navegador no puede crear la llave del QR. Usa Chrome, Edge, Firefox o Safari actualizados, o elige el check-in del staff.",
				)
				return
			}
			eventKey = Buffer.from(await createEventKey())
		}
		// Quick presets are computed again at submit time so "now" is really now.
		const [start, end] =
			preset === "custom"
				? [toSeconds(startsAt), toSeconds(endsAt)]
				: (presetRange(preset).map((d) =>
						BigInt(Math.floor(d.getTime() / 1000)),
					) as [bigint, bigint])
		const id = await run(
			(publicKey) =>
				attendance.create_event_v2(
					{
						organizer: publicKey,
						space_id: spaceId,
						input: {
							name: name.trim(),
							description: description.trim(),
							location: location.trim(),
							image_url: imageUrl.trim(),
							starts_at: start,
							ends_at: end,
							max_claims: Number(maxClaims) || 0,
							mode,
							proof,
							// The local client types an empty Option as `undefined`, the CI one
							// (stellar-js) as `null`; the SDK sends either as "none".
							event_key: eventKey as EventInput["event_key"],
						},
					},
					{ publicKey },
				),
			"Evento creado en la blockchain.",
		)
		if (id !== undefined) void navigate(`/organizar/evento/${id}`)
	}

	return (
		<form className={styles.createLayout} onSubmit={(e) => void submit(e)}>
			<div className={`grid ${styles.form}`}>
				<fieldset className={styles.fieldset}>
					<legend>1 · Foto de la insignia</legend>
					<PhotoPicker
						onChange={setImageUrl}
						onPreview={setPhotoPreview}
						onBusyChange={setUploading}
					/>
					{!photoPreview && (
						<details className={styles.advanced}>
							<summary>¿Ya tienes la imagen en internet?</summary>
							<label>
								Enlace de la imagen
								<input
									maxLength={200}
									placeholder="https://… o ipfs://…"
									value={imageUrl}
									onChange={(e) => setImageUrl(e.target.value)}
								/>
							</label>
						</details>
					)}
				</fieldset>

				<fieldset className={styles.fieldset}>
					<legend>2 · ¿Qué evento es?</legend>
					<label>
						Nombre *
						<input
							required
							maxLength={60}
							placeholder="Ej.: Clase de Stellar · sábado"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
						<span className={styles.counter}>{name.length}/60</span>
					</label>
					<label>
						Descripción
						<textarea
							maxLength={280}
							rows={3}
							placeholder="De qué trata (opcional)"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
						<span className={styles.counter}>{description.length}/280</span>
					</label>
					<label>
						Lugar
						<input
							maxLength={100}
							placeholder="Ciudad, sede o «En línea»"
							value={location}
							onChange={(e) => setLocation(e.target.value)}
						/>
					</label>
				</fieldset>

				<fieldset className={styles.fieldset}>
					<legend>3 · ¿Cuándo se puede reclamar?</legend>
					<div className={styles.presets}>
						{PRESETS.map((p) => (
							<button
								key={p.id}
								type="button"
								aria-pressed={preset === p.id}
								onClick={() => choose(p.id)}
							>
								{p.label}
							</button>
						))}
					</div>
					{preset === "custom" ? (
						<div className={styles.row}>
							<label>
								Desde *
								<input
									type="datetime-local"
									required
									value={startsAt}
									onChange={(e) => setStartsAt(e.target.value)}
								/>
							</label>
							<label>
								Hasta *
								<input
									type="datetime-local"
									required
									value={endsAt}
									onChange={(e) => setEndsAt(e.target.value)}
								/>
							</label>
						</div>
					) : (
						<p className={styles.hint} style={{ margin: 0 }}>
							Del {formatDate(new Date(startsAt).getTime() / 1000)} al{" "}
							{formatDate(new Date(endsAt).getTime() / 1000)}
						</p>
					)}
					<label>
						¿Cuántos asistentes esperas?
						<input
							type="number"
							inputMode="numeric"
							min={0}
							placeholder={
								pricing
									? `Hasta ${pricing.free_claims_per_event} es gratis`
									: "Sin límite"
							}
							value={maxClaims}
							onChange={(e) => setMaxClaims(e.target.value)}
						/>
					</label>
					<p className={styles.hint} style={{ margin: 0 }}>
						Es el máximo de insignias del evento: el precio depende de este
						número.
					</p>
				</fieldset>

				<fieldset className={styles.fieldset}>
					<legend>4 · ¿Cómo se comprueba la asistencia?</legend>
					<div className={saas.filters} role="group" aria-label="Modalidad">
						{MODES.map((m) => (
							<button
								key={m.id}
								type="button"
								aria-pressed={mode === m.id}
								onClick={() => chooseMode(m.id)}
							>
								{m.label}
							</button>
						))}
					</div>
					<div className={saas.choices} role="group" aria-label="Método">
						{PROOF_MODES.filter((p) =>
							mode === AttendMode.Virtual
								? p.id === ProofMode.Aprobacion
								: mode === AttendMode.Presencial
									? p.id !== ProofMode.Aprobacion
									: true,
						).map((p) => (
							<button
								key={p.id}
								type="button"
								className={saas.choice}
								aria-pressed={proof === p.id}
								onClick={() => setProof(p.id)}
							>
								<strong>{p.label}</strong>
								<small>{p.hint}</small>
							</button>
						))}
					</div>
					{proof === ProofMode.QrRotativo && (
						<p className={styles.hint} style={{ margin: 0 }}>
							La llave que firma el QR se crea en este navegador y no sale de
							él. Proyecta desde este dispositivo; desde otro tendrás que crear
							una llave nueva.
						</p>
					)}
				</fieldset>

				<p className={styles.hint} style={{ margin: 0 }}>
					Todo lo que escribas queda público en la blockchain y no se puede
					borrar: no incluyas datos personales.
				</p>
				{problem && <p className={saas.warn}>{problem}</p>}
				{quoteError && <p className={saas.warn}>{quoteError.message}</p>}
				{pricing && quote && (
					<p className={saas.note}>
						{quote.kind === BillingKind.Single
							? `Evento único ${attendeesLabel(quote.max_claims)}: ${formatAmount(quote.cost, symbol)}, se cobra en la misma firma. Con el plan mensual no pagas por evento.`
							: quote.kind === BillingKind.Plan
								? `Lo cubre tu plan mensual: ${attendeesLabel(quote.max_claims)}.`
								: `Evento gratis, ${attendeesLabel(quote.max_claims)}.`}
					</p>
				)}
				<div className={styles.submitBar}>
					<button
						type="submit"
						className={`btn-primary ${styles.claimButton}`}
						disabled={
							pending || uploading || Boolean(problem) || Boolean(quoteError)
						}
					>
						{pending
							? "Firmando en tu wallet…"
							: uploading
								? "Subiendo la foto…"
								: paid && quote
									? `Crear y pagar ${formatAmount(quote.cost, symbol)}`
									: "Crear evento"}
					</button>
				</div>
			</div>

			<aside className={styles.preview} aria-label="Vista previa">
				<BadgeArt
					eventId={name.length}
					name={name || "?"}
					imageUrl={photoPreview || imageUrl.trim()}
					size={120}
					orbit
				/>
				<div>
					<strong>{name || "Tu evento"}</strong>
					<p className={styles.meta}>
						{location || "En línea"} · así se verá la insignia
					</p>
				</div>
			</aside>
		</form>
	)
}

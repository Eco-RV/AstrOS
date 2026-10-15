import { attendance } from "@stellar-scaffold/app-lib/clients"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import styles from "./attendance.module.css"
import { BadgeArt } from "./BadgeArt"
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

export const CreateEventForm = () => {
	const navigate = useNavigate()
	const { run, pending } = useAttendanceWrite()
	const [name, setName] = useState("")
	const [description, setDescription] = useState("")
	const [location, setLocation] = useState("")
	const [imageUrl, setImageUrl] = useState("")
	const [preset, setPreset] = useState<Preset>("now")
	const [startsAt, setStartsAt] = useState(() => toLocalInput(new Date()))
	const [endsAt, setEndsAt] = useState(() =>
		toLocalInput(new Date(Date.now() + 2 * 3600_000)),
	)
	const [maxClaims, setMaxClaims] = useState("")

	const choose = (p: Preset) => {
		setPreset(p)
		if (p === "custom") return
		const [start, end] = presetRange(p)
		setStartsAt(toLocalInput(start))
		setEndsAt(toLocalInput(end))
	}

	const submit = async (e: React.FormEvent) => {
		e.preventDefault()
		// Quick presets are computed again at submit time so "now" is really now.
		const [start, end] =
			preset === "custom"
				? [toSeconds(startsAt), toSeconds(endsAt)]
				: (presetRange(preset).map((d) =>
						BigInt(Math.floor(d.getTime() / 1000)),
					) as [bigint, bigint])
		const id = await run(
			(publicKey) =>
				attendance.create_event(
					{
						organizer: publicKey,
						name: name.trim(),
						description: description.trim(),
						location: location.trim(),
						image_url: imageUrl.trim(),
						starts_at: start,
						ends_at: end,
						max_claims: Number(maxClaims) || 0,
					},
					{ publicKey },
				),
			"Tu evento ya brilla en la blockchain ✦",
		)
		if (id !== undefined) void navigate(`/evento/${id}`)
	}

	return (
		<form className={styles.createLayout} onSubmit={(e) => void submit(e)}>
			<div className={`card ${styles.form}`}>
				<fieldset className={styles.fieldset}>
					<legend>1 · ¿Qué evento es?</legend>
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
					<div className={styles.row}>
						<label>
							Lugar
							<input
								maxLength={100}
								placeholder="Ciudad, sede o «En línea»"
								value={location}
								onChange={(e) => setLocation(e.target.value)}
							/>
						</label>
						<label>
							Imagen de la insignia
							<input
								maxLength={200}
								placeholder="https://… o ipfs://… (opcional)"
								value={imageUrl}
								onChange={(e) => setImageUrl(e.target.value)}
							/>
						</label>
					</div>
				</fieldset>

				<fieldset className={styles.fieldset}>
					<legend>2 · ¿Cuándo se puede reclamar?</legend>
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
						Máximo de insignias
						<input
							type="number"
							inputMode="numeric"
							min={0}
							placeholder="Sin límite"
							value={maxClaims}
							onChange={(e) => setMaxClaims(e.target.value)}
						/>
					</label>
				</fieldset>

				<p className={styles.hint} style={{ margin: 0 }}>
					Todo lo que escribas queda público en la blockchain y no se puede
					borrar: no incluyas datos personales.
				</p>
				<div className={styles.submitBar}>
					<button
						type="submit"
						className={`btn-primary ${styles.claimButton}`}
						disabled={pending}
					>
						{pending ? "Firmando en tu wallet…" : "✦ Crear evento"}
					</button>
				</div>
			</div>

			<aside className={`card ${styles.preview}`} aria-label="Vista previa">
				<BadgeArt
					eventId={name.length}
					name={name || "?"}
					imageUrl={imageUrl.trim()}
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

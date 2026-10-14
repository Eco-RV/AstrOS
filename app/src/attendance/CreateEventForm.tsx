import { attendance } from "@stellar-scaffold/app-lib/clients"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import styles from "./attendance.module.css"
import { useAttendanceWrite } from "./useAttendance"

/** Date → value for <input type="datetime-local"> (local time). */
const toLocalInput = (d: Date) => {
	const pad = (n: number) => String(n).padStart(2, "0")
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const toSeconds = (local: string) =>
	BigInt(Math.floor(new Date(local).getTime() / 1000))

export const CreateEventForm = ({ onDone }: { onDone?: () => void }) => {
	const navigate = useNavigate()
	const { run, pending } = useAttendanceWrite()
	const [name, setName] = useState("")
	const [description, setDescription] = useState("")
	const [location, setLocation] = useState("")
	const [imageUrl, setImageUrl] = useState("")
	const [startsAt, setStartsAt] = useState(() => toLocalInput(new Date()))
	const [endsAt, setEndsAt] = useState(() =>
		toLocalInput(new Date(Date.now() + 3 * 3600 * 1000)),
	)
	const [maxClaims, setMaxClaims] = useState("")

	const submit = async (e: React.FormEvent) => {
		e.preventDefault()
		const id = await run(
			(publicKey) =>
				attendance.create_event(
					{
						organizer: publicKey,
						name: name.trim(),
						description: description.trim(),
						location: location.trim(),
						image_url: imageUrl.trim(),
						starts_at: toSeconds(startsAt),
						ends_at: toSeconds(endsAt),
						max_claims: Number(maxClaims) || 0,
					},
					{ publicKey },
				),
			"Evento creado en la blockchain 🎉",
		)
		if (id !== undefined) {
			onDone?.()
			void navigate(`/evento/${id}`)
		}
	}

	return (
		<form className={styles.form} onSubmit={(e) => void submit(e)}>
			<label>
				Nombre del evento *
				<input
					required
					maxLength={60}
					placeholder="Ej.: Meetup Stellar Costa Rica"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
			</label>
			<label>
				Descripción
				<textarea
					maxLength={280}
					rows={2}
					placeholder="De qué trata (máx. 280 caracteres)"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
				/>
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
					Imagen de la insignia (URL)
					<input
						type="url"
						maxLength={200}
						placeholder="https://… (opcional)"
						value={imageUrl}
						onChange={(e) => setImageUrl(e.target.value)}
					/>
				</label>
			</div>
			<div className={styles.row}>
				<label>
					Se puede reclamar desde *
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
				<label>
					Máximo de insignias
					<input
						type="number"
						min={0}
						placeholder="Sin límite"
						value={maxClaims}
						onChange={(e) => setMaxClaims(e.target.value)}
					/>
				</label>
			</div>
			<p className={styles.hint}>
				Todo lo que escribas aquí queda público en la blockchain y no se puede
				borrar: no incluyas datos personales. La imagen solo se guarda como
				enlace.
			</p>
			<button type="submit" className={styles.primary} disabled={pending}>
				{pending ? "Confirma en tu wallet…" : "Crear evento"}
			</button>
		</form>
	)
}

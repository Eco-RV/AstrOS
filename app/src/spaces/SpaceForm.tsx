import { attendance } from "@stellar-scaffold/app-lib/clients"
import { Category } from "attendance"
import { useState } from "react"
import { PhotoPicker } from "../attendance/PhotoPicker"
import { useAttendanceWrite } from "../attendance/useAttendance"
import { contentProblem } from "../lib/moderation"
import { ACCENTS, CATEGORIES } from "./catalog"
import styles from "./saas.module.css"

/** "Barbería Central" → "barberia-central" */
export const slugify = (text: string) =>
	text
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 32)

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/

/** Create a space for a business. Calls `onCreated` with the new id. */
export const SpaceForm = ({
	onCreated,
}: {
	onCreated: (id: number) => void
}) => {
	const { run, pending } = useAttendanceWrite()
	const [name, setName] = useState("")
	const [slug, setSlug] = useState("")
	const [slugEdited, setSlugEdited] = useState(false)
	const [description, setDescription] = useState("")
	const [category, setCategory] = useState<Category>(Category.Comunidad)
	const [accent, setAccent] = useState(0)
	const [logoUrl, setLogoUrl] = useState("")
	const [uploading, setUploading] = useState(false)

	const finalSlug = slugEdited ? slug : slugify(name)
	const problem =
		contentProblem(name, description, finalSlug) ??
		(finalSlug && !SLUG_RE.test(finalSlug)
			? "El enlace debe tener de 3 a 32 caracteres: minúsculas, números o guiones."
			: null)

	const submit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (problem) return
		const id = await run(
			(publicKey) =>
				attendance.create_space(
					{
						owner: publicKey,
						slug: finalSlug,
						name: name.trim(),
						description: description.trim(),
						category,
						logo_url: logoUrl,
						accent,
					},
					{ publicKey },
				),
			"Espacio creado. Un moderador lo revisará para mostrarlo en el inicio.",
		)
		if (id !== undefined) onCreated(id)
	}

	return (
		<form className={styles.form} onSubmit={(e) => void submit(e)}>
			<label>
				Nombre del negocio *
				<input
					required
					maxLength={60}
					placeholder="Barbería Central"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
			</label>
			<label>
				Enlace de tu espacio
				<span className={styles.slugInput}>
					<span>/s/</span>
					<input
						required
						maxLength={32}
						placeholder="barberia-central"
						value={finalSlug}
						onChange={(e) => {
							setSlugEdited(true)
							setSlug(slugify(e.target.value))
						}}
					/>
				</span>
			</label>

			<div className={styles.field}>
				Categoría
				<div className={styles.choices} role="group" aria-label="Categoría">
					{CATEGORIES.map((c) => (
						<button
							key={c.id}
							type="button"
							className={styles.choice}
							aria-pressed={category === c.id}
							onClick={() => setCategory(c.id)}
						>
							<strong>{c.label}</strong>
							<small>{c.hint}</small>
						</button>
					))}
				</div>
			</div>

			<label>
				Descripción
				<textarea
					maxLength={280}
					rows={3}
					placeholder="Qué hace tu negocio y qué eventos organizas"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
				/>
			</label>

			<div className={styles.field}>
				Color de tu espacio
				<div className={styles.accents} role="group" aria-label="Color">
					{ACCENTS.map((a, i) => (
						<button
							key={a.name}
							type="button"
							className={styles.accent}
							style={{ "--swatch": a.color } as React.CSSProperties}
							aria-pressed={accent === i}
							aria-label={a.name}
							title={a.name}
							onClick={() => setAccent(i)}
						/>
					))}
				</div>
			</div>

			<div className={styles.field}>
				Logo (opcional)
				<PhotoPicker
					onChange={setLogoUrl}
					onPreview={() => undefined}
					onBusyChange={setUploading}
				/>
			</div>

			{problem && name && <p className={styles.warn}>{problem}</p>}
			<p className={styles.note}>
				Los datos del espacio son públicos y quedan en la blockchain. Tu espacio
				aparece en el inicio cuando un moderador lo verifica; mientras tanto
				funciona con su enlace.
			</p>
			<div className={styles.row}>
				<button
					type="submit"
					className="btn-primary"
					disabled={pending || uploading || Boolean(problem) || !name.trim()}
				>
					{pending ? "Firmando en tu wallet…" : "Crear espacio"}
				</button>
			</div>
		</form>
	)
}

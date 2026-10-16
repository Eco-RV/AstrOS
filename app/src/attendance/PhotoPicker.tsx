import { useEffect, useRef, useState } from "react"
import { imageSrc } from "../lib/ipfs"
import { compressPhoto, uploadPhoto } from "../lib/photo"
import styles from "./attendance.module.css"

type Phase = "empty" | "uploading" | "done" | "error"

/**
 * Pick a photo (camera or gallery on phones), shrink it, and pin it to IPFS
 * right away so creating the event is instant. Reports the `ipfs://<CID>` with
 * `onChange` and a local preview URL with `onPreview`.
 */
export const PhotoPicker = ({
	onChange,
	onPreview,
	onBusyChange,
}: {
	onChange: (uri: string) => void
	onPreview: (url: string) => void
	onBusyChange: (busy: boolean) => void
}) => {
	const input = useRef<HTMLInputElement>(null)
	const [phase, setPhase] = useState<Phase>("empty")
	const [preview, setPreview] = useState<string>()
	const [error, setError] = useState<string>()
	const [last, setLast] = useState<Blob>()
	const [uri, setUri] = useState<string>()

	// Free the local preview when it changes or the form goes away.
	useEffect(
		() => () => {
			if (preview) URL.revokeObjectURL(preview)
		},
		[preview],
	)

	const upload = async (photo: Blob) => {
		setPhase("uploading")
		setError(undefined)
		onBusyChange(true)
		try {
			const result = await uploadPhoto(photo)
			setUri(result)
			onChange(result)
			setPhase("done")
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e))
			onChange("")
			setPhase("error")
		} finally {
			onBusyChange(false)
		}
	}

	const pick = async (file?: File) => {
		if (!file) return
		try {
			const photo = await compressPhoto(file)
			const url = URL.createObjectURL(photo)
			setPreview(url)
			onPreview(url)
			setLast(photo)
			await upload(photo)
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e))
			setPhase("error")
		}
	}

	const clear = () => {
		setPreview(undefined)
		setUri(undefined)
		setLast(undefined)
		setPhase("empty")
		onPreview("")
		onChange("")
		if (input.current) input.current.value = ""
	}

	return (
		<div className={styles.photoPicker}>
			<button
				type="button"
				className={`${styles.photoDrop} ${styles[`photo_${phase}`] ?? ""}`}
				onClick={() => input.current?.click()}
				disabled={phase === "uploading"}
				aria-label={preview ? "Cambiar la foto" : "Tomar o elegir una foto"}
			>
				{preview ? (
					<img src={preview} alt="" />
				) : (
					<span className={styles.photoEmpty}>
						<svg
							viewBox="0 0 24 24"
							width="34"
							height="34"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.8"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden
						>
							<path d="M4 8h3l2-3h6l2 3h3v11H4z" />
							<circle cx="12" cy="13" r="3.5" />
						</svg>
						Toma o elige
						<br />
						una foto
					</span>
				)}
			</button>
			<input
				ref={input}
				type="file"
				accept="image/*"
				hidden
				onChange={(e) => void pick(e.target.files?.[0])}
			/>
			<div className={styles.photoStatus} aria-live="polite">
				{phase === "empty" && (
					<small>
						Opcional. Se recorta en círculo y se guarda en IPFS, una red de
						archivos pública: no subas fotos de otras personas sin permiso.
					</small>
				)}
				{phase === "uploading" && (
					<strong className={styles.uploading}>Subiendo a IPFS…</strong>
				)}
				{phase === "done" && uri && (
					<>
						<strong className={styles.uploaded}>✓ Guardada en IPFS</strong>
						<a href={imageSrc(uri)} target="_blank" rel="noreferrer">
							<code>{uri.slice(7, 19)}…</code> ↗
						</a>
					</>
				)}
				{phase === "error" && (
					<>
						<strong className={styles.error}>{error}</strong>
						{last && (
							<button type="button" onClick={() => void upload(last)}>
								Reintentar
							</button>
						)}
					</>
				)}
				{preview && phase !== "uploading" && (
					<button type="button" className="btn-ghost" onClick={clear}>
						Quitar foto
					</button>
				)}
			</div>
		</div>
	)
}

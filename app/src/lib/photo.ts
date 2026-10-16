/**
 * Photos for event badges: shrink them in the browser (phones take 3–12 MB
 * photos; the classroom Wi-Fi won't like 30 of those), then send them to our
 * /api/upload function, which pins them to IPFS through Pinata.
 */

const MAX_SIDE = 800
const QUALITY = 0.82

/** Square-ish JPEG of at most 800 px per side (~80–200 KB). */
export async function compressPhoto(file: File): Promise<Blob> {
	if (!file.type.startsWith("image/"))
		throw new Error("Ese archivo no es una imagen.")
	// createImageBitmap applies the EXIF rotation of phone photos.
	const bitmap = await createImageBitmap(file, {
		imageOrientation: "from-image",
	})
	const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
	const canvas = document.createElement("canvas")
	canvas.width = Math.round(bitmap.width * scale)
	canvas.height = Math.round(bitmap.height * scale)
	const ctx = canvas.getContext("2d")
	if (!ctx) throw new Error("Tu navegador no pudo procesar la foto.")
	ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
	bitmap.close()
	const blob = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(resolve, "image/jpeg", QUALITY),
	)
	if (!blob) throw new Error("Tu navegador no pudo procesar la foto.")
	return blob
}

/** Upload a compressed photo; returns the `ipfs://<CID>` to store on-chain. */
export async function uploadPhoto(photo: Blob): Promise<string> {
	const form = new FormData()
	form.append("file", photo, "foto.jpg")
	let res: Response
	try {
		res = await fetch("/api/upload", { method: "POST", body: form })
	} catch {
		throw new Error("Sin conexión: no se pudo subir la foto.")
	}
	const body = (await res.json().catch(() => ({}))) as {
		uri?: string
		error?: string
	}
	if (!res.ok || !body.uri)
		throw new Error(body.error ?? `No se pudo subir la foto (${res.status}).`)
	return body.uri
}

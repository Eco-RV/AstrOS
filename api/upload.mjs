// Vercel function: POST /api/upload
//
// Receives one image (multipart field "file", already compressed by the
// browser) and pins it to the PUBLIC IPFS network through Pinata. Replies with
// { cid, uri: "ipfs://<cid>" }; the app stores that uri in the contract.
//
// PINATA_JWT is a secret: it lives only here (Vercel env var, or app/.env.local
// for `npm start`), never in a PUBLIC_* variable.
//
// The same handler runs in local dev through the Vite middleware in
// app/vite.config.ts.

const PINATA_UPLOAD_URL = "https://uploads.pinata.cloud/v3/files"
export const MAX_BYTES = 2 * 1024 * 1024

const json = (status, body) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	})

/** Check the real file type from its first bytes (not the declared one). */
function imageKind(bytes) {
	const b = bytes
	if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg"
	if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
		return "png"
	if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "gif"
	const ascii = (from, to) => String.fromCharCode(...b.slice(from, to))
	if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp"
	return null
}

export async function POST(request) {
	const jwt = process.env.PINATA_JWT
	if (!jwt || jwt === "undefined") {
		return json(500, {
			error:
				"Falta PINATA_JWT en el servidor: la subida de fotos no está configurada.",
		})
	}

	let file
	try {
		file = (await request.formData()).get("file")
	} catch {
		return json(400, { error: "No se recibió ninguna foto." })
	}
	if (!file || typeof file === "string") {
		return json(400, { error: "No se recibió ninguna foto." })
	}
	if (file.size > MAX_BYTES) {
		return json(413, { error: "La foto pesa más de 2 MB." })
	}

	const bytes = new Uint8Array(await file.arrayBuffer())
	const kind = imageKind(bytes)
	if (!kind) {
		return json(415, {
			error: "Solo se aceptan imágenes JPG, PNG, WebP o GIF.",
		})
	}

	const form = new FormData()
	form.append(
		"file",
		new Blob([bytes], { type: `image/${kind === "jpg" ? "jpeg" : kind}` }),
		`astros-${Date.now()}.${kind}`,
	)
	form.append("network", "public")
	form.append("keyvalues", JSON.stringify({ app: "astros" }))

	const res = await fetch(PINATA_UPLOAD_URL, {
		method: "POST",
		headers: { Authorization: `Bearer ${jwt}` },
		body: form,
	})
	if (!res.ok) {
		const detail = (await res.text()).slice(0, 200)
		console.error(`Pinata upload failed: ${res.status} ${detail}`)
		return json(502, {
			error:
				res.status === 401 || res.status === 403
					? "Pinata rechazó la credencial del servidor."
					: "Pinata no pudo guardar la foto. Inténtalo de nuevo.",
		})
	}

	const cid = (await res.json())?.data?.cid
	if (!cid) return json(502, { error: "Pinata no devolvió el CID." })
	return json(200, { cid, uri: `ipfs://${cid}` })
}

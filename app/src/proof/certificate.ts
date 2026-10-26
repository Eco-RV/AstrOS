import { toHex } from "./eventKey"

/**
 * Certificate names never go on-chain. The attendee picks the name and a
 * random salt; only sha256(name + "\0" + salt) is stored (`set_name_hash`).
 * The salt travels in the certificate link (`#n=…&s=…`), so whoever has the
 * link can check the name, and nobody can guess it from the chain.
 */

export const newSalt = () => toHex(crypto.getRandomValues(new Uint8Array(16)))

export const nameHash = async (name: string, salt: string) =>
	new Uint8Array(
		await crypto.subtle.digest(
			"SHA-256",
			new TextEncoder().encode(`${name.trim()}\u0000${salt}`),
		),
	)

export const certificatePath = (
	eventId: number,
	address: string,
	name?: string,
	salt?: string,
) => {
	const base = `/certificado/${eventId}/${address}`
	return name && salt
		? `${base}#n=${encodeURIComponent(name.trim())}&s=${salt}`
		: base
}

/** Read `#n=…&s=…` from the certificate link. */
export const readCertificateHash = (hash: string) => {
	const params = new URLSearchParams(hash.replace(/^#/, ""))
	const name = params.get("n") ?? undefined
	const salt = params.get("s") ?? undefined
	return { name, salt }
}

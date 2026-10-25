/**
 * Event keys for the rotating QR (proof mode "QrRotativo").
 *
 * The organizer's browser creates an Ed25519 key pair with WebCrypto. The
 * private key is **non-extractable**: not even this code can read it, it can
 * only sign. It is kept in IndexedDB on this device, keyed by its public key;
 * only the public key goes on-chain (`EventMeta.event_key`). It controls no
 * funds: it only signs "this code is fresh" for one event.
 *
 * What gets signed (must match `proof_message` in contracts/attendance):
 * "astros:" + event id (u32, big endian) + window (u64, big endian), where a
 * window is 30 seconds of unix time.
 */

export const PROOF_WINDOW_SECS = 30

const DB_NAME = "astros-event-keys"
const STORE = "keys"

const openDb = () =>
	new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1)
		request.onupgradeneeded = () => request.result.createObjectStore(STORE)
		request.onsuccess = () => resolve(request.result)
		request.onerror = () => reject(request.error ?? new Error("IndexedDB"))
	})

const withStore = async <T>(
	mode: IDBTransactionMode,
	run: (store: IDBObjectStore) => IDBRequest<T>,
) => {
	const db = await openDb()
	return new Promise<T>((resolve, reject) => {
		const request = run(db.transaction(STORE, mode).objectStore(STORE))
		request.onsuccess = () => resolve(request.result)
		request.onerror = () => reject(request.error ?? new Error("IndexedDB"))
	})
}

export const toHex = (bytes: Uint8Array) =>
	Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")

export const fromHex = (hex: string) =>
	new Uint8Array(hex.match(/.{2}/g)?.map((h) => parseInt(h, 16)) ?? [])

export const toBase64Url = (bytes: Uint8Array) =>
	btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "")

export const fromBase64Url = (text: string) => {
	const b64 = text.replace(/-/g, "+").replace(/_/g, "/")
	return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

/** True when this browser can create non-extractable Ed25519 keys. */
export const supportsEventKeys = async () => {
	try {
		await crypto.subtle.generateKey({ name: "Ed25519" }, false, ["sign"])
		return true
	} catch {
		return false
	}
}

/** Create a key for an event on this device. Returns the 32-byte public key. */
export const createEventKey = async (): Promise<Uint8Array> => {
	const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, false, [
		"sign",
		"verify",
	])) as CryptoKeyPair
	const publicKey = new Uint8Array(
		await crypto.subtle.exportKey("raw", pair.publicKey),
	)
	await withStore("readwrite", (store) =>
		store.put(pair.privateKey, toHex(publicKey)),
	)
	return publicKey
}

/** True if this device holds the private key for `publicKeyHex`. */
export const hasEventKey = async (publicKeyHex: string) =>
	Boolean(await withStore("readonly", (store) => store.get(publicKeyHex)))

/** Bytes the event key signs for one window. */
export const proofMessage = (eventId: number, window: number) => {
	const message = new Uint8Array(7 + 4 + 8)
	message.set(new TextEncoder().encode("astros:"), 0)
	const view = new DataView(message.buffer)
	view.setUint32(7, eventId)
	view.setBigUint64(11, BigInt(window))
	return message
}

export const currentWindow = () =>
	Math.floor(Date.now() / 1000 / PROOF_WINDOW_SECS)

/** Sign the code for `window` with this device's key, or null if it's not here. */
export const signWindow = async (
	publicKeyHex: string,
	eventId: number,
	window: number,
): Promise<Uint8Array | null> => {
	const key = await withStore<CryptoKey | undefined>("readonly", (store) =>
		store.get(publicKeyHex),
	)
	if (!key) return null
	return new Uint8Array(
		await crypto.subtle.sign(
			{ name: "Ed25519" },
			key,
			proofMessage(eventId, window),
		),
	)
}

/** The link the rotating QR encodes. */
export const proofUrl = (
	eventId: number,
	codeWindow: number,
	signature: Uint8Array,
) =>
	`${location.origin}/evento/${eventId}?w=${codeWindow}&s=${toBase64Url(signature)}`

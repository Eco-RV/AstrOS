/**
 * Event images are stored on-chain as `ipfs://<CID>` (short and independent of
 * any gateway) or, for older events, as a plain https URL. This turns them into
 * URLs an <img> can load.
 *
 * Public gateways rate-limit (ipfs.io answers 429 under load), so an IPFS image
 * gets a list of gateways to try in order: the configured one first (best: the
 * project's Pinata dedicated gateway), then public fallbacks.
 */
const raw = ((import.meta.env.PUBLIC_IPFS_GATEWAY as string | undefined) || "")
	.trim()
	.replace(/\/+$/, "")
	.replace(/\/ipfs$/, "")
// Accept "name.mypinata.cloud" without the protocol.
const configured = raw && !/^https?:\/\//.test(raw) ? `https://${raw}` : raw

const GATEWAYS = [
	...new Set(
		[configured, "https://gateway.pinata.cloud", "https://ipfs.io"].filter(
			Boolean,
		),
	),
]

/** Every URL worth trying for an image, best first. */
export const imageSources = (url?: string): string[] => {
	if (!url) return []
	if (url.startsWith("ipfs://")) {
		const path = url.slice(7)
		return GATEWAYS.map((g) => `${g}/ipfs/${path}`)
	}
	// blob: = local preview of a photo that is still uploading.
	return /^(https|blob):/.test(url) ? [url] : []
}

/** The preferred URL for an image (for links). */
export const imageSrc = (url?: string) => imageSources(url)[0]

/**
 * Event images are stored on-chain as `ipfs://<CID>` (short and independent of
 * any gateway) or, for older events, as a plain https URL. This turns them into
 * something an <img> can load.
 */
const gateway = (
	(import.meta.env.PUBLIC_IPFS_GATEWAY as string | undefined) ||
	"https://ipfs.io"
).replace(/\/+$/, "")

export const imageSrc = (url?: string) => {
	if (!url) return undefined
	if (url.startsWith("ipfs://")) return `${gateway}/ipfs/${url.slice(7)}`
	// blob: = local preview of a photo that is still uploading.
	return /^(https|blob):/.test(url) ? url : undefined
}

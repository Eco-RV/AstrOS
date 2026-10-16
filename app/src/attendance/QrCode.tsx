import { useMemo } from "react"
import { encode } from "uqr"
import { Seal } from "../brand/Logo"
import styles from "./projector.module.css"

/**
 * Big, scannable QR (dark modules on white, error correction H so the logo in
 * the middle doesn't break it).
 */
export const QrCode = ({ value }: { value: string }) => {
	const { path, size } = useMemo(() => {
		const { data } = encode(value, { ecc: "H", border: 2 })
		let d = ""
		data.forEach((row, y) =>
			row.forEach((dark, x) => {
				if (dark) d += `M${x} ${y}h1v1h-1z`
			}),
		)
		return { path: d, size: data.length }
	}, [value])

	return (
		<div className={styles.qr}>
			<svg
				viewBox={`0 0 ${size} ${size}`}
				shapeRendering="crispEdges"
				role="img"
				aria-label={`Código QR: ${value}`}
			>
				<rect width={size} height={size} fill="#fff" />
				<path d={path} fill="#0b0820" />
			</svg>
			<span className={styles.qrLogo}>
				<Seal size={64} />
			</span>
		</div>
	)
}

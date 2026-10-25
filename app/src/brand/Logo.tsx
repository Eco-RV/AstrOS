import styles from "./Logo.module.css"

/**
 * AstrOS mark: a verification seal. Outer signal ring, a ring of tick marks
 * that turns slowly, a solid center disc and an alert point in orbit. Below
 * ~24px the tick marks are dropped so it still reads (same shapes as
 * favicon.svg). Colors come from the palette tokens.
 */
export const Seal = ({
	size = 40,
	className,
	inverted = false,
	spin = false,
}: {
	size?: number
	className?: string
	/** Void on signal, for signal blocks. */
	inverted?: boolean
	/** Keep the tick ring turning (header, loading screen). */
	spin?: boolean
}) => {
	const small = size < 24
	return (
		<svg
			viewBox="0 0 64 64"
			width={size}
			height={size}
			className={`${styles.seal} ${inverted ? styles.inverted : ""} ${spin ? styles.spin : ""} ${className ?? ""}`}
			aria-hidden
		>
			{inverted && <rect className={styles.bg} width="64" height="64" />}
			{small ? (
				<>
					<circle
						className={styles.ring}
						cx="32"
						cy="32"
						r="24"
						strokeWidth="5"
					/>
					<circle className={styles.disc} cx="32" cy="32" r="12" />
					<circle className={styles.orbit} cx="51" cy="13" r="6" />
				</>
			) : (
				<>
					<circle
						className={styles.ring}
						cx="32"
						cy="32"
						r="25"
						strokeWidth={size < 48 ? 3 : 2}
					/>
					<circle
						data-ticks
						className={styles.ticks}
						cx="32"
						cy="32"
						r="19"
						strokeWidth="5"
						strokeDasharray="1 4"
					/>
					<circle className={styles.disc} cx="32" cy="32" r="10" />
					<circle
						className={styles.orbit}
						cx="50"
						cy="14"
						r={size < 48 ? 4 : 3.5}
					/>
				</>
			)}
		</svg>
	)
}

/** "AstrOS" set in Oswald. */
export const Wordmark = ({
	height = 32,
	className,
}: {
	height?: number
	className?: string
}) => (
	<span
		className={`${styles.wordmark} ${className ?? ""}`}
		role="img"
		aria-label="AstrOS"
		style={{ fontSize: height }}
	>
		AstrOS
	</span>
)

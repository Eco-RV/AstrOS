import styles from "./Blueprint.module.css"

/**
 * Fixed technical-drawing background: two vertical guides framing the content
 * column and, with `grid`, the full-screen line grid (login, loading screen).
 * Decorative only.
 */
export const Blueprint = ({ grid = false }: { grid?: boolean }) => (
	<div className={`${styles.plane} ${grid ? styles.grid : ""}`} aria-hidden>
		<div className={styles.guides} />
	</div>
)

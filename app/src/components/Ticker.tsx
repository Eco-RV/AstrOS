import styles from "./Ticker.module.css"

/**
 * Film strip: a tilted void band with alert edges and perforations, words
 * alternating signal and paper separated by ✦, looping (34 s, pauses on
 * hover). The list is repeated so the loop is seamless.
 */
export const Ticker = ({ words }: { words: string[] }) => {
	if (!words.length) return null
	const run = words.map((w, i) => (
		<span key={i}>
			<span className={i % 2 ? styles.paper : styles.signal}>{w}</span>
			<span className={styles.sep} aria-hidden>
				✦
			</span>
		</span>
	))
	return (
		<div className={styles.strip} role="marquee" aria-label={words.join(", ")}>
			<div className={styles.track} aria-hidden>
				<div className={styles.run}>{run}</div>
				<div className={styles.run}>{run}</div>
			</div>
		</div>
	)
}

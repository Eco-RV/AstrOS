import styles from "./motion.module.css"

/**
 * Text whose letters rise one after another (50 ms apart) when it mounts.
 * Letters are grouped per word so lines only break between words, unless
 * `breakWords` lets a long word (an address) wrap anywhere. Screen readers
 * get the plain text.
 */
export const RiseText = ({
	text,
	delay = 0,
	breakWords = false,
}: {
	text: string
	breakWords?: boolean
	/** Seconds before the first letter. */
	delay?: number
}) => {
	let index = 0
	const words = text.split(" ")
	return (
		<span className={styles.rise} aria-label={text}>
			{words.map((word, w) => (
				<span key={w} aria-hidden>
					<span className={breakWords ? undefined : styles.word}>
						{Array.from(word).map((ch) => {
							const i = index++
							return (
								<span
									key={i}
									className={styles.letter}
									style={{ animationDelay: `${delay + i * 0.05}s` }}
								>
									{ch}
								</span>
							)
						})}
					</span>
					{w < words.length - 1 && " "}
				</span>
			))}
		</span>
	)
}

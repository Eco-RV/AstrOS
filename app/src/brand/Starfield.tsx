import { useEffect, useMemo, useRef } from "react"
import styles from "./Starfield.module.css"

/** Deterministic pseudo-random numbers so the sky is the same on every load. */
const rng = (seed: number) => () => {
	seed = (seed * 16807) % 2147483647
	return seed / 2147483647
}

/** One box-shadow per star: a single element draws hundreds of them cheaply. */
const stars = (count: number, seed: number, color: string) => {
	const r = rng(seed)
	return Array.from(
		{ length: count },
		() => `${Math.round(r() * 2000)}px ${Math.round(r() * 2000)}px ${color}`,
	).join(",")
}

/**
 * Meteor shower: a handful of shooting stars, each on its own cycle (7–13 s)
 * so they never cross in sync. Each one streaks during the first part of its
 * cycle and stays hidden the rest of the time.
 */
const meteors = (count: number, seed: number) => {
	const r = rng(seed)
	return Array.from({ length: count }, () => ({
		top: Math.round(-10 + r() * 55),
		left: Math.round(25 + r() * 85),
		duration: (7 + r() * 6).toFixed(1),
		delay: (r() * 9).toFixed(1),
		length: Math.round(90 + r() * 110),
	}))
}

/**
 * Fixed night-sky background: three star layers that drift at different speeds
 * when scrolling (parallax), two soft aurora glows and, unless `shower` is
 * off, a slow meteor shower. Decorative only.
 */
export const Starfield = ({ shower = true }: { shower?: boolean }) => {
	const ref = useRef<HTMLDivElement>(null)
	const layers = useMemo(
		() => [
			stars(160, 7, "rgba(255,255,255,0.55)"),
			stars(60, 13, "rgba(255,255,255,0.8)"),
			stars(18, 29, "#ffd66b"),
		],
		[],
	)
	const shootingStars = useMemo(() => meteors(7, 41), [])

	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
		let frame = 0
		const onScroll = () => {
			cancelAnimationFrame(frame)
			frame = requestAnimationFrame(() =>
				ref.current?.style.setProperty("--scroll", String(window.scrollY)),
			)
		}
		window.addEventListener("scroll", onScroll, { passive: true })
		return () => {
			window.removeEventListener("scroll", onScroll)
			cancelAnimationFrame(frame)
		}
	}, [])

	return (
		<div ref={ref} className={styles.sky} aria-hidden>
			<div className={styles.glowA} />
			<div className={styles.glowB} />
			{layers.map((shadow, i) => (
				<div
					key={i}
					className={`${styles.layer} ${styles[`l${i}`]}`}
					style={{ boxShadow: shadow }}
				/>
			))}
			{shower &&
				shootingStars.map((m, i) => (
					<span
						key={i}
						className={styles.meteor}
						style={
							{
								top: `${m.top}%`,
								left: `${m.left}%`,
								"--length": `${m.length}px`,
								"--duration": `${m.duration}s`,
								"--delay": `${m.delay}s`,
							} as React.CSSProperties
						}
					/>
				))}
		</div>
	)
}

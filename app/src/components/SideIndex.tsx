import { useEffect, useState } from "react"
import styles from "./SideIndex.module.css"

/**
 * Desktop side index (≥ 1100px): section numbers written vertically on the
 * right edge; the section on screen goes in signal. Each item points to an
 * element id on the page.
 */
export const SideIndex = ({
	items,
}: {
	items: { id: string; label: string }[]
}) => {
	const [current, setCurrent] = useState(items[0]?.id)

	useEffect(() => {
		const targets = items
			.map((i) => document.getElementById(i.id))
			.filter((el): el is HTMLElement => el !== null)
		if (!targets.length || !("IntersectionObserver" in window)) return
		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries.filter((e) => e.isIntersecting)
				const top = visible.sort(
					(a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
				)[0]
				if (top) setCurrent(top.target.id)
			},
			{ rootMargin: "-30% 0px -55% 0px" },
		)
		for (const t of targets) observer.observe(t)
		return () => observer.disconnect()
	}, [items])

	return (
		<nav className={styles.index} aria-label="Secciones de la página">
			{items.map((item, i) => (
				<a
					key={item.id}
					href={`#${item.id}`}
					aria-current={current === item.id ? "true" : undefined}
				>
					<b>{String(i + 1).padStart(2, "0")}</b> {item.label}
				</a>
			))}
		</nav>
	)
}

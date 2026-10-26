import { useCallback } from "react"

const reducedMotion = () =>
	window.matchMedia("(prefers-reduced-motion: reduce)").matches

const finePointer = () => window.matchMedia("(hover: hover)").matches

/*
 * Ref callbacks: React 19 calls the returned function on unmount, so every
 * listener and observer is cleaned up there.
 */

/**
 * Scroll reveal: the element enters with opacity + translateY (the global
 * `.reveal` class) once 20% of it is on screen. Apply it to whole grids, never
 * to single cells, so the grid's line background never shows through.
 */
export const useReveal = <T extends HTMLElement>() =>
	useCallback((el: T | null) => {
		if (!el) return
		el.classList.add("reveal")
		if (reducedMotion() || !("IntersectionObserver" in window)) {
			el.classList.add("is-in")
			return
		}
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return
				el.classList.add("is-in")
				observer.disconnect()
			},
			{ threshold: 0.2 },
		)
		observer.observe(el)
		return () => observer.disconnect()
	}, [])

/**
 * Subtle magnetic pull on desktop: the element follows the cursor by
 * `strength` times its distance from the center while hovered.
 */
export const useMagnetic = <T extends HTMLElement>(strength = 0.25) =>
	useCallback(
		(el: T | null) => {
			if (!el || reducedMotion() || !finePointer()) return
			el.style.transition =
				"transform 0.35s var(--ease-out), background 0.2s, color 0.2s, border-color 0.2s"
			const move = (e: PointerEvent) => {
				const r = el.getBoundingClientRect()
				const x = (e.clientX - (r.left + r.width / 2)) * strength
				const y = (e.clientY - (r.top + r.height / 2)) * strength
				el.style.transform = `translate(${x}px, ${y}px)`
			}
			const leave = () => {
				el.style.transform = ""
			}
			el.addEventListener("pointermove", move)
			el.addEventListener("pointerleave", leave)
			return () => {
				el.removeEventListener("pointermove", move)
				el.removeEventListener("pointerleave", leave)
			}
		},
		[strength],
	)

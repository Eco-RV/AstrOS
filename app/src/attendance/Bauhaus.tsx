import styles from "./attendance.module.css"

/* Palette fills/strokes as classes: the art follows the palette tokens. */
const f = {
	v: styles.fV,
	p: styles.fP,
	s: styles.fS,
	a: styles.fA,
}
const s = {
	v: styles.sV,
	p: styles.sP,
	s: styles.sS,
	a: styles.sA,
}

/**
 * Flat Bauhaus illustration (circles, quarter circles, squares, crosses and
 * tick rings) on a solid signal or void field, picked deterministically from
 * `seed` so each event keeps its own. The part marked `spin` turns slowly
 * (18 s) and speeds up when its card is hovered (4 s).
 */
export const Bauhaus = ({
	seed,
	size = 140,
	locked = false,
}: {
	seed: number
	size?: number
	locked?: boolean
}) => {
	const variant = Math.abs(seed) % VARIANTS.length
	const Art = (VARIANTS[variant] ?? VARIANTS[0]) as () => React.ReactElement
	return (
		<svg
			viewBox="0 0 200 200"
			width={size}
			height={size}
			preserveAspectRatio="xMidYMid slice"
			className={`${styles.bauhaus} ${locked ? styles.bauhausLocked : ""}`}
			aria-hidden
		>
			<Art />
		</svg>
	)
}

const Spin = ({ children }: { children: React.ReactNode }) => (
	<g className={styles.spin}>{children}</g>
)

const VARIANTS: (() => React.ReactElement)[] = [
	// Gauge: signal field, paper half disc, turning void ticks, alert needle.
	() => (
		<>
			<rect width="200" height="200" className={f.s} />
			<path d="M20 140 A80 80 0 0 1 180 140Z" className={f.p} />
			<Spin>
				<circle
					cx="100"
					cy="140"
					r="64"
					fill="none"
					className={s.v}
					strokeWidth="10"
					strokeDasharray="1 9"
				/>
			</Spin>
			<rect
				x="97"
				y="72"
				width="6"
				height="68"
				className={f.a}
				transform="rotate(38 100 140)"
			/>
			<circle cx="100" cy="140" r="16" className={f.v} />
		</>
	),
	// Orbit: void field, two signal rings, paper planet, orbiting points.
	() => (
		<>
			<rect width="200" height="200" className={f.v} />
			<circle
				cx="100"
				cy="100"
				r="78"
				fill="none"
				className={s.s}
				strokeWidth="3"
			/>
			<circle
				cx="100"
				cy="100"
				r="56"
				fill="none"
				className={s.s}
				strokeWidth="3"
				strokeDasharray="2 8"
			/>
			<circle cx="100" cy="100" r="30" className={f.p} />
			<Spin>
				<circle cx="100" cy="22" r="9" className={f.a} />
				<circle cx="100" cy="178" r="6" className={f.s} />
			</Spin>
		</>
	),
	// Reticle: void field, 4×4 signal grid, filled cells, alert ring.
	() => (
		<>
			<rect width="200" height="200" className={f.v} />
			<path
				d="M50 0V200M100 0V200M150 0V200M0 50H200M0 100H200M0 150H200"
				className={s.s}
				strokeWidth="2"
			/>
			<rect x="50" y="50" width="50" height="50" className={f.s} />
			<rect x="150" y="100" width="50" height="50" className={f.p} />
			<circle
				cx="125"
				cy="125"
				r="34"
				fill="none"
				className={s.a}
				strokeWidth="6"
			/>
			<Spin>
				<circle cx="100" cy="30" r="8" className={f.p} />
			</Spin>
		</>
	),
	// Quarter circle + tick ring.
	() => (
		<>
			<rect width="200" height="200" className={f.s} />
			<path d="M0 200 V40 A160 160 0 0 1 160 200Z" className={f.v} />
			<Spin>
				<circle
					cx="100"
					cy="100"
					r="68"
					fill="none"
					className={s.p}
					strokeWidth="12"
					strokeDasharray="2 12"
				/>
			</Spin>
			<circle cx="152" cy="48" r="18" className={f.a} />
		</>
	),
	// Void field, paper disc, alert cross.
	() => (
		<>
			<rect width="200" height="200" className={f.v} />
			<circle cx="100" cy="100" r="60" className={f.p} />
			<Spin>
				<rect x="92" y="28" width="16" height="144" className={f.a} />
				<rect x="28" y="92" width="144" height="16" className={f.a} />
			</Spin>
			<rect x="140" y="140" width="36" height="36" className={f.s} />
		</>
	),
	// Quarter circles in a 2×2 grid.
	() => (
		<>
			<rect width="200" height="200" className={f.s} />
			<path d="M0 0 H100 A100 100 0 0 1 0 100Z" className={f.v} />
			<path d="M200 200 H100 A100 100 0 0 1 200 100Z" className={f.v} />
			<Spin>
				<rect x="76" y="76" width="48" height="48" className={f.a} />
			</Spin>
			<circle
				cx="156"
				cy="44"
				r="20"
				className={`${f.p} ${s.v}`}
				strokeWidth="4"
			/>
		</>
	),
]

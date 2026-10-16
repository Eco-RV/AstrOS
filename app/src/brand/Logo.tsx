import { useId } from "react"

/** Aurora gradient shared by the logo pieces (ids must be unique per SVG). */
const Aurora = ({ id }: { id: string }) => (
	<linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
		<stop offset="0" stopColor="#7B61FF" />
		<stop offset=".55" stopColor="#C86DD7" />
		<stop offset="1" stopColor="#3DD6F5" />
	</linearGradient>
)

/** Ringed planet (the "O" of the wordmark and the center of the seal). */
const Planet = ({
	cx,
	cy,
	r,
	fill,
}: {
	cx: number
	cy: number
	r: number
	fill: string
}) => {
	const rx = r * 1.6
	const ry = r * 0.42
	return (
		<g transform={`rotate(-20 ${cx} ${cy})`}>
			<path
				d={`M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`}
				fill="none"
				stroke="#FFD66B"
				strokeWidth={r / 5.5}
				opacity=".7"
			/>
			<circle cx={cx} cy={cy} r={r} fill={fill} />
			<path
				d={`M${cx - rx} ${cy} A${rx} ${ry} 0 0 0 ${cx + rx} ${cy}`}
				fill="none"
				stroke="#FFD66B"
				strokeWidth={r / 5.5}
				strokeLinecap="round"
			/>
		</g>
	)
}

/** 4-point sparkle centered on (cx, cy). */
export const sparklePath = (cx: number, cy: number, r: number) =>
	`M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r}Z`

/** App icon: notched badge seal with a planet. */
export const Seal = ({
	size = 40,
	className,
}: {
	size?: number
	className?: string
}) => {
	const id = useId()
	return (
		<svg
			viewBox="0 0 128 128"
			width={size}
			height={size}
			className={className}
			aria-hidden
		>
			<defs>
				<Aurora id={id} />
			</defs>
			<circle cx="64" cy="64" r="56" fill={`url(#${id})`} />
			<circle
				cx="64"
				cy="64"
				r="58"
				fill="none"
				stroke={`url(#${id})`}
				strokeWidth="8"
				strokeDasharray="4.555 4.555"
			/>
			<circle cx="64" cy="64" r="47" fill="#0B0820" />
			<Planet cx={64} cy={70} r={20} fill={`url(#${id})`} />
			<path d={sparklePath(90, 36, 10)} fill="#fff" />
		</svg>
	)
}

/** "AstrOS" with the O as a ringed planet. Text follows `color`. */
export const Wordmark = ({
	height = 32,
	className,
}: {
	height?: number
	className?: string
}) => {
	const id = useId()
	return (
		<svg
			viewBox="0 0 244 96"
			height={height}
			width={(height * 244) / 96}
			className={className}
			role="img"
			aria-label="AstrOS"
		>
			<defs>
				<Aurora id={id} />
			</defs>
			<g
				fontFamily="'Space Grotesk', Inter, system-ui, sans-serif"
				fontWeight="700"
				fontSize="64"
				fill="currentColor"
			>
				<text x="4" y="70" textLength="116" lengthAdjust="spacingAndGlyphs">
					Astr
				</text>
				<text x="200" y="70" textLength="38" lengthAdjust="spacingAndGlyphs">
					S
				</text>
			</g>
			<Planet cx={164} cy={47} r={22} fill={`url(#${id})`} />
			<path d={sparklePath(186, 18, 10)} fill="#FFD66B" />
		</svg>
	)
}

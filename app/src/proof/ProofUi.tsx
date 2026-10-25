import jsQR from "jsqr"
import { useEffect, useRef, useState } from "react"
import { QrCode } from "../attendance/QrCode"
import styles from "../spaces/saas.module.css"
import {
	currentWindow,
	PROOF_WINDOW_SECS,
	proofUrl,
	signWindow,
} from "./eventKey"

/** Prefix of the personal attendance QR, so the scanner ignores other QRs. */
const ATTENDEE_PREFIX = "astros:asistente:"

export const attendeeQrValue = (address: string) =>
	`${ATTENDEE_PREFIX}${address}`

/** The attendee's personal QR, shown to staff for the check-in. */
export const MyAttendanceQr = ({ address }: { address: string }) => (
	<div className={styles.myQr}>
		<span className="kicker" style={{ color: "var(--on-signal)" }}>
			Mi QR de asistencia
		</span>
		<div>
			<QrCode value={attendeeQrValue(address)} />
		</div>
		<p style={{ margin: 0 }}>
			Muéstralo al staff del evento: lo escanean y firman tu asistencia. No
			contiene datos personales, solo tu dirección pública.
		</p>
	</div>
)

/**
 * Camera scanner for the check-in. Calls `onAddress` with the attendee's
 * address when it reads a personal attendance QR.
 */
export const QrScanner = ({
	onAddress,
	paused = false,
}: {
	onAddress: (address: string) => void
	paused?: boolean
}) => {
	const video = useRef<HTMLVideoElement>(null)
	const [error, setError] = useState<string>()
	const last = useRef("")
	// Refs so a new callback or pausing never restarts the camera.
	const onAddressRef = useRef(onAddress)
	const pausedRef = useRef(paused)
	useEffect(() => {
		onAddressRef.current = onAddress
		pausedRef.current = paused
	})

	useEffect(() => {
		let stream: MediaStream | undefined
		let frame = 0
		const canvas = document.createElement("canvas")
		const ctx = canvas.getContext("2d", { willReadFrequently: true })

		const tick = () => {
			const v = video.current
			if (
				v &&
				ctx &&
				v.readyState === v.HAVE_ENOUGH_DATA &&
				!pausedRef.current
			) {
				canvas.width = v.videoWidth
				canvas.height = v.videoHeight
				ctx.drawImage(v, 0, 0)
				const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
				const code = jsQR(image.data, image.width, image.height)
				const text = code?.data ?? ""
				if (text.startsWith(ATTENDEE_PREFIX) && text !== last.current) {
					last.current = text
					onAddressRef.current(text.slice(ATTENDEE_PREFIX.length))
				}
			}
			frame = requestAnimationFrame(tick)
		}

		navigator.mediaDevices
			?.getUserMedia({ video: { facingMode: "environment" } })
			.then((s) => {
				stream = s
				if (video.current) {
					video.current.srcObject = s
					void video.current.play()
				}
				frame = requestAnimationFrame(tick)
			})
			.catch(() =>
				setError(
					"No pudimos abrir la cámara. Permite el acceso a la cámara o escribe la dirección a mano.",
				),
			)

		return () => {
			cancelAnimationFrame(frame)
			stream?.getTracks().forEach((t) => t.stop())
		}
	}, [])

	return error ? (
		<p className={styles.warn}>{error}</p>
	) : (
		<div className={styles.scanner}>
			<video ref={video} muted playsInline />
			<span className={styles.scanFrame} aria-hidden />
		</div>
	)
}

/**
 * The rotating QR for the projector: a new signed link every 30 s. Needs this
 * device to hold the event key (`hasKey`).
 */
export const RotatingQr = ({
	eventId,
	publicKeyHex,
}: {
	eventId: number
	publicKeyHex: string
}) => {
	const [url, setUrl] = useState<string>()
	const [secondsLeft, setSecondsLeft] = useState(PROOF_WINDOW_SECS)

	useEffect(() => {
		let lastWindow = -1
		let stopped = false
		const update = async () => {
			const w = currentWindow()
			const now = Date.now() / 1000
			setSecondsLeft(Math.ceil((w + 1) * PROOF_WINDOW_SECS - now))
			if (w === lastWindow) return
			lastWindow = w
			const signature = await signWindow(publicKeyHex, eventId, w)
			if (!stopped && signature) setUrl(proofUrl(eventId, w, signature))
		}
		void update()
		const timer = setInterval(() => void update(), 1000)
		return () => {
			stopped = true
			clearInterval(timer)
		}
	}, [eventId, publicKeyHex])

	if (!url) return <p>Preparando el código…</p>
	return (
		<>
			<QrCode value={url} />
			<span className="chip num" aria-live="off">
				Cambia en {secondsLeft} s
			</span>
		</>
	)
}

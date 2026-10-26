import { scValToNative, xdr } from "@stellar/stellar-sdk"
import {
	shortAddress,
	subscribeToEvents,
	type SubscriptionEvent,
} from "@stellar-scaffold/app-lib"
import { attendance } from "@stellar-scaffold/app-lib/clients"
import { useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { BadgeArt } from "../attendance/BadgeArt"
import styles from "../attendance/projector.module.css"
import { QrCode } from "../attendance/QrCode"
import {
	eventStatus,
	formatDate,
	STATUS_LABEL,
	useEvent,
} from "../attendance/useAttendance"
import { Blueprint } from "../brand/Blueprint"
import { Wordmark } from "../brand/Logo"

interface Claim {
	key: string
	attendee: string
	number?: number
}

interface ShootingStar {
	id: number
	top: number
	delay: number
}

const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(
	window.location.hostname,
)

/**
 * app-lib ships its own copy of the Stellar SDK, so its ScVal objects aren't
 * instances of ours: go through XDR to decode them.
 */
const native = (v: { toXDR(format: "base64"): string }): unknown =>
	scValToNative(xdr.ScVal.fromXDR(v.toXDR("base64"), "base64"))

/** Decode a BadgeClaimed event: topics are [name, event_id, attendee]. */
const parseClaim = (e: SubscriptionEvent) => {
	try {
		const [, idVal, attendeeVal] = e.topic
		if (!idVal || !attendeeVal) return undefined
		const body = native(e.value) as { number?: number } | number
		return {
			eventId: Number(native(idVal)),
			attendee: String(native(attendeeVal)),
			number: typeof body === "number" ? body : body?.number,
		}
	} catch {
		return undefined
	}
}

/**
 * Projector screen for the organizer: a giant QR to the event page and a live
 * counter. Every new badge launches a shooting star and shows up in the feed.
 */
const Projector = () => {
	const eventId = Number(useParams().id)
	// The contract is the source of truth for the counter (polled every 4 s).
	const { data: event, error } = useEvent(eventId, true, 4000)
	const [claims, setClaims] = useState<Claim[]>([])
	const [stars, setStars] = useState<ShootingStar[]>([])
	const lastCount = useRef<number>(undefined)
	const nextStar = useRef(0)

	// Who claimed: contract events, polled every 3 s.
	useEffect(
		() =>
			subscribeToEvents(
				attendance.options.contractId,
				"badge_claimed",
				(e) => {
					const claim = parseClaim(e)
					if (!claim || claim.eventId !== eventId) return
					setClaims((prev) =>
						prev.some((c) => c.key === e.id)
							? prev
							: [{ key: e.id, ...claim }, ...prev].slice(0, 6),
					)
				},
				3000,
			),
		[eventId],
	)

	// A shooting star for every new badge since the last refresh.
	const claimed = event?.claimed
	useEffect(() => {
		if (claimed === undefined) return
		const before = lastCount.current
		lastCount.current = claimed
		if (before === undefined || claimed <= before) return
		const fresh = Array.from(
			{ length: Math.min(claimed - before, 8) },
			(_, i) => ({
				id: nextStar.current++,
				top: 8 + Math.random() * 55,
				delay: i * 0.25,
			}),
		)
		setStars((s) => [...s, ...fresh])
		const timer = setTimeout(
			() => setStars((s) => s.filter((x) => !fresh.includes(x))),
			2600,
		)
		return () => clearTimeout(timer)
	}, [claimed])

	const fullscreen = () => {
		if (document.fullscreenElement) void document.exitFullscreen()
		else void document.documentElement.requestFullscreen?.()
	}

	if (error || (!event && !Number.isInteger(eventId)))
		return (
			<div className={styles.screen}>
				<Blueprint grid />
				<p className={styles.problem}>
					{error?.message ?? "Ese evento no existe."} <Link to="/">Volver</Link>
				</p>
			</div>
		)

	const url = `${window.location.origin}/evento/${eventId}`
	const status = event ? eventStatus(event) : undefined

	return (
		<div className={styles.screen}>
			<Blueprint grid />
			{stars.map((s) => (
				<span
					key={s.id}
					className={styles.shootingStar}
					style={{ top: `${s.top}%`, animationDelay: `${s.delay}s` }}
					aria-hidden
				/>
			))}

			<header className={styles.top}>
				<Wordmark height={34} />
				<div className={styles.controls}>
					<button onClick={fullscreen}>Pantalla completa</button>
					<Link to={`/evento/${eventId}`} className={styles.exit}>
						Salir
					</Link>
				</div>
			</header>

			<main className={styles.stage}>
				<section className={styles.qrSide}>
					<QrCode value={url} />
					<p className={styles.scan}>Escanea con la cámara de tu celular</p>
					<code className={styles.url}>{url.replace(/^https?:\/\//, "")}</code>
					{isLocalhost && (
						<p className={styles.warning}>
							Este QR apunta a <strong>localhost</strong>: los celulares no lo
							pueden abrir. Proyecta desde la URL publicada (Vercel).
						</p>
					)}
				</section>

				<section className={styles.info}>
					{event ? (
						<>
							<div className={styles.eventHead}>
								<BadgeArt
									eventId={event.id}
									name={event.name}
									imageUrl={event.image_url}
									size={120}
									orbit={status === "open"}
								/>
								<div>
									{status && (
										<span className={styles.status}>
											{STATUS_LABEL[status]}
										</span>
									)}
									<h1>{event.name}</h1>
									<p>
										{event.location || "En línea"} · hasta{" "}
										{formatDate(event.ends_at)}
									</p>
								</div>
							</div>

							<div className={styles.counter} aria-live="polite">
								<strong key={event.claimed} className={styles.count}>
									{event.claimed}
								</strong>
								<span>
									{event.max_claims > 0 && (
										<em className={styles.max}>/ {event.max_claims}</em>
									)}
									{event.claimed === 1
										? "insignia reclamada"
										: "insignias reclamadas"}
								</span>
							</div>

							<ul className={styles.feed}>
								{claims.length === 0 ? (
									<li className={styles.waiting}>
										Esperando el primer reclamo…
									</li>
								) : (
									claims.map((c) => (
										<li key={c.key}>
											<span className={styles.feedStar} aria-hidden />
											<code>{shortAddress(c.attendee)}</code> reclamó
											{c.number ? ` la #${c.number}` : " su insignia"}
										</li>
									))
								)}
							</ul>
						</>
					) : (
						<p className={styles.waiting}>Cargando evento…</p>
					)}
				</section>
			</main>

			<ol className={styles.steps}>
				<li>
					<b>1</b> Escanea el QR
				</li>
				<li>
					<b>2</b> Entra con tu correo
				</li>
				<li>
					<b>3</b> Toca «Reclamar insignia»
				</li>
			</ol>
		</div>
	)
}

export default Projector

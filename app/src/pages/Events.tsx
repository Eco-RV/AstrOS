import { useState } from "react"
import { Link } from "react-router-dom"
import styles from "../attendance/attendance.module.css"
import { BadgeArt } from "../attendance/BadgeArt"
import { CreateEventForm } from "../attendance/CreateEventForm"
import {
	eventStatus,
	formatDate,
	STATUS_LABEL,
	useLatestEvents,
} from "../attendance/useAttendance"
import { useWallet } from "../hooks/useWallet"

const Events = () => {
	const { address } = useWallet()
	const { data: events, isLoading, error } = useLatestEvents()
	const [creating, setCreating] = useState(false)

	return (
		<div className={styles.page}>
			<section className={styles.hero}>
				<h1>AstrOS ✦</h1>
				<p className={styles.tagline}>Insignias de asistencia en Stellar</p>
				<p>
					Crea un evento y quienes asistan reclaman su insignia mientras está
					abierto. Cada insignia queda registrada en la blockchain de Stellar
					(testnet) a nombre de tu cuenta: es personal, no se puede transferir y
					cualquiera puede verificarla.
				</p>
				{address ? (
					<button
						className={styles.primary}
						onClick={() => setCreating((c) => !c)}
					>
						{creating ? "Cancelar" : "＋ Crear evento"}
					</button>
				) : (
					<p className={styles.hint}>
						Inicia sesión arriba con tu correo o Google para crear eventos y
						reclamar insignias.
					</p>
				)}
			</section>

			{creating && address && (
				<section className="card">
					<h2>Nuevo evento</h2>
					<CreateEventForm onDone={() => setCreating(false)} />
				</section>
			)}

			<section>
				<h2>Eventos recientes</h2>
				{isLoading && <p className={styles.hint}>Cargando eventos…</p>}
				{error && (
					<p className={styles.error}>
						No se pudieron leer los eventos: {error.message}
					</p>
				)}
				{events?.length === 0 && (
					<p className={styles.hint}>Aún no hay eventos. ¡Crea el primero!</p>
				)}
				<div className={styles.grid}>
					{events?.map((event) => {
						const status = eventStatus(event)
						return (
							<Link
								key={event.id}
								to={`/evento/${event.id}`}
								className={`card ${styles.eventCard}`}
							>
								<BadgeArt
									eventId={event.id}
									name={event.name}
									imageUrl={event.image_url}
									size={64}
									muted={status !== "open"}
								/>
								<div>
									<span className={`${styles.pill} ${styles[status]}`}>
										{STATUS_LABEL[status]}
									</span>
									<h3>{event.name}</h3>
									<p className={styles.meta}>
										{formatDate(event.starts_at)}
										{event.location && ` · ${event.location}`}
									</p>
									<p className={styles.meta}>
										{event.claimed}
										{event.max_claims > 0 && ` / ${event.max_claims}`}{" "}
										{event.claimed === 1
											? "insignia reclamada"
											: "insignias reclamadas"}
									</p>
								</div>
							</Link>
						)
					})}
				</div>
			</section>
		</div>
	)
}

export default Events

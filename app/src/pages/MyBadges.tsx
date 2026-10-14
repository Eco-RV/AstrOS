import { Link } from "react-router-dom"
import styles from "../attendance/attendance.module.css"
import { BadgeArt } from "../attendance/BadgeArt"
import { formatDate, useBadgesOf } from "../attendance/useAttendance"
import { useWallet } from "../hooks/useWallet"

const MyBadges = () => {
	const { address } = useWallet()
	const { data: badges, isLoading } = useBadgesOf(address)

	return (
		<div className={styles.page}>
			<section className={styles.hero}>
				<h1>Mis insignias</h1>
				<p>
					Tu colección de asistencias, leída directamente del contrato{" "}
					<code>attendance</code>. Nadie (ni siquiera quien organiza) puede
					quitártelas.
				</p>
			</section>

			{!address ? (
				<p className={styles.hint}>
					Inicia sesión arriba para ver tus insignias.
				</p>
			) : isLoading ? (
				<p className={styles.hint}>Cargando…</p>
			) : !badges?.length ? (
				<p className={styles.hint}>
					Todavía no tienes insignias.{" "}
					<Link to="/">Busca un evento abierto</Link> y reclama la tuya.
				</p>
			) : (
				<div className={styles.collection}>
					{[...badges].reverse().map((b) => (
						<Link
							key={b.event_id}
							to={`/evento/${b.event_id}`}
							className={styles.collected}
						>
							<BadgeArt eventId={b.event_id} name={b.event_name} size={112} />
							<strong>{b.event_name}</strong>
							<span className={styles.meta}>
								#{b.number} · {formatDate(b.claimed_at)}
							</span>
						</Link>
					))}
				</div>
			)}
		</div>
	)
}

export default MyBadges

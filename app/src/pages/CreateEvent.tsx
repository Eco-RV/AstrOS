import styles from "../attendance/attendance.module.css"
import { CreateEventForm } from "../attendance/CreateEventForm"

const CreateEvent = () => {
	return (
		<div className={styles.page}>
			<section className={styles.hero}>
				<h1>
					Crea tu <span className={styles.gradientText}>evento</span>
				</h1>
				<p>
					Quienes asistan reclaman su insignia mientras esté abierto. Crear el
					evento es una transacción: la firmas con tu wallet.
				</p>
			</section>

			<CreateEventForm />
		</div>
	)
}

export default CreateEvent

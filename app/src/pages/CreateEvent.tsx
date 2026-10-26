import styles from "../attendance/attendance.module.css"
import { CreateEventForm } from "../attendance/CreateEventForm"
import { RiseText } from "../motion/RiseText"

const CreateEvent = () => {
	return (
		<div className={styles.page}>
			<section className={styles.pageHead}>
				<span className="kicker">Nuevo evento</span>
				<h1>
					<RiseText text="Crea una misión" />
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

import styles from "../attendance/attendance.module.css"
import { CreateEventForm } from "../attendance/CreateEventForm"
import { useCavosState } from "../cavos/context"
import { useWallet } from "../hooks/useWallet"

const CreateEvent = () => {
	const { address } = useWallet()
	const cavos = useCavosState()

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

			{address ? (
				<CreateEventForm />
			) : (
				<div className={styles.empty}>
					<strong>Primero entra a tu cuenta</strong>
					<span>Así el evento queda a tu nombre como organizador.</span>
					{cavos && (
						<button className="btn-primary" onClick={cavos.signIn}>
							Entrar con mi correo
						</button>
					)}
				</div>
			)}
		</div>
	)
}

export default CreateEvent

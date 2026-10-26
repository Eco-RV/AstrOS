import { attendance } from "@stellar-scaffold/app-lib/clients"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import styles from "../attendance/attendance.module.css"
import { CreateEventForm } from "../attendance/CreateEventForm"
import { useWallet } from "../hooks/useWallet"
import { RiseText } from "../motion/RiseText"
import { SpaceChip } from "../spaces/SpaceUi"
import { useSpace } from "../spaces/useSaas"

/** `/organizar/:spaceId/nuevo`: create an event inside one of my spaces. */
const CreateEvent = () => {
	const spaceId = Number(useParams().spaceId)
	const { address } = useWallet()
	const { data: space, isLoading } = useSpace(
		Number.isInteger(spaceId) ? spaceId : undefined,
	)
	const { data: member } = useQuery({
		queryKey: ["attendance", "member", spaceId, address],
		enabled: Boolean(address && space),
		queryFn: async () =>
			(
				await attendance.is_space_member({
					space_id: spaceId,
					address: address!,
				})
			).result,
	})

	if (isLoading) return <div className={styles.skeleton} />
	if (!space || member === false)
		return (
			<div className={styles.page}>
				<div className={styles.empty}>
					<div>
						<strong>No puedes crear eventos en este espacio</strong>
						<span>
							Solo el dueño o su staff pueden hacerlo. Crea tu propio espacio
							desde la consola.
						</span>
						<Link to="/organizar" className="btn btn-primary">
							Ir a la consola
						</Link>
					</div>
				</div>
			</div>
		)

	return (
		<div className={styles.page}>
			<Link to="/organizar" className={styles.back}>
				← Consola
			</Link>
			<section className={styles.pageHead}>
				<span className="kicker">Nuevo evento</span>
				<h1 className="title">
					<RiseText text="Crea una misión" />
				</h1>
				<SpaceChip space={space} />
				<p>
					Quienes asistan reciben su insignia según el método que elijas. Crear
					el evento es una transacción: la firmas con tu wallet.
				</p>
			</section>

			<CreateEventForm spaceId={spaceId} />
		</div>
	)
}

export default CreateEvent

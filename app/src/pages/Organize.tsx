import { StrKey } from "@stellar/stellar-sdk"
import { attendance } from "@stellar-scaffold/app-lib/clients"
import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import attendanceStyles from "../attendance/attendance.module.css"
import { questState, StateChip } from "../attendance/Quest"
import {
	eventStatus,
	formatDate,
	useAttendanceWrite,
} from "../attendance/useAttendance"
import { BillingCard } from "../billing/BillingCard"
import { useWallet } from "../hooks/useWallet"
import { RiseText } from "../motion/RiseText"
import { categoryLabel, proofLabel } from "../spaces/catalog"
import styles from "../spaces/saas.module.css"
import { SpaceForm } from "../spaces/SpaceForm"
import { SpaceLogo, VerifiedSticker } from "../spaces/SpaceUi"
import {
	metaOf,
	type Space,
	useMySpaces,
	useSpaceEvents,
} from "../spaces/useSaas"

/**
 * `/organizar`: the organizer console. Without spaces it starts with the form
 * to create one; with spaces it shows the selected space's events, plan and
 * staff.
 */
const Organize = () => {
	const { data, isLoading } = useMySpaces()
	const [params, setParams] = useSearchParams()
	const [creating, setCreating] = useState(false)
	const owned = data?.owned ?? []
	const staff = data?.staff ?? []
	const spaces = [...owned, ...staff]
	const selectedId = Number(params.get("espacio") ?? spaces[0]?.id)
	const selected = spaces.find((s) => s.id === selectedId) ?? spaces[0]

	if (isLoading)
		return <div className={attendanceStyles.skeleton} style={{ height: 300 }} />

	if (spaces.length === 0 || creating)
		return (
			<div className={styles.page}>
				<header className={styles.head}>
					<span className="kicker">Consola del organizador</span>
					<h1 className="title">
						<RiseText text="Crea tu espacio" />
					</h1>
					<p>
						Tu espacio es la casa de tus eventos dentro de AstrOS: una barbería,
						una universidad, una comunidad. Tiene su enlace, su color y su lista
						de misiones.
					</p>
				</header>
				<div className={styles.card}>
					<SpaceForm
						onCreated={(id) => {
							setCreating(false)
							setParams({ espacio: String(id) })
						}}
					/>
				</div>
				{spaces.length > 0 && (
					<button className="btn-ghost" onClick={() => setCreating(false)}>
						← Volver a mis espacios
					</button>
				)}
			</div>
		)

	return (
		<div className={styles.page}>
			<header className={styles.head}>
				<span className="kicker">Consola del organizador</span>
				<h1 className="title">Tus espacios</h1>
			</header>

			<div className={styles.row}>
				<div className={styles.filters} role="tablist" aria-label="Espacios">
					{spaces.map((s) => (
						<button
							key={s.id}
							role="tab"
							aria-pressed={s.id === selected?.id}
							onClick={() => setParams({ espacio: String(s.id) })}
						>
							{s.name}
						</button>
					))}
				</div>
				<button className="btn-ghost" onClick={() => setCreating(true)}>
					+ Otro espacio
				</button>
			</div>

			{selected && (
				<SpacePanel
					space={selected}
					isOwner={owned.some((s) => s.id === selected.id)}
				/>
			)}
		</div>
	)
}

const SpacePanel = ({ space, isOwner }: { space: Space; isOwner: boolean }) => {
	const navigate = useNavigate()
	const { data: events, isLoading } = useSpaceEvents(space.id)

	return (
		<>
			<div className={styles.card}>
				<div className={styles.spaceTop}>
					<SpaceLogo space={space} />
					<div style={{ minWidth: 0 }}>
						<p className={styles.spaceName}>{space.name}</p>
						<span className={styles.muted}>
							{categoryLabel(space.category)} · /s/{space.slug}
						</span>
					</div>
				</div>
				<div className={styles.row}>
					<VerifiedSticker verified={space.verified} />
					{!space.verified && (
						<span className={styles.muted}>
							Un moderador revisará tu espacio. Mientras tanto, compártelo con
							su enlace.
						</span>
					)}
				</div>
				<div className={styles.row}>
					<button
						className="btn-primary"
						onClick={() => void navigate(`/organizar/${space.id}/nuevo`)}
					>
						+ Nuevo evento
					</button>
					<Link to={`/s/${space.slug}`} className="btn">
						Ver página pública ↗
					</Link>
				</div>
			</div>

			<div className={styles.consoleGrid}>
				<div className={styles.card}>
					<h3>Eventos</h3>
					{isLoading && <p className={styles.muted}>Cargando…</p>}
					{events?.length === 0 && (
						<p className={styles.muted}>
							Todavía no hay eventos. Crea el primero con “Nuevo evento”.
						</p>
					)}
					<ul className={styles.list}>
						{events?.map((view) => {
							const meta = metaOf(view)
							const status = eventStatus(view.event)
							return (
								<li key={view.event.id}>
									<div>
										<Link to={`/organizar/evento/${view.event.id}`}>
											<strong>{view.event.name}</strong>
										</Link>
										<div className={styles.muted}>
											{formatDate(view.event.starts_at)} ·{" "}
											{meta ? proofLabel(meta.proof) : "—"} ·{" "}
											{view.event.claimed}
											{view.event.max_claims > 0 &&
												` / ${view.event.max_claims}`}{" "}
											insignias
											{view.hidden && " · oculto por moderación"}
										</div>
									</div>
									<StateChip
										state={questState(status, false)}
										status={status}
									/>
								</li>
							)
						})}
					</ul>
				</div>

				<div style={{ display: "grid", gap: 22 }}>
					<BillingCard spaceId={space.id} />
					{isOwner && <StaffCard spaceId={space.id} />}
				</div>
			</div>
		</>
	)
}

/** Add or remove staff by address (owner only). */
const StaffCard = ({ spaceId }: { spaceId: number }) => {
	const { run, pending } = useAttendanceWrite()
	const { address } = useWallet()
	const [who, setWho] = useState("")
	const valid = StrKey.isValidEd25519PublicKey(who.trim())

	const act = (add: boolean) =>
		run(
			(publicKey) =>
				add
					? attendance.add_staff(
							{ owner: publicKey, space_id: spaceId, staff: who.trim() },
							{ publicKey },
						)
					: attendance.remove_staff(
							{ owner: publicKey, space_id: spaceId, staff: who.trim() },
							{ publicKey },
						),
			add
				? "Staff agregado: ya puede crear eventos y hacer check-in."
				: "Staff quitado del espacio.",
		)

	return (
		<div className={styles.card}>
			<h3>Staff</h3>
			<p className={styles.muted}>
				Tu staff puede crear eventos y dar fe de la asistencia con el check-in.
				Pega la dirección de su wallet (empieza con G).
			</p>
			<label className={styles.field}>
				Dirección
				<input
					placeholder="GABC…"
					value={who}
					onChange={(e) => setWho(e.target.value)}
					aria-invalid={who.length > 0 && !valid}
				/>
			</label>
			{who && !valid && (
				<p className={styles.warn}>
					Esa no es una dirección de Stellar válida. Debe empezar con G y tener
					56 caracteres.
				</p>
			)}
			<div className={styles.row}>
				<button
					className="btn-primary"
					disabled={!valid || pending || who.trim() === address}
					onClick={() => void act(true)}
				>
					Agregar staff
				</button>
				<button
					className="btn-ghost"
					disabled={!valid || pending}
					onClick={() => void act(false)}
				>
					Quitar
				</button>
			</div>
		</div>
	)
}

export default Organize

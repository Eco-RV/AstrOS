import { Buffer } from "buffer"
import { shortAddress } from "@stellar-scaffold/app-lib"
import { attendance } from "@stellar-scaffold/app-lib/clients"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { QrCode } from "../attendance/QrCode"
import { formatDate, useAttendanceWrite } from "../attendance/useAttendance"
import { Blueprint } from "../brand/Blueprint"
import { Seal, Wordmark } from "../brand/Logo"
import { useWallet } from "../hooks/useWallet"
import { explorerContract } from "../lib/explorer"
import {
	certificatePath,
	nameHash,
	newSalt,
	readCertificateHash,
} from "../proof/certificate"
import { toHex } from "../proof/eventKey"
import { modeLabel, proofLabel } from "../spaces/catalog"
import styles from "../spaces/saas.module.css"
import {
	metaOf,
	useAttestation,
	useEventView,
	useSpace,
} from "../spaces/useSaas"

/**
 * `/certificado/:id/:address`: a printable, publicly verifiable certificate
 * of attendance. Everything shown is read from the contract. The name is
 * checked against the salted hash the attendee stored (`set_name_hash`): the
 * link carries the name and salt (`#n=…&s=…`), the chain only the hash.
 */
const Certificate = () => {
	const params = useParams()
	const eventId = Number(params.id)
	const attendee = params.address ?? ""
	const navigate = useNavigate()
	const { hash } = useLocation()
	const { address } = useWallet()
	const { data: view } = useEventView(eventId)
	const meta = metaOf(view)
	const { data: space } = useSpace(meta?.space_id)
	const { data: attestation } = useAttestation(eventId, attendee)
	const { data: badge, isLoading } = useQuery({
		queryKey: ["attendance", "badge", eventId, attendee],
		enabled: Boolean(attendee),
		queryFn: async () =>
			(await attendance.get_badge({ event_id: eventId, attendee })).result ??
			null,
	})
	const { data: storedHash } = useQuery({
		queryKey: ["attendance", "name-hash", eventId, attendee],
		enabled: Boolean(attendee),
		queryFn: async () =>
			(await attendance.get_name_hash({ event_id: eventId, attendee }))
				.result ?? null,
	})

	const [hashState, setHashState] = useState<"none" | "ok" | "bad">("none")
	const { name, salt } = readCertificateHash(hash)
	useEffect(() => {
		if (!name || !salt || storedHash === undefined) return
		if (!storedHash) return setHashState("bad")
		void nameHash(name, salt).then((h) =>
			setHashState(toHex(h) === toHex(storedHash) ? "ok" : "bad"),
		)
	}, [name, salt, storedHash])

	const isOwner = address === attendee
	const url = `${window.location.origin}${certificatePath(eventId, attendee, name, salt)}`

	if (isLoading) return <CertificateShell>Verificando…</CertificateShell>
	if (!badge || !view)
		return (
			<CertificateShell>
				<p className={styles.warn}>
					Esta cuenta no tiene la insignia de este evento, así que no hay
					certificado que mostrar.
				</p>
			</CertificateShell>
		)

	return (
		<CertificateShell>
			<article className={styles.certificate}>
				<div className={styles.row} style={{ justifyContent: "space-between" }}>
					<span className={styles.row}>
						<Seal size={36} inverted />
						<Wordmark height={22} />
					</span>
					<span className={styles.certCheck}>✓ Verificado en Stellar</span>
				</div>

				<div>
					<p style={{ margin: "0 0 0.5rem" }}>Certificado de asistencia</p>
					<h1 className="title">{view.event.name}</h1>
				</div>

				<div>
					<p style={{ margin: "0 0 0.4rem" }}>Se certifica que</p>
					<p className={styles.certName}>
						{name ?? `La cuenta ${shortAddress(attendee)}`}
					</p>
					{name && hashState === "ok" && (
						<span className={styles.certCheck}>
							✓ Nombre registrado por el titular
						</span>
					)}
					{name && hashState === "bad" && (
						<span className={styles.certCheckBad}>
							El nombre no coincide con el registrado
						</span>
					)}
				</div>

				<dl className={styles.certFacts}>
					<div>
						<dt>Organiza</dt>
						<dd>
							{space ? space.name : shortAddress(view.event.organizer)}
							{space?.verified && " ✓"}
						</dd>
					</div>
					<div>
						<dt>Fecha</dt>
						<dd>{formatDate(view.event.starts_at)}</dd>
					</div>
					<div>
						<dt>Lugar</dt>
						<dd>{view.event.location || "En línea"}</dd>
					</div>
					<div>
						<dt>Insignia</dt>
						<dd>
							#{badge.number} · {formatDate(badge.claimed_at)}
						</dd>
					</div>
					{meta && (
						<div>
							<dt>Verificación</dt>
							<dd>
								{proofLabel(meta.proof)} · {modeLabel(meta.mode)}
							</dd>
						</div>
					)}
					<div>
						<dt>Dio fe</dt>
						<dd>
							{attestation
								? shortAddress(attestation.attested_by)
								: "Reclamo abierto (sin verificación presencial)"}
						</dd>
					</div>
				</dl>

				<div className={styles.certFoot}>
					<p style={{ margin: 0 }}>
						Registro público en el contrato{" "}
						<a
							href={explorerContract(attendance.options.contractId)}
							target="_blank"
							rel="noreferrer"
						>
							attendance
						</a>{" "}
						de Stellar. Cuenta del titular:{" "}
						<strong>{shortAddress(attendee)}</strong>. Este certificado es
						evidencia verificable de que el organizador dio fe de la asistencia;
						no reemplaza una firma digital certificada.
					</p>
					<div className={styles.certQr}>
						<QrCode value={url} />
					</div>
				</div>
			</article>

			<div className={`${styles.row} ${styles.noPrint}`}>
				<button className="btn-primary" onClick={() => window.print()}>
					Imprimir o guardar PDF
				</button>
				<button
					onClick={() => {
						void navigator.clipboard.writeText(url)
					}}
				>
					Copiar enlace
				</button>
				<Link to={`/evento/${eventId}`} className="btn">
					Ver evento
				</Link>
			</div>

			{isOwner && (
				<NameForm
					eventId={eventId}
					onSaved={(n, s) =>
						void navigate(certificatePath(eventId, attendee, n, s), {
							replace: true,
						})
					}
				/>
			)}
		</CertificateShell>
	)
}

const CertificateShell = ({ children }: { children: React.ReactNode }) => (
	<div
		style={{
			minHeight: "100dvh",
			display: "grid",
			alignContent: "start",
			gap: "1.5rem",
			padding: "clamp(1rem, 4vw, 3rem) var(--gutter)",
		}}
	>
		<span className={styles.noPrint}>
			<Blueprint grid />
		</span>
		{children}
	</div>
)

/** The badge owner sets the name printed on the certificate (hash only). */
const NameForm = ({
	eventId,
	onSaved,
}: {
	eventId: number
	onSaved: (name: string, salt: string) => void
}) => {
	const { run, pending, address } = useAttendanceWrite()
	const [name, setName] = useState("")

	const save = async (e: React.FormEvent) => {
		e.preventDefault()
		const salt = newSalt()
		const hash = await nameHash(name, salt)
		await run(
			(publicKey) =>
				attendance.set_name_hash(
					{
						attendee: publicKey,
						event_id: eventId,
						name_hash: Buffer.from(hash),
					},
					{ publicKey },
				),
			"Nombre registrado. Guarda este enlace: lleva tu nombre y la clave para comprobarlo.",
		)
		// set_name_hash returns nothing, so confirm it by reading the hash back.
		const stored = (
			await attendance.get_name_hash({ event_id: eventId, attendee: address! })
		).result
		if (stored && toHex(stored) === toHex(hash)) onSaved(name, salt)
	}

	return (
		<form
			className={`${styles.card} ${styles.form} ${styles.noPrint}`}
			onSubmit={(e) => void save(e)}
		>
			<h3>Tu nombre en el certificado</h3>
			<p className={styles.muted}>
				Tu nombre no se guarda en la blockchain: solo una huella cifrada con una
				clave al azar. La clave viaja en el enlace del certificado, así que
				quien tenga el enlace puede comprobar el nombre y nadie más puede verlo.
			</p>
			<label>
				Nombre completo
				<input
					required
					maxLength={80}
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
			</label>
			<button
				type="submit"
				className="btn-primary"
				disabled={pending || !name.trim()}
			>
				{pending ? "Firmando…" : "Registrar nombre"}
			</button>
		</form>
	)
}

export default Certificate

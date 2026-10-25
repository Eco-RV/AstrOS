import { attendance } from "@stellar-scaffold/app-lib/clients"
import { useState } from "react"
import { formatDate, useAttendanceWrite } from "../attendance/useAttendance"
import { useNotification } from "../hooks/useNotification"
import { useWallet } from "../hooks/useWallet"
import { errorMessage } from "../lib/errors"
import { attendeesLabel, formatAmount } from "../spaces/catalog"
import styles from "../spaces/saas.module.css"
import { usePricing, useSpaceBilling } from "../spaces/useSaas"
import {
	addUsdcTrustline,
	tokenSymbol,
	USDC_BALANCE_KEY,
	USDC_FAUCET,
} from "./usdc"

/**
 * The space's plan: free quota used this month, the monthly plan by size and
 * the one-off price by size. Prices are in USDC, so it also shows the USDC
 * balance and helps add the USDC trustline.
 */
export const BillingCard = ({ spaceId }: { spaceId: number }) => {
	const { data: billing } = useSpaceBilling(spaceId)
	const { data: pricing } = usePricing()
	const { run, pending } = useAttendanceWrite()
	const [tier, setTier] = useState(0)
	const [months, setMonths] = useState(1)

	if (!billing) return <div className={styles.card}>Cargando plan…</div>

	if (!billing.pricing_set || !pricing)
		return (
			<div className={styles.card}>
				<h3>Plan</h3>
				<p className={styles.muted}>
					Los cobros todavía no están configurados en esta red: crear eventos es
					gratis y sin límite.
				</p>
			</div>
		)

	const symbol = tokenSymbol(pricing.token)
	const money = (amount: bigint) => formatAmount(amount, symbol)
	const free = billing.free_events_per_month
	const used = Math.min(billing.free_events_used, free)
	const chosen = pricing.plan_tiers[tier]

	const subscribe = () =>
		run(
			(publicKey) =>
				attendance.subscribe(
					{ payer: publicKey, space_id: spaceId, tier, months },
					{ publicKey },
				),
			`Plan activo por ${months} ${months === 1 ? "mes" : "meses"}.`,
		)

	return (
		<div className={styles.card}>
			<div className={styles.row} style={{ justifyContent: "space-between" }}>
				<h3>{billing.plan_active ? "Plan mensual" : "Plan gratis"}</h3>
				{billing.plan_active && (
					<span className="sticker">
						{attendeesLabel(billing.plan_max_attendees)} · hasta{" "}
						{formatDate(billing.paid_until)}
					</span>
				)}
			</div>

			<div
				className={styles.usage}
				role="img"
				aria-label={`${used} de ${free} eventos gratis usados este mes`}
			>
				{Array.from({ length: free }, (_, i) => (
					<span key={i} className={i < used ? styles.used : undefined} />
				))}
			</div>
			<p className={styles.muted}>
				{used} de {free} eventos gratis este mes, de{" "}
				{attendeesLabel(billing.free_claims_per_event)}. Los eventos más grandes
				se pagan según su tamaño.
			</p>

			<div className={styles.field}>
				Evento único (se paga al crearlo)
				<div className={styles.statRow}>
					{pricing.event_tiers.map((t) => (
						<div key={t.max_attendees} className={styles.stat}>
							<span>{attendeesLabel(t.max_attendees)}</span>
							<strong>{money(t.price)}</strong>
						</div>
					))}
				</div>
			</div>

			<div className={styles.field}>
				Plan mensual (cubre cada evento hasta su tamaño)
				<div className={styles.choices} role="group" aria-label="Plan">
					{pricing.plan_tiers.map((t, i) => (
						<button
							key={t.max_attendees}
							type="button"
							className={styles.choice}
							aria-pressed={tier === i}
							onClick={() => setTier(i)}
						>
							<strong>{money(t.price)} / mes</strong>
							<small>Eventos {attendeesLabel(t.max_attendees)}</small>
						</button>
					))}
				</div>
			</div>

			<div className={styles.row}>
				<label className={styles.field} style={{ flex: "0 0 120px" }}>
					Meses
					<select
						value={months}
						onChange={(e) => setMonths(Number(e.target.value))}
					>
						{[1, 3, 6, 12].map((m) => (
							<option key={m} value={m}>
								{m}
							</option>
						))}
					</select>
				</label>
				<button
					className="btn-primary"
					style={{ alignSelf: "flex-end" }}
					onClick={() => void subscribe()}
					disabled={pending || !chosen}
				>
					{pending
						? "Firmando…"
						: `${billing.plan_active ? "Extender" : "Activar"} plan · ${money(
								(chosen?.price ?? 0n) * BigInt(months),
							)}`}
				</button>
			</div>
			{symbol === "USDC" && <UsdcWallet />}
		</div>
	)
}

/** USDC balance, with the trustline button and the test faucet when needed. */
const UsdcWallet = () => {
	const { address, balances, signTransaction, updateBalances } = useWallet()
	const { addNotification } = useNotification()
	const [busy, setBusy] = useState(false)
	const line = balances?.[USDC_BALANCE_KEY]

	const addLine = async () => {
		if (!address) return
		setBusy(true)
		try {
			await addUsdcTrustline(address, signTransaction)
			await updateBalances()
			addNotification(
				"Tu wallet ya acepta USDC. Ahora consigue USDC de prueba en el faucet de Circle.",
				"success",
			)
		} catch (e) {
			addNotification(errorMessage(e), "error")
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className={styles.note}>
			{line ? (
				<>
					Tu saldo: <strong>{line.balance} USDC</strong>. ¿Necesitas más? En
					testnet consíguelo gratis en{" "}
					<a href={USDC_FAUCET} target="_blank" rel="noreferrer">
						faucet.circle.com
					</a>{" "}
					(red Stellar Testnet).
				</>
			) : (
				<div className={styles.form}>
					<span>
						Los pagos son en USDC. Primero tu wallet tiene que aceptar USDC (una
						“trustline”, cuesta una comisión mínima de XLM).
					</span>
					<button
						className="btn-primary"
						onClick={() => void addLine()}
						disabled={busy}
					>
						{busy ? "Firmando…" : "Agregar USDC a mi wallet"}
					</button>
				</div>
			)}
		</div>
	)
}

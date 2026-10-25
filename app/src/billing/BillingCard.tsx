import { attendance } from "@stellar-scaffold/app-lib/clients"
import { BillingKind } from "attendance"
import { useState } from "react"
import { formatDate, useAttendanceWrite } from "../attendance/useAttendance"
import { BILLING_LABEL, formatXlm } from "../spaces/catalog"
import styles from "../spaces/saas.module.css"
import { useSpaceBilling } from "../spaces/useSaas"

/**
 * The space's plan: free quota used this month (segmented bar), what the next
 * event costs, and the button to pay the monthly plan.
 */
export const BillingCard = ({ spaceId }: { spaceId: number }) => {
	const { data: billing } = useSpaceBilling(spaceId)
	const { run, pending } = useAttendanceWrite()
	const [months, setMonths] = useState(1)

	if (!billing) return <div className={styles.card}>Cargando plan…</div>

	if (!billing.pricing_set)
		return (
			<div className={styles.card}>
				<h3>Plan</h3>
				<p className={styles.muted}>
					Los cobros todavía no están configurados en esta red: crear eventos es
					gratis y sin límite.
				</p>
			</div>
		)

	const free = billing.free_events_per_month
	const used = Math.min(billing.events_this_month, free)

	const subscribe = () =>
		run(
			(publicKey) =>
				attendance.subscribe(
					{ payer: publicKey, space_id: spaceId, months },
					{ publicKey },
				),
			`Plan mensual activo por ${months} ${months === 1 ? "mes" : "meses"}.`,
		)

	return (
		<div className={styles.card}>
			<div className={styles.row} style={{ justifyContent: "space-between" }}>
				<h3>{billing.plan_active ? "Plan mensual" : "Plan gratis"}</h3>
				{billing.plan_active && (
					<span className="sticker">
						Hasta {formatDate(billing.paid_until)}
					</span>
				)}
			</div>

			{!billing.plan_active && (
				<>
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
						{used} de {free} eventos gratis este mes · hasta{" "}
						{billing.free_claims_per_event} asistentes por evento gratis.
					</p>
				</>
			)}

			<div className={styles.statRow}>
				<div className={styles.stat}>
					<span>Próximo evento</span>
					<strong>
						{billing.next_event === BillingKind.Single
							? formatXlm(billing.next_event_cost)
							: "Gratis"}
					</strong>
				</div>
				<div className={styles.stat}>
					<span>Evento único</span>
					<strong>{formatXlm(billing.single_event_price)}</strong>
				</div>
				<div className={styles.stat}>
					<span>Plan mensual</span>
					<strong>{formatXlm(billing.monthly_price)}</strong>
				</div>
			</div>
			<p className={styles.muted}>
				{BILLING_LABEL[billing.next_event]}: el próximo evento{" "}
				{billing.next_event === BillingKind.Single
					? `se cobra al crearlo, en la misma firma, y no tiene tope de asistentes.`
					: billing.next_event === BillingKind.Plan
						? "lo cubre tu plan mensual, sin tope de asistentes."
						: "es gratis, con tope de asistentes."}
			</p>

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
					disabled={pending}
				>
					{pending
						? "Firmando…"
						: `${billing.plan_active ? "Extender" : "Activar"} plan · ${formatXlm(
								billing.monthly_price * BigInt(months),
							)}`}
				</button>
			</div>
			<p className={styles.muted}>
				Red de pruebas: se paga con XLM de prueba, sin dinero real.
			</p>
		</div>
	)
}

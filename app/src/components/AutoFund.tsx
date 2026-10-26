import {
	fetchBalances,
	fundAccount,
	stellarNetwork,
} from "@stellar-scaffold/app-lib"
import { useCallback, useEffect, useState } from "react"
import { useWallet } from "../hooks/useWallet"
import styles from "./AutoFund.module.css"

type Phase = "idle" | "funding" | "done" | "error"

/** Addresses already handled in this tab (avoids asking Friendbot twice). */
const handled = new Set<string>()

/**
 * New accounts (e.g. a Cavos wallet right after sign-in) don't exist on testnet
 * yet. As soon as we see one, ask Friendbot for test XLM so the user can pay
 * the tiny fees of creating events and claiming badges, and show progress as
 * a "refueling" banner.
 */
export const AutoFund = () => {
	const { address, updateBalances } = useWallet()
	const [phase, setPhase] = useState<Phase>("idle")

	const fund = useCallback(
		async (addr: string) => {
			setPhase("funding")
			const { ok } = await fundAccount(addr)
			// Friendbot refuses accounts that already exist: that's fine too.
			const funded = ok || Boolean((await fetchBalances(addr)).xlm)
			if (funded) {
				await updateBalances()
				setPhase("done")
				setTimeout(() => setPhase("idle"), 3500)
			} else {
				setPhase("error")
			}
		},
		[updateBalances],
	)

	useEffect(() => {
		if (!address || stellarNetwork === "PUBLIC" || handled.has(address)) return
		handled.add(address)
		void fetchBalances(address).then((b) => {
			if (!b.xlm) void fund(address)
		})
	}, [address, fund])

	if (phase === "idle") return null

	return (
		<div className={`${styles.banner} ${styles[phase]}`} role="status">
			<span className={styles.rocket} aria-hidden>
				{phase === "done" ? "✓" : phase === "error" ? "!" : "↑"}
			</span>
			<div className={styles.body}>
				<strong>
					{phase === "funding" && "Cargando combustible…"}
					{phase === "done" && "¡Listo! Tienes XLM de prueba"}
					{phase === "error" && "No pudimos cargar XLM de prueba"}
				</strong>
				<small>
					{phase === "funding" &&
						"Tu cuenta nueva recibe XLM de prueba gratis para pagar comisiones."}
					{phase === "done" && "Ya puedes reclamar insignias y crear eventos."}
					{phase === "error" && "Friendbot está ocupado. Inténtalo de nuevo."}
				</small>
				{phase === "funding" && <span className={styles.bar} />}
			</div>
			{phase === "error" && address && (
				<button onClick={() => void fund(address)}>Reintentar</button>
			)}
		</div>
	)
}

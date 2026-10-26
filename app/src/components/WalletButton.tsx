import {
	fundAccount,
	profileModal,
	shortAddress,
	stellarNetwork,
} from "@stellar-scaffold/app-lib"
import { useRef, useTransition } from "react"
import { useCavosState } from "../cavos/context"
import { useNotification } from "../hooks/useNotification"
import { useWallet } from "../hooks/useWallet"
import { explorerAccount } from "../lib/explorer"
import styles from "./Account.module.css"

/** Avatar with the account menu (balance, address, explorer, sign out). */
export const WalletButton = () => {
	const {
		address,
		connector,
		isPending,
		balances,
		disconnect,
		updateBalances,
	} = useWallet()
	const cavos = useCavosState()
	const { addNotification } = useNotification()
	const menu = useRef<HTMLDivElement>(null)
	const [funding, startFunding] = useTransition()

	// Signing in happens on the entry screen (src/entry/Login.tsx).
	if (!address) return null

	const label = cavos?.email && connector === "cavos" ? cavos.email : null
	const initial = label ? label.charAt(0).toUpperCase() : address.slice(-2)
	const close = () => menu.current?.hidePopover()

	const copy = () => {
		void navigator.clipboard.writeText(address)
		addNotification("Dirección copiada.", "success")
		close()
	}

	const refuel = () =>
		startFunding(async () => {
			const { ok } = await fundAccount(address)
			if (ok) await updateBalances()
			addNotification(
				ok
					? "Recibiste XLM de prueba ⛽"
					: "Tu cuenta ya tiene XLM de prueba (Friendbot solo da una vez).",
				ok ? "success" : "warning",
			)
		})

	return (
		<>
			<button
				className={styles.avatar}
				popoverTarget="account-menu"
				aria-label="Mi cuenta"
				style={{ opacity: isPending ? 0.6 : 1 }}
			>
				{initial}
			</button>
			<div id="account-menu" ref={menu} popover="auto" className={styles.menu}>
				<div className={styles.menuHead}>
					<span className={styles.avatarBig}>{initial}</span>
					<div>
						<strong>{label ?? "Tu wallet"}</strong>
						<code title={address}>{shortAddress(address)}</code>
					</div>
				</div>
				<div className={styles.balance}>
					<span>{balances?.xlm?.balance ?? "0"}</span> XLM de prueba
				</div>
				<div className={styles.menuItems}>
					<button onClick={copy}>Copiar mi dirección</button>
					<a
						href={explorerAccount(address)}
						target="_blank"
						rel="noreferrer"
						onClick={close}
					>
						Ver mi cuenta en el explorador ↗
					</a>
					{stellarNetwork !== "PUBLIC" && (
						<button onClick={refuel} disabled={funding}>
							{funding ? "Pidiendo XLM…" : "Pedir XLM de prueba"}
						</button>
					)}
					{connector === "extension" && (
						<button
							onClick={() => {
								close()
								void profileModal()
							}}
						>
							Cambiar de wallet
						</button>
					)}
					<button
						className={styles.danger}
						onClick={() => {
							close()
							void disconnect()
						}}
					>
						Cerrar sesión
					</button>
				</div>
			</div>
		</>
	)
}

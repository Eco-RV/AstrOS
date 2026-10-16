import {
	connectWallet,
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

/** Sign-in buttons when logged out; an avatar with an account menu when in. */
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

	// Signed in with Cavos on a browser that doesn't hold the wallet key yet.
	if (!address && cavos?.needsDeviceApproval) {
		return (
			<div className="wallet-connected">
				<button
					className="wallet-primary"
					onClick={() => void cavos.approveDevice()}
				>
					Desbloquear
				</button>
				<button className="btn-ghost" onClick={cavos.signOut}>
					Salir
				</button>
			</div>
		)
	}

	if (!address) {
		return (
			<div className="wallet-connected">
				{cavos && (
					<button
						className="wallet-primary"
						onClick={cavos.signIn}
						disabled={cavos.isLoading}
						title="Con tu correo o Google: crea tu cuenta de Stellar sin instalar nada (Cavos)"
					>
						{cavos.isLoading ? "Entrando…" : "Entrar"}
					</button>
				)}
				<button
					className={cavos ? styles.walletLink : undefined}
					onClick={() => void connectWallet()}
					disabled={isPending && !cavos}
					title="Freighter, xBull, Lobstr… (extensión de wallet)"
				>
					{cavos ? "Wallet" : "Conectar wallet"}
				</button>
			</div>
		)
	}

	const label = cavos?.email && connector === "cavos" ? cavos.email : null
	const initial = (label ?? "✦").charAt(0).toUpperCase()
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

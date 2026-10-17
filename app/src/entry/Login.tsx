import { connectWallet } from "@stellar-scaffold/app-lib"
import { Seal, Wordmark } from "../brand/Logo"
import { Starfield } from "../brand/Starfield"
import { useCavosState } from "../cavos/context"
import styles from "./entry.module.css"

/**
 * Entry screen: AstrOS can only be used with a Stellar wallet, either an
 * embedded one created with email/Google (Cavos) or an extension wallet.
 */
export const Login = () => {
	const cavos = useCavosState()

	return (
		<div className={styles.login}>
			<Starfield />
			<main className={styles.loginCard}>
				<div className={styles.loginSeal}>
					<Seal size={96} />
				</div>
				<Wordmark height={36} />
				<h1>Entra a la constelación</h1>
				<p className={styles.loginLead}>
					Para entrar necesitas una <strong>wallet de Stellar</strong>: tu llave
					y tu buzón en la blockchain, donde se guardan tus insignias.
				</p>

				{cavos?.needsDeviceApproval ? (
					<div className={styles.loginActions}>
						<p className={styles.loginNote}>
							Tu cuenta ya tiene una wallet, pero este dispositivo todavía no la
							puede abrir.
						</p>
						<button
							className={`wallet-primary ${styles.loginButton}`}
							onClick={() => void cavos.approveDevice()}
						>
							Desbloquear con passkey
						</button>
						<button className={styles.loginSecondary} onClick={cavos.signOut}>
							Usar otra cuenta
						</button>
					</div>
				) : (
					<div className={styles.loginActions}>
						{cavos && (
							<button
								className={`wallet-primary ${styles.loginButton}`}
								onClick={cavos.signIn}
								disabled={cavos.isLoading}
							>
								<span aria-hidden>✉</span> Continuar con correo o Google
							</button>
						)}
						<button
							className={styles.loginSecondary}
							onClick={() => void connectWallet()}
						>
							<span aria-hidden>◎</span> Conectar mi wallet
							<small>Freighter, xBull, Lobstr…</small>
						</button>
						{cavos && (
							<p className={styles.loginNote}>
								¿No tienes wallet? Con tu correo creamos una al instante, sin
								instalar nada.
							</p>
						)}
					</div>
				)}

				{cavos?.error && <p className={styles.loginError}>{cavos.error}</p>}
				<span className={styles.loginNetwork}>Red de pruebas de Stellar</span>
			</main>
		</div>
	)
}

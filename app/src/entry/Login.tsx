import { connectWallet } from "@stellar-scaffold/app-lib"
import { Blueprint } from "../brand/Blueprint"
import { Seal, Wordmark } from "../brand/Logo"
import { useCavosState } from "../cavos/context"
import styles from "./entry.module.css"

/**
 * Entry screen: AstrOS can only be used with a Stellar wallet, either an
 * embedded one created with email/Google (Cavos) or an extension wallet.
 * A square yellow card centered on the full-screen grid.
 */
export const Login = () => {
	const cavos = useCavosState()

	return (
		<div className={styles.login}>
			<Blueprint grid />
			<header className={styles.loginBar}>
				<span className={styles.loginBrand}>
					<Seal size={26} />
					<Wordmark height={18} />
				</span>
				<span className={styles.networkChip}>
					<span className="dot pulse" />
					Red de pruebas de Stellar
				</span>
			</header>

			<main className={styles.loginCard}>
				<h1>
					<b>Entra</b> a la constelación
				</h1>
				<p className={styles.loginSub}>
					Cada evento al que asistes, una insignia en tu wallet
				</p>

				{cavos?.needsDeviceApproval ? (
					<div className={styles.loginActions}>
						<p className={styles.loginNote}>
							Tu cuenta ya tiene una wallet, pero este dispositivo todavía no la
							puede abrir.
						</p>
						<button
							className={styles.loginButton}
							onClick={() => void cavos.approveDevice()}
						>
							Desbloquear con passkey
						</button>
						<button className={styles.loginButton} onClick={cavos.signOut}>
							Usar otra cuenta
						</button>
					</div>
				) : (
					<div className={styles.loginActions}>
						{cavos && (
							<button
								className={styles.loginButton}
								onClick={cavos.signIn}
								disabled={cavos.isLoading}
							>
								<span aria-hidden>✉</span> Continuar con correo o Google
							</button>
						)}
						{cavos && <hr className={styles.loginRule} />}
						<button
							className={styles.loginButton}
							onClick={() => void connectWallet()}
						>
							<span aria-hidden>◎</span> Conectar mi wallet
							<small>Freighter, xBull, Lobstr…</small>
						</button>
					</div>
				)}

				<p className={styles.loginLead}>
					Para entrar necesitas una <strong>wallet de Stellar</strong>: tu llave
					y tu buzón en la blockchain, donde se guardan tus insignias.
					{cavos &&
						!cavos.needsDeviceApproval &&
						" ¿No tienes wallet? Con tu correo creamos una al instante, sin instalar nada."}
				</p>

				{cavos?.error && (
					<p className={styles.loginError} role="alert">
						{cavos.error}
					</p>
				)}
			</main>
		</div>
	)
}

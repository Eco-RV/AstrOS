import { CavosProvider, useCavos } from "@cavos/kit/react"
import { type ReactNode, useMemo } from "react"
import {
	CAVOS_APP_SALT,
	cavosAppId,
	cavosEnvironment,
	cavosNetwork,
	isCavosConfigured,
} from "./config"
import { CavosContext, type CavosState } from "./context"

/**
 * Mounts Cavos (embedded wallets) when PUBLIC_CAVOS_APP_ID is set, and exposes
 * its state through `useCavosState()`. WalletProvider turns it into the same
 * `useWallet()` API the rest of the app already uses.
 */
/** Current value of a palette token (the Cavos modal needs a literal color). */
const paletteColor = (token: string) =>
	getComputedStyle(document.documentElement).getPropertyValue(token).trim()

export const CavosRoot = ({ children }: { children: ReactNode }) => {
	if (!isCavosConfigured || !cavosNetwork) return children

	return (
		<CavosProvider
			config={{
				appId: cavosAppId,
				environment: cavosEnvironment,
				chains: ["stellar"],
				defaultChain: "stellar",
				network: cavosNetwork,
				appSalt: CAVOS_APP_SALT,
				// One chain + passkey restore: works without enabling social
				// recovery in the dashboard. Signing up never asks for a passkey.
				deviceApproval: "passkey",
				// The @cavos/kit 0.4.2 login modal ignores this and sends the current
				// page (origin + pathname, e.g. "http://localhost:5173/") as the Google
				// redirect: register that exact URL in the dashboard's Callback URLs.
				redirectUri: window.location.origin,
			}}
			modal={{
				appName: "AstrOS",
				providers: ["email", "google"],
				// The modal takes a literal color: read it from the palette token.
				primaryColor: paletteColor("--void"),
			}}
		>
			<CavosBridge>{children}</CavosBridge>
		</CavosProvider>
	)
}

/** Where to go back to after signing in from a page other than "/". */
export const RETURN_KEY = "astros:return-after-login"

const CavosBridge = ({ children }: { children: ReactNode }) => {
	const cavos = useCavos()
	const wallet = cavos.wallet?.chain === "stellar" ? cavos.wallet : null
	const { needsDeviceApproval, hasPasskey } = cavos.walletStatus

	const value = useMemo<CavosState>(
		() => ({
			isLoading: cavos.isLoading,
			isAuthenticated: cavos.isAuthenticated,
			address: wallet?.address,
			email: cavos.user?.email,
			needsDeviceApproval,
			error: cavos.authError,
			signIn: () => {
				// The @cavos/kit 0.4.2 Google login sends the current page as its
				// redirect, and only the site root is registered in the Cavos
				// dashboard. Sign in from "/" and come back here afterwards
				// (EntryGate reads RETURN_KEY).
				const here = window.location.pathname + window.location.search
				if (here !== "/") {
					try {
						sessionStorage.setItem(RETURN_KEY, here)
					} catch {
						// Storage blocked: the user just lands on the home page.
					}
					window.history.replaceState(null, "", "/")
				}
				cavos.openModal()
			},
			signOut: cavos.logout,
			approveDevice: cavos.approveDeviceWithPasskey,
			addPasskey:
				cavos.passkeySupported && !hasPasskey
					? cavos.enrollPasskeyDefault
					: undefined,
			// `signXdr` is Cavos' drop-in for a wallet's signTransaction: it signs
			// classic txs and this account's Soroban auth entries, without submitting.
			signTransaction: wallet
				? async (xdr) => ({
						signedTxXdr: await wallet.signXdr(xdr),
						signerAddress: wallet.address,
					})
				: undefined,
		}),
		[cavos, wallet, needsDeviceApproval, hasPasskey],
	)

	return <CavosContext value={value}>{children}</CavosContext>
}

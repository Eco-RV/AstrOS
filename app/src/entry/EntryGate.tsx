import { type ReactNode, useEffect, useRef, useState } from "react"
import { useCavosState } from "../cavos/context"
import { useWallet } from "../hooks/useWallet"
import { Login } from "./Login"
import { Splash } from "./Splash"

/** Minimum time the loading screen stays up when the app opens. */
const OPENING_MS = 1600
/** How long the welcome screen shows right after signing in. */
const WELCOME_MS = 1300

/**
 * Nobody enters AstrOS without a wallet. On every visit it shows the loading
 * screen while the wallet session is restored, then either the app or the
 * login screen. Signing in shows a short welcome before the app.
 */
export const EntryGate = ({ children }: { children: ReactNode }) => {
	const { address, isPending } = useWallet()
	const cavos = useCavosState()
	const [opening, setOpening] = useState(true)
	const [welcome, setWelcome] = useState(false)
	const sawLogin = useRef(false)

	useEffect(() => {
		const timer = setTimeout(() => setOpening(false), OPENING_MS)
		return () => clearTimeout(timer)
	}, [])

	// Cavos is signed in but the wallet itself is still being opened.
	const restoringWallet = Boolean(
		cavos?.isAuthenticated && !address && !cavos.needsDeviceApproval,
	)
	// Once the login screen is up, `isPending` also covers the Cavos login
	// modal being open: keep the login screen under it instead of the splash.
	const resolving = !sawLogin.current && isPending
	const showLogin = !opening && !resolving && !restoringWallet && !address

	if (showLogin) sawLogin.current = true

	// After signing in from the login screen, welcome the user in.
	useEffect(() => {
		if (!address || !sawLogin.current) return
		sawLogin.current = false
		setWelcome(true)
		const timer = setTimeout(() => setWelcome(false), WELCOME_MS)
		return () => clearTimeout(timer)
	}, [address])

	if (opening || (resolving && !address)) return <Splash />
	if (restoringWallet) return <Splash message="Abriendo tu wallet…" />
	if (welcome) return <Splash message="Bienvenido a la constelación ✦" />
	if (!address) return <Login />
	return children
}

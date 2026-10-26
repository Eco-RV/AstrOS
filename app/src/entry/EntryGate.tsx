import { type ReactNode, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { RETURN_KEY } from "../cavos/CavosRoot"
import { useCavosState } from "../cavos/context"
import { useWallet } from "../hooks/useWallet"
import { Login } from "./Login"
import { Splash } from "./Splash"

/** How long the opening loading screen stays up (once per browser session). */
const OPENING_MS = 1300
/** How long the welcome screen shows right after signing in. */
const WELCOME_MS = 1300
const SEEN_KEY = "astros:opening-seen"

const openingSeen = () => {
	try {
		return sessionStorage.getItem(SEEN_KEY) === "1"
	} catch {
		return false
	}
}

/**
 * Nobody enters AstrOS without a wallet. The first visit of a session shows
 * the loading screen (skippable with a click); then, while the wallet session
 * is restored, a short "connecting" screen, and finally either the app or the
 * login screen. Signing in shows a short welcome before the app.
 */
export const EntryGate = ({ children }: { children: ReactNode }) => {
	const { address, isPending } = useWallet()
	const cavos = useCavosState()
	const [opening, setOpening] = useState(() => !openingSeen())
	const [welcome, setWelcome] = useState(false)
	const sawLogin = useRef(false)

	useEffect(() => {
		if (!opening) return
		try {
			sessionStorage.setItem(SEEN_KEY, "1")
		} catch {
			// Storage blocked: the opening just shows again next time.
		}
		const timer = setTimeout(() => setOpening(false), OPENING_MS)
		return () => clearTimeout(timer)
	}, [opening])

	// Cavos is signed in but the wallet itself is still being opened.
	const restoringWallet = Boolean(
		cavos?.isAuthenticated && !address && !cavos.needsDeviceApproval,
	)
	// Once the login screen is up, `isPending` also covers the Cavos login
	// modal being open: keep the login screen under it instead of the splash.
	const resolving = !sawLogin.current && isPending
	const showLogin = !opening && !resolving && !restoringWallet && !address

	if (showLogin) sawLogin.current = true

	// Signing in with Cavos starts from "/" (see CavosRoot): once the wallet is
	// open, go back to the page the user was on.
	const navigate = useNavigate()
	useEffect(() => {
		if (!address) return
		let back: string | null = null
		try {
			back = sessionStorage.getItem(RETURN_KEY)
			sessionStorage.removeItem(RETURN_KEY)
		} catch {
			// Storage blocked: stay on the home page.
		}
		if (back?.startsWith("/")) void navigate(back, { replace: true })
	}, [address, navigate])

	// After signing in from the login screen, welcome the user in.
	useEffect(() => {
		if (!address || !sawLogin.current) return
		sawLogin.current = false
		setWelcome(true)
		const timer = setTimeout(() => setWelcome(false), WELCOME_MS)
		return () => clearTimeout(timer)
	}, [address])

	if (opening)
		return <Splash duration={OPENING_MS} onSkip={() => setOpening(false)} />
	if (resolving && !address) return <Splash message="Conectando con Stellar…" />
	if (restoringWallet) return <Splash message="Abriendo tu wallet…" />
	if (welcome) return <Splash message="Bienvenido a la constelación" />
	if (!address) return <Login />
	return children
}

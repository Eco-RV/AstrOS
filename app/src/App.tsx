import { NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom"
import styles from "./App.module.css"
import { Blueprint } from "./brand/Blueprint"
import { Seal, Wordmark } from "./brand/Logo"
import { AutoFund } from "./components/AutoFund"
import ConnectAccount from "./components/ConnectAccount"
import { EntryGate } from "./entry/EntryGate"
import { useMagnetic } from "./motion/motion"
import CreateEvent from "./pages/CreateEvent"
import EventDetail from "./pages/EventDetail"
import Events from "./pages/Events"
import MyBadges from "./pages/MyBadges"
import Projector from "./pages/Projector"

function App() {
	return (
		<Routes>
			<Route
				element={
					<EntryGate>
						<AppLayout />
					</EntryGate>
				}
			>
				<Route path="/" element={<Events />} />
				<Route path="/crear" element={<CreateEvent />} />
				<Route path="/evento/:id" element={<EventDetail />} />
				<Route path="/insignias" element={<MyBadges />} />
			</Route>
			{/* Full-screen, no header or tab bar: for the classroom projector. */}
			<Route path="/evento/:id/proyectar" element={<Projector />} />
		</Routes>
	)
}

const navClass = ({ isActive }: { isActive: boolean }) =>
	isActive ? styles.active : ""

const AppLayout = () => {
	// Re-mount the page on navigation so its entrance animation plays.
	const { pathname } = useLocation()
	const magnetic = useMagnetic<HTMLAnchorElement>(0.2)

	return (
		<div className={styles.AppLayout}>
			<Blueprint />
			<header className={styles.header}>
				<div className={styles.headerInner}>
					<NavLink to="/" className={styles.logo} aria-label="AstrOS, inicio">
						<Seal size={30} spin />
						<Wordmark height={20} />
					</NavLink>
					<nav className={styles.headerNav} aria-label="Principal">
						<NavLink to="/" end className={navClass}>
							Eventos
						</NavLink>
						<NavLink to="/crear" className={navClass}>
							Crear evento
						</NavLink>
					</nav>
					<div className={styles.headerEnd}>
						<NavLink
							ref={magnetic}
							to="/insignias"
							className={`btn btn-alert ${styles.mainAction}`}
						>
							→ Mi constelación
						</NavLink>
						<ConnectAccount />
					</div>
				</div>
			</header>

			<main className={styles.main} key={pathname}>
				<Outlet />
			</main>

			<footer className={styles.footer}>
				<span>AstrOS · insignias de asistencia en Stellar</span>
				<span className="chip">
					<span className="dot" style={{ color: "var(--signal)" }} />
					Testnet
				</span>
			</footer>

			<AutoFund />

			<nav className={styles.tabbar} aria-label="Principal">
				<NavLink to="/" end className={navClass}>
					<TabIcon d="M4 6h16M4 12h16M4 18h10" />
					Eventos
				</NavLink>
				<NavLink to="/crear" className={navClass}>
					<TabIcon d="M12 5v14M5 12h14" />
					Crear
				</NavLink>
				<NavLink to="/insignias" className={navClass}>
					<TabIcon d="M5 18l4-7 5 3 5-9M5 18h.01M9 11h.01M14 14h.01M19 5h.01" />
					Constelación
				</NavLink>
			</nav>
		</div>
	)
}

const TabIcon = ({ d }: { d: string }) => (
	<svg
		viewBox="0 0 24 24"
		width="20"
		height="20"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="square"
		strokeLinejoin="miter"
		aria-hidden
	>
		<path d={d} />
	</svg>
)

export default App

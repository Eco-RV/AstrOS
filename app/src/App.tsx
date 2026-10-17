import { NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom"
import styles from "./App.module.css"
import { Seal, Wordmark } from "./brand/Logo"
import { Starfield } from "./brand/Starfield"
import { AutoFund } from "./components/AutoFund"
import ConnectAccount from "./components/ConnectAccount"
import { EntryGate } from "./entry/EntryGate"
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

	return (
		<div className={styles.AppLayout}>
			<Starfield />
			<header className={styles.header}>
				<NavLink to="/" className={styles.logo} aria-label="AstrOS, inicio">
					<Seal size={34} className={styles.seal} />
					<Wordmark height={26} />
				</NavLink>
				<nav className={styles.headerNav} aria-label="Principal">
					<NavLink to="/" end className={navClass}>
						Eventos
					</NavLink>
					<NavLink to="/crear" className={navClass}>
						Crear evento
					</NavLink>
					<NavLink to="/insignias" className={navClass}>
						Mi constelación
					</NavLink>
				</nav>
				<ConnectAccount />
			</header>

			<main className={styles.main} key={pathname}>
				<Outlet />
			</main>

			<footer className={styles.footer}>
				AstrOS · insignias de asistencia en Stellar <span>testnet</span>
			</footer>

			<AutoFund />

			<nav className={styles.tabbar} aria-label="Principal">
				<NavLink to="/" end className={navClass}>
					<TabIcon d="M4 6h16M4 12h16M4 18h10" />
					Eventos
				</NavLink>
				<NavLink
					to="/crear"
					className={({ isActive }) =>
						`${styles.createTab} ${isActive ? styles.active : ""}`
					}
					aria-label="Crear evento"
				>
					<span className={styles.createButton}>＋</span>
					Crear
				</NavLink>
				<NavLink to="/insignias" className={navClass}>
					<TabIcon d="M5 18l4-7 5 3 5-9M5 18h.01M9 11h.01M14 14h.01M19 5h.01" />
					Mi constelación
				</NavLink>
			</nav>
		</div>
	)
}

const TabIcon = ({ d }: { d: string }) => (
	<svg
		viewBox="0 0 24 24"
		width="22"
		height="22"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden
	>
		<path d={d} />
	</svg>
)

export default App

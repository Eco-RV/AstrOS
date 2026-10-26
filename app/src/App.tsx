import {
	Navigate,
	NavLink,
	Outlet,
	Route,
	Routes,
	useLocation,
} from "react-router-dom"
import styles from "./App.module.css"
import { Blueprint } from "./brand/Blueprint"
import { Seal, Wordmark } from "./brand/Logo"
import { AutoFund } from "./components/AutoFund"
import ConnectAccount from "./components/ConnectAccount"
import { EntryGate } from "./entry/EntryGate"
import { useMagnetic } from "./motion/motion"
import Admin from "./pages/Admin"
import Certificate from "./pages/Certificate"
import CreateEvent from "./pages/CreateEvent"
import EventDetail from "./pages/EventDetail"
import Events from "./pages/Events"
import MyBadges from "./pages/MyBadges"
import Organize from "./pages/Organize"
import OrganizeEvent from "./pages/OrganizeEvent"
import Projector from "./pages/Projector"
import SpacePage from "./pages/SpacePage"
import { useRole } from "./spaces/useSaas"

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
				<Route path="/s/:slug" element={<SpacePage />} />
				<Route path="/evento/:id" element={<EventDetail />} />
				<Route path="/insignias" element={<MyBadges />} />
				<Route path="/organizar" element={<Organize />} />
				<Route path="/organizar/:spaceId/nuevo" element={<CreateEvent />} />
				<Route path="/organizar/evento/:id" element={<OrganizeEvent />} />
				<Route path="/admin" element={<Admin />} />
				{/* 2.0: events are created inside a space now. */}
				<Route path="/crear" element={<Navigate to="/organizar" replace />} />
			</Route>
			{/* Full-screen, no header or tab bar: for the classroom projector. */}
			<Route path="/evento/:id/proyectar" element={<Projector />} />
			{/* Public, no login: anyone can verify a certificate. */}
			<Route path="/certificado/:id/:address" element={<Certificate />} />
		</Routes>
	)
}

const navClass = ({ isActive }: { isActive: boolean }) =>
	isActive ? styles.active : ""

const AppLayout = () => {
	// Re-mount the page on navigation so its entrance animation plays.
	const { pathname } = useLocation()
	const magnetic = useMagnetic<HTMLAnchorElement>(0.2)
	const { isModerator } = useRole()

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
						<NavLink to="/organizar" className={navClass}>
							Organizar
						</NavLink>
						{isModerator && (
							<NavLink to="/admin" className={navClass}>
								Admin
							</NavLink>
						)}
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
				<NavLink to="/organizar" className={navClass}>
					<TabIcon d="M12 5v14M5 12h14" />
					Organizar
				</NavLink>
				<NavLink to="/insignias" className={navClass}>
					<TabIcon d="M5 18l4-7 5 3 5-9M5 18h.01M9 11h.01M14 14h.01M19 5h.01" />
					Constelación
				</NavLink>
				{isModerator && (
					<NavLink to="/admin" className={navClass}>
						<TabIcon d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />
						Admin
					</NavLink>
				)}
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

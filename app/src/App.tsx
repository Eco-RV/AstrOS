import { labPrefix } from "@stellar-scaffold/app-lib"
import { NavLink, Outlet, Route, Routes } from "react-router-dom"
import styles from "./App.module.css"
import ConnectAccount from "./components/ConnectAccount"
import Debug from "./pages/Debug"
import EventDetail from "./pages/EventDetail"
import Events from "./pages/Events"
import MyBadges from "./pages/MyBadges"

function App() {
	return (
		<Routes>
			<Route element={<AppLayout />}>
				<Route path="/" element={<Events />} />
				<Route path="/evento/:id" element={<EventDetail />} />
				<Route path="/insignias" element={<MyBadges />} />
				<Route path="/debug" element={<Debug />} />
				<Route path="/debug/:contractName" element={<Debug />} />
			</Route>
		</Routes>
	)
}

const AppLayout = () => (
	<div className={styles.AppLayout}>
		<header className={styles.header}>
			<NavLink to="/" className={styles.logo}>
				✦ AstrOS
			</NavLink>
			<nav className={styles.headerNav}>
				<NavLink
					to="/"
					end
					className={({ isActive }) => (isActive ? styles.active : "")}
				>
					Eventos
				</NavLink>
				<NavLink
					to="/insignias"
					className={({ isActive }) => (isActive ? styles.active : "")}
				>
					Mis insignias
				</NavLink>
				<NavLink
					to="/debug"
					className={({ isActive }) => (isActive ? styles.active : "")}
				>
					Contratos
				</NavLink>
				<a href={labPrefix()} target="_blank" rel="noreferrer">
					Explorador
				</a>
			</nav>
			<ConnectAccount />
		</header>

		<main className={styles.main}>
			<Outlet />
		</main>

		<footer className={styles.footer}>
			<nav className={styles.footerNav}>
				<a
					href="https://github.com/stellar-scaffold/cli"
					target="_blank"
					rel="noreferrer"
				>
					Hecho con Scaffold Stellar
				</a>
				<a href="https://stellarscaffold.org" target="_blank" rel="noreferrer">
					Docs de Scaffold
				</a>
				<a
					href="https://developers.stellar.org"
					target="_blank"
					rel="noreferrer"
				>
					Docs de Stellar
				</a>
			</nav>
		</footer>
	</div>
)

export default App

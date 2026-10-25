// Demo data for AstrOS 2.1.0 on the DEVELOPMENT contract (testnet, disposable).
//
//   node scripts/seed-demo.mjs [G…moderator]
//
// With the local `me` identity (the deployer and admin of the development
// contract, never a browser wallet) it:
//   1. sets prices (XLM on testnet): 2 free events/month with up to 50
//      attendees, 10 XLM per extra event, 50 XLM per month;
//   2. creates three spaces (barbershop, university, community) and verifies
//      the first two, so the public home shows them and the third one shows
//      the "not verified" flow;
//   3. creates events with each proof method;
//   4. optionally makes the given wallet a moderator (to see /admin).
//
// Rotating-QR events are created without a key: the organizer creates it from
// the console on the device that will project (keys never leave a browser).
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const appDir = resolve(root, "app")
const XLM_SAC = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
const XLM = 10_000_000n

const clients = readFileSync(resolve(root, "app-lib/clients/index.ts"), "utf8")
const contractId = clients.match(
	/attendance = new Attendance\(\{[\s\S]*?contractId: "([A-Z0-9]{56})"/,
)?.[1]
if (!contractId) {
	console.error(
		"No encontré el contrato attendance de development. Corre antes `npm run contracts:build`.",
	)
	process.exit(1)
}

const stellar = (args) =>
	execFileSync("stellar", args, { cwd: appDir, encoding: "utf8" }).trim()

const invoke = (fn, params) => {
	const args = ["contract", "invoke", "--id", contractId, "--source", "me"]
	args.push("--network", "testnet", "--", fn)
	for (const [key, value] of Object.entries(params)) {
		// The CLI refuses an empty value; `""` (JSON) is an empty String.
		const text =
			value === ""
				? '""'
				: typeof value === "string"
					? value
					: JSON.stringify(value)
		args.push(`--${key}=${text}`)
	}
	const out = stellar(args)
	console.log(`✓ ${fn}${out ? ` → ${out}` : ""}`)
	return out
}

const me = stellar(["keys", "address", "me"])
const now = Math.floor(Date.now() / 1000)
const HOUR = 3600
const DAY = 24 * HOUR

console.log(`Contrato: ${contractId}\nAdmin (me): ${me}\n`)

invoke("set_pricing", {
	pricing: {
		token: XLM_SAC,
		treasury: me,
		free_events_per_month: 2,
		free_claims_per_event: 50,
		monthly_price: String(50n * XLM),
		single_event_price: String(10n * XLM),
	},
})

// Category: 0 Universidad, 1 Empresa, 2 Comunidad, 3 Belleza, 4 Bienestar,
// 5 Conferencia, 6 Otro. Accent: index into ACCENTS (app/src/spaces/catalog.ts).
const SPACES = [
	{
		slug: "barberia-central",
		name: "Barbería Central",
		description: "Cortes clásicos, barba y talleres para barberos en San José.",
		category: 3,
		accent: 3,
		verify: true,
	},
	{
		slug: "universidad-demo",
		name: "Universidad Demo",
		description:
			"Clases abiertas, talleres y graduaciones con certificado verificable.",
		category: 0,
		accent: 4,
		verify: true,
	},
	{
		slug: "comunidad-stellar-cr",
		name: "Comunidad Stellar CR",
		description: "Meetups de la comunidad Stellar en Costa Rica.",
		category: 2,
		accent: 0,
		verify: false,
	},
]

const ids = {}
for (const s of SPACES) {
	const out = invoke("create_space", {
		owner: me,
		slug: s.slug,
		name: s.name,
		description: s.description,
		category: s.category,
		logo_url: "",
		accent: s.accent,
	})
	ids[s.slug] = Number(out)
	if (s.verify)
		invoke("set_space_verified", {
			moderator: me,
			space_id: ids[s.slug],
			verified: true,
		})
}

// Proof: 0 QR rotativo, 1 check-in del staff, 2 aprobación. Mode: 0 presencial,
// 1 virtual, 2 híbrido.
const event = (space, e) =>
	invoke("create_event_v2", {
		organizer: me,
		space_id: ids[space],
		input: {
			name: e.name,
			description: e.description,
			location: e.location,
			image_url: "",
			starts_at: e.starts_at,
			ends_at: e.ends_at,
			max_claims: 0,
			mode: e.mode,
			proof: e.proof,
			event_key: null,
		},
	})

event("barberia-central", {
	name: "Taller de barba y navaja",
	description: "Taller práctico para barberos. Check-in en la entrada.",
	location: "Barbería Central, San José",
	starts_at: now - HOUR,
	ends_at: now + 5 * HOUR,
	mode: 0,
	proof: 1,
})
event("barberia-central", {
	name: "Noche de barberos",
	description: "Exhibición y networking. QR en pantalla.",
	location: "Barbería Central, San José",
	starts_at: now + 2 * DAY,
	ends_at: now + 2 * DAY + 4 * HOUR,
	mode: 0,
	proof: 0,
})
event("universidad-demo", {
	name: "Clase abierta: blockchain para todos",
	description: "Clase virtual por Zoom. El docente aprueba la asistencia.",
	location: "En línea",
	starts_at: now - HOUR,
	ends_at: now + DAY,
	mode: 1,
	proof: 2,
})
event("universidad-demo", {
	name: "Graduación del bootcamp",
	description: "Ceremonia presencial con check-in del staff.",
	location: "Auditorio principal",
	starts_at: now + 7 * DAY,
	ends_at: now + 7 * DAY + 3 * HOUR,
	mode: 0,
	proof: 1,
})
event("comunidad-stellar-cr", {
	name: "Meetup Stellar CR",
	description: "Charla y comunidad. QR rotativo en el proyector.",
	location: "San José",
	starts_at: now - HOUR,
	ends_at: now + 3 * HOUR,
	mode: 0,
	proof: 0,
})

const moderator = process.argv[2]
if (moderator) invoke("add_moderator", { moderator })

console.log(
	"\nListo. Los espacios verificados ya salen en el inicio; Comunidad Stellar CR queda por verificar en /admin.",
)

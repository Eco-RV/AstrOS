import { AttendMode, BillingKind, Category, ProofMode } from "attendance"

/** Business categories (same order as `Category` in contracts/attendance). */
export const CATEGORIES: { id: Category; label: string; hint: string }[] = [
	{
		id: Category.Universidad,
		label: "Universidad",
		hint: "Clases, talleres, graduaciones",
	},
	{
		id: Category.Empresa,
		label: "Empresa",
		hint: "Capacitaciones, onboarding, equipos",
	},
	{
		id: Category.Comunidad,
		label: "Comunidad",
		hint: "Meetups, clubes, voluntariado",
	},
	{ id: Category.Belleza, label: "Belleza", hint: "Barbería, uñas, estética" },
	{ id: Category.Bienestar, label: "Bienestar", hint: "Gimnasio, yoga, salud" },
	{
		id: Category.Conferencia,
		label: "Conferencia",
		hint: "Congresos, hackathons, ferias",
	},
	{ id: Category.Otro, label: "Otro", hint: "Cualquier otro negocio" },
]

export const categoryLabel = (c: Category) =>
	CATEGORIES.find((x) => x.id === c)?.label ?? "Otro"

/**
 * Accent colors a space can pick (index = `Space.accent`). Every one keeps a
 * contrast ≥ 7:1 with --void, so dark text on them and them on dark both read.
 */
export const ACCENTS: { name: string; color: string }[] = [
	{ name: "Nebula", color: "#B9A4FF" },
	{ name: "Rosa", color: "#FF8FC4" },
	{ name: "Menta", color: "#7CF2C0" },
	{ name: "Ámbar", color: "#FFC857" },
	{ name: "Cielo", color: "#8CD3FF" },
	{ name: "Lima", color: "#D7F36B" },
]

export const accentColor = (i: number) =>
	(ACCENTS[i] ?? ACCENTS[0])?.color ?? "#B9A4FF"

export const PROOF_MODES: {
	id: ProofMode
	label: string
	short: string
	hint: string
}[] = [
	{
		id: ProofMode.CheckInStaff,
		label: "Check-in del staff",
		short: "Check-in",
		hint: "Tu equipo escanea el QR de cada asistente y firma por él. El más seguro: una persona confirma a otra.",
	},
	{
		id: ProofMode.QrRotativo,
		label: "QR rotativo",
		short: "QR rotativo",
		hint: "El proyector muestra un QR que cambia cada 30 s y vale 2 minutos. Una foto compartida deja de servir.",
	},
	{
		id: ProofMode.Aprobacion,
		label: "Aprobación (virtual)",
		short: "Aprobación",
		hint: "Los asistentes piden su insignia y tú apruebas la lista, por ejemplo contra la asistencia de Zoom.",
	},
]

export const proofLabel = (p: ProofMode) =>
	PROOF_MODES.find((x) => x.id === p)?.label ?? "—"

export const MODES: { id: AttendMode; label: string }[] = [
	{ id: AttendMode.Presencial, label: "Presencial" },
	{ id: AttendMode.Virtual, label: "Virtual" },
	{ id: AttendMode.Hibrido, label: "Híbrido" },
]

export const modeLabel = (m: AttendMode) =>
	MODES.find((x) => x.id === m)?.label ?? "—"

export const BILLING_LABEL: Record<BillingKind, string> = {
	[BillingKind.Free]: "Plan gratis",
	[BillingKind.Plan]: "Plan mensual",
	[BillingKind.Single]: "Evento único",
}

/** Token amounts have 7 decimals: 10_000_000 = 1 XLM. */
export const formatXlm = (amount: bigint | number) => {
	const value = Number(amount) / 10_000_000
	return `${value.toLocaleString("es", { maximumFractionDigits: 2 })} XLM`
}

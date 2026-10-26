import { attendance } from "@stellar-scaffold/app-lib/clients"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useNotification } from "../hooks/useNotification"
import { useWallet } from "../hooks/useWallet"
import { errorMessage } from "../lib/errors"

/**
 * Reads and writes the `attendance` Soroban contract (contracts/attendance)
 * through the TypeScript client Scaffold generates.
 *
 * - Reads are free simulations: no wallet or signature needed.
 * - Writes are built with the user's address, checked for contract errors in
 *   the simulation, then signed with `useWallet().signTransaction` (Cavos or
 *   extension) and sent.
 */

export type AttendanceEvent = Awaited<
	ReturnType<typeof attendance.latest_events>
>["result"][number]
export type Badge = Awaited<
	ReturnType<typeof attendance.badges_of>
>["result"][number]

export type EventStatus = "open" | "upcoming" | "ended" | "closed" | "soldOut"

export const STATUS_LABEL: Record<EventStatus, string> = {
	open: "Abierto",
	upcoming: "Próximamente",
	ended: "Terminado",
	closed: "Cerrado",
	soldOut: "Agotado",
}

const nowSeconds = () => Math.floor(Date.now() / 1000)

export function eventStatus(event: AttendanceEvent): EventStatus {
	const now = nowSeconds()
	if (event.closed) return "closed"
	if (now > Number(event.ends_at)) return "ended"
	if (event.max_claims > 0 && event.claimed >= event.max_claims)
		return "soldOut"
	if (now < Number(event.starts_at)) return "upcoming"
	return "open"
}

const dateFormat = new Intl.DateTimeFormat("es", {
	dateStyle: "medium",
	timeStyle: "short",
})

/** Unix seconds (bigint from the contract) → readable local date. */
export const formatDate = (seconds: bigint | number) =>
	dateFormat.format(new Date(Number(seconds) * 1000))

const KEY = "attendance"

export const useLatestEvents = () =>
	useQuery({
		queryKey: [KEY, "latest"],
		queryFn: async () => (await attendance.latest_events({ limit: 50 })).result,
	})

/** `refetchInterval` (ms) keeps it live, e.g. on the projector screen. */
export const useEvent = (
	eventId: number,
	enabled = true,
	refetchInterval?: number,
) =>
	useQuery({
		queryKey: [KEY, "event", eventId],
		enabled: enabled && Number.isInteger(eventId) && eventId >= 0,
		refetchInterval,
		queryFn: async () => {
			const r = (await attendance.get_event({ event_id: eventId })).result
			if (r.isErr()) throw new Error(r.unwrapErr().message)
			return r.unwrap()
		},
	})

export const useMyBadge = (eventId: number, owner?: string) =>
	useQuery({
		queryKey: [KEY, "badge", eventId, owner],
		enabled: Boolean(owner),
		queryFn: async () =>
			(await attendance.get_badge({ event_id: eventId, attendee: owner! }))
				.result ?? null,
	})

export const useBadgesOf = (owner?: string) =>
	useQuery({
		queryKey: [KEY, "badges", owner],
		enabled: Boolean(owner),
		queryFn: async () => (await attendance.badges_of({ owner: owner! })).result,
	})

/** Minimal shape of a generated-client transaction whose fn returns Result<T>. */
interface ContractTx<T> {
	result: {
		isErr(): boolean
		unwrapErr(): { message: string }
		unwrap(): T
	}
	signAndSend(opts: {
		signTransaction: ReturnType<typeof useWallet>["signTransaction"]
	}): Promise<unknown>
}

/** Turn common wallet/network failures into a friendly Spanish message. */
function friendlyError(e: unknown): string {
	const msg = errorMessage(e)
	if (/account not found|resource missing|not found: .*account/i.test(msg))
		return "Tu cuenta todavía no tiene XLM de prueba: espera a que termine la carga (o pídelos desde tu perfil) y vuelve a intentarlo."
	if (/rejected|declined|cancel/i.test(msg)) return "Cancelaste la firma."
	// The network refused the signature: signed by another account or network.
	if (/txBadAuth/.test(msg))
		return "La red rechazó la firma: tu wallet firmó con otra cuenta o en otra red. Revisa que tu wallet tenga activa la misma cuenta que ves en AstrOS y que esté en Testnet."
	// claim_v2: the rotating-QR signature didn't verify (tampered or old key).
	if (/ed25519|signature.*(invalid|verif)|Crypto, InvalidInput/i.test(msg))
		return "El código QR no es válido. Escanea el QR que se proyecta ahora en el evento."
	// The one-off event payment or the plan: not enough XLM.
	if (/balance|insufficient|underfunded/i.test(msg))
		return "No tienes XLM de prueba suficiente para este pago. Pide más desde tu perfil."
	return msg
}

/**
 * Run a contract write: simulate → check contract errors → sign → send →
 * refresh every attendance query.
 */
export function useAttendanceWrite() {
	const { address, signTransaction, updateBalances } = useWallet()
	const { addNotification } = useNotification()
	const queryClient = useQueryClient()
	const [pending, setPending] = useState(false)

	const run = async <T>(
		build: (publicKey: string) => Promise<ContractTx<T>>,
		successMessage: string,
	): Promise<T | undefined> => {
		if (!address) {
			addNotification("Primero inicia sesión.", "error")
			return
		}
		setPending(true)
		try {
			const tx = await build(address)
			// Contract errors show up in the simulation, before any signature.
			if (tx.result.isErr()) throw new Error(tx.result.unwrapErr().message)
			const value = tx.result.unwrap()
			await tx.signAndSend({ signTransaction })
			addNotification(successMessage, "success")
			await queryClient.invalidateQueries({ queryKey: [KEY] })
			void updateBalances()
			return value
		} catch (e) {
			addNotification(friendlyError(e), "error")
		} finally {
			setPending(false)
		}
	}

	return { run, pending, address }
}

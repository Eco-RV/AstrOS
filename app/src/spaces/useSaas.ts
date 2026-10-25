import { attendance } from "@stellar-scaffold/app-lib/clients"
import { useQuery } from "@tanstack/react-query"
import { useWallet } from "../hooks/useWallet"

/**
 * Reads of the 2.1.0 contract API (spaces, roles, events v2, moderation,
 * billing). Reads are free simulations; writes go through
 * `useAttendanceWrite` (src/attendance/useAttendance.ts) so every signature
 * passes through `useWallet().signTransaction`.
 */

export type Space = Awaited<
	ReturnType<typeof attendance.get_space>
>["result"] extends {
	unwrap(): infer T
}
	? T
	: never
export type EventView = Awaited<
	ReturnType<typeof attendance.latest_public_events>
>["result"][number]
export type EventMeta = EventView["meta"][number]
export type BillingStatus = Awaited<
	ReturnType<typeof attendance.space_billing>
>["result"]
export type ReportInfo = Awaited<
	ReturnType<typeof attendance.reported_events>
>["result"][number]

// Same root key as useAttendance, so every write refreshes these too.
const KEY = "attendance"

/** The v2 data of an event view (undefined for v1 events). */
export const metaOf = (view?: EventView) => view?.meta[0]

const unwrap = <T>(r: {
	isErr(): boolean
	unwrapErr(): { message: string }
	unwrap(): T
}) => {
	if (r.isErr()) throw new Error(r.unwrapErr().message)
	return r.unwrap()
}

export const usePublicEvents = () =>
	useQuery({
		queryKey: [KEY, "public-events"],
		queryFn: async () =>
			(await attendance.latest_public_events({ limit: 50 })).result,
	})

export const useLatestSpaces = (onlyVerified = true) =>
	useQuery({
		queryKey: [KEY, "spaces", onlyVerified],
		queryFn: async () =>
			(
				await attendance.latest_spaces({
					limit: 50,
					only_verified: onlyVerified,
				})
			).result,
	})

export const useAllSpaces = (enabled = true) =>
	useQuery({
		queryKey: [KEY, "all-spaces"],
		enabled,
		queryFn: async () => (await attendance.all_spaces({ limit: 50 })).result,
	})

export const useSpace = (spaceId?: number) =>
	useQuery({
		queryKey: [KEY, "space", spaceId],
		enabled: spaceId !== undefined,
		queryFn: async () =>
			unwrap((await attendance.get_space({ space_id: spaceId! })).result),
	})

export const useSpaceBySlug = (slug?: string) =>
	useQuery({
		queryKey: [KEY, "space-slug", slug],
		enabled: Boolean(slug),
		queryFn: async () =>
			unwrap((await attendance.space_by_slug({ slug: slug! })).result),
	})

export const useSpaceEvents = (spaceId?: number) =>
	useQuery({
		queryKey: [KEY, "space-events", spaceId],
		enabled: spaceId !== undefined,
		queryFn: async () =>
			(await attendance.space_events({ space_id: spaceId!, limit: 50 })).result,
	})

export const useEventView = (eventId: number) =>
	useQuery({
		queryKey: [KEY, "event-view", eventId],
		enabled: Number.isInteger(eventId) && eventId >= 0,
		queryFn: async () =>
			unwrap((await attendance.get_event_v2({ event_id: eventId })).result),
	})

/** Spaces the account owns plus the ones where it is staff. */
export const useMySpaces = () => {
	const { address } = useWallet()
	return useQuery({
		queryKey: [KEY, "my-spaces", address],
		enabled: Boolean(address),
		queryFn: async () => {
			const [owned, staff] = await Promise.all([
				attendance.spaces_of({ owner: address! }),
				attendance.staff_spaces({ staff: address! }),
			])
			return { owned: owned.result, staff: staff.result }
		},
	})
}

export const useSpaceBilling = (spaceId?: number) =>
	useQuery({
		queryKey: [KEY, "billing", spaceId],
		enabled: spaceId !== undefined,
		queryFn: async () =>
			(await attendance.space_billing({ space_id: spaceId! })).result,
	})

export const useReportedEvents = (enabled = true) =>
	useQuery({
		queryKey: [KEY, "reports"],
		enabled,
		queryFn: async () => (await attendance.reported_events()).result,
	})

export const useLatestEventViews = (enabled = true) =>
	useQuery({
		queryKey: [KEY, "event-views"],
		enabled,
		queryFn: async () =>
			(await attendance.latest_event_views({ limit: 50 })).result,
	})

export const usePendingRequests = (eventId: number, enabled = true) =>
	useQuery({
		queryKey: [KEY, "pending", eventId],
		enabled,
		refetchInterval: 8000,
		queryFn: async () =>
			(await attendance.pending_requests({ event_id: eventId })).result,
	})

export const useAttestation = (eventId: number, attendee?: string) =>
	useQuery({
		queryKey: [KEY, "attestation", eventId, attendee],
		enabled: Boolean(attendee),
		queryFn: async () =>
			(
				await attendance.get_attestation({
					event_id: eventId,
					attendee: attendee!,
				})
			).result ?? null,
	})

/**
 * What the connected account can do: everyone attends; owning or being staff
 * of a space makes you an organizer; the admin and moderators moderate.
 */
export const useRole = () => {
	const { address } = useWallet()
	const spaces = useMySpaces()
	const moderator = useQuery({
		queryKey: [KEY, "is-moderator", address],
		enabled: Boolean(address),
		queryFn: async () =>
			(await attendance.is_moderator({ address: address! })).result,
	})
	const owned = spaces.data?.owned ?? []
	const staff = spaces.data?.staff ?? []
	return {
		isOrganizer: owned.length + staff.length > 0,
		isModerator: moderator.data === true,
		spaces: [...owned, ...staff],
		isLoading: spaces.isLoading || moderator.isLoading,
	}
}

/**
 * First line of defense against offensive or mocking spaces and events. It
 * runs before anything is signed; the real filter is that only spaces approved
 * by a moderator appear in the public listing.
 *
 * Text is normalized (lowercase, no accents, common letter swaps like 4→a,
 * 0→o) and checked word by word, so "Pu7a" is caught but "computadora" is not.
 */
const BLOCKED = [
	// Spanish
	"puta",
	"puto",
	"mierda",
	"verga",
	"pendejo",
	"pendeja",
	"culero",
	"cabron",
	"cabrona",
	"malparido",
	"malparida",
	"hijueputa",
	"hdp",
	"marica",
	"maricon",
	"zorra",
	"perra",
	"idiota",
	"imbecil",
	"estupido",
	"estupida",
	"huevon",
	"carepicha",
	"playo",
	"pichazo",
	"chingada",
	"chingar",
	"follar",
	"porno",
	"nazi",
	// English
	"fuck",
	"fucking",
	"shit",
	"bitch",
	"cunt",
	"dick",
	"pussy",
	"nigger",
	"faggot",
	"retard",
	"porn",
	"whore",
	"slut",
	"scam",
]

const SWAPS: Record<string, string> = {
	"0": "o",
	"1": "i",
	"3": "e",
	"4": "a",
	"5": "s",
	"7": "t",
	"@": "a",
	$: "s",
}

const normalize = (text: string) =>
	text
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.replace(/[0-9@$]/g, (c) => SWAPS[c] ?? c)

const blocked = new Set(BLOCKED.map(normalize))

/** The first blocked word found in any of the texts, or null if all are clean. */
export const findBlockedWord = (...texts: string[]): string | null => {
	for (const text of texts) {
		for (const word of normalize(text).split(/[^a-z]+/)) {
			if (word && blocked.has(word)) return word
		}
	}
	return null
}

/** A message for the form, or null when the texts can be published. */
export const contentProblem = (...texts: string[]): string | null =>
	findBlockedWord(...texts)
		? "El texto tiene palabras ofensivas o de burla. Cámbialo para poder publicarlo."
		: null

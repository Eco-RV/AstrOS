import { stellarNetwork } from "@stellar-scaffold/app-lib"

const base = `https://stellar.expert/explorer/${stellarNetwork === "PUBLIC" ? "public" : "testnet"}`

/** Public explorer links, to show students that everything is really on-chain. */
export const explorerAccount = (address: string) => `${base}/account/${address}`
export const explorerContract = (id: string) => `${base}/contract/${id}`

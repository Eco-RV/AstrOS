import {
	Asset,
	BASE_FEE,
	Horizon,
	Operation,
	TransactionBuilder,
} from "@stellar/stellar-sdk"
import {
	horizonUrl,
	networkPassphrase,
	stellarNetwork,
} from "@stellar-scaffold/app-lib"
import { type SignTransactionFn } from "../cavos/context"

/**
 * USDC by Circle. Prices are paid in it, so an organizer needs a USDC
 * trustline (permission to hold the asset) and some USDC. On testnet, test
 * USDC comes from https://faucet.circle.com (Stellar Testnet).
 */
export const USDC =
	stellarNetwork === "PUBLIC"
		? {
				code: "USDC",
				issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
				sac: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
			}
		: {
				code: "USDC",
				issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
				sac: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
			}

/** Key of the USDC line in `useWallet().balances`. */
export const USDC_BALANCE_KEY = `${USDC.code}:${USDC.issuer}`

export const USDC_FAUCET = "https://faucet.circle.com"

const XLM_SACS = [
	"CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
	"CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
]

/** The symbol to show for the pricing token. */
export const tokenSymbol = (token?: string) =>
	token && XLM_SACS.includes(token) ? "XLM" : "USDC"

/** Add the USDC trustline to `address`, signed by its wallet. */
export const addUsdcTrustline = async (
	address: string,
	sign: SignTransactionFn,
) => {
	const horizon = new Horizon.Server(horizonUrl)
	const account = await horizon.loadAccount(address)
	const tx = new TransactionBuilder(account, {
		fee: BASE_FEE,
		networkPassphrase,
	})
		.addOperation(
			Operation.changeTrust({ asset: new Asset(USDC.code, USDC.issuer) }),
		)
		.setTimeout(180)
		.build()
	const { signedTxXdr } = await sign(tx.toXDR(), {
		networkPassphrase,
		address,
	})
	await horizon.submitTransaction(
		TransactionBuilder.fromXDR(signedTxXdr, networkPassphrase),
	)
}

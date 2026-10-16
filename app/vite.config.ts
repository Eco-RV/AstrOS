import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"
import { nodePolyfills } from "vite-plugin-node-polyfills"
import wasm from "vite-plugin-wasm"

/**
 * Serves the Vercel function api/upload.mjs at POST /api/upload while running
 * `npm start`, so photo uploads work locally exactly like on Vercel. Secrets
 * (PINATA_JWT) come from app/.env.local and never reach the browser bundle
 * (only PUBLIC_* variables do).
 */
const localApi = (): Plugin => ({
	name: "astros-local-api",
	configureServer(server) {
		server.middlewares.use("/api/upload", (req, res) => {
			const chunks: Buffer[] = []
			req.on("data", (c: Buffer) => chunks.push(c))
			req.on("end", () => {
				void (async () => {
					const handler = (await import(
						/* @vite-ignore */ new URL("../api/upload.mjs", import.meta.url)
							.href
					)) as { POST: (r: Request) => Promise<Response> }
					const headers = new Headers()
					for (const [k, v] of Object.entries(req.headers))
						if (typeof v === "string") headers.set(k, v)
					const response =
						req.method === "POST"
							? await handler.POST(
									new Request("http://localhost/api/upload", {
										method: "POST",
										headers,
										body: Buffer.concat(chunks),
									}),
								)
							: new Response("Method Not Allowed", { status: 405 })
					res.statusCode = response.status
					response.headers.forEach((v, k) => res.setHeader(k, v))
					res.end(Buffer.from(await response.arrayBuffer()))
				})()
			})
		})
	},
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	// Server-only secrets for the local API (not exposed: envPrefix is PUBLIC_).
	// (Assigning undefined to process.env would store the string "undefined".)
	const jwt = loadEnv(mode, process.cwd(), "PINATA_").PINATA_JWT
	if (jwt && !process.env.PINATA_JWT) process.env.PINATA_JWT = jwt
	return {
		plugins: [
			react(),
			localApi(),
			nodePolyfills({
				include: ["buffer"],
				globals: {
					Buffer: true,
				},
			}),
			wasm(),
		],
		build: {
			target: "esnext",
		},
		optimizeDeps: {
			exclude: ["@stellar/stellar-xdr-json"],
		},
		define: {
			global: "window",
		},
		envPrefix: "PUBLIC_",
		server: {
			// Fixed port: Cavos only allows the origins registered in its dashboard
			// (http://localhost:5173), so fail loudly instead of moving to 5174.
			port: 5173,
			strictPort: true,
			proxy: {
				"/friendbot": {
					target: "http://localhost:8000/friendbot",
					changeOrigin: true,
				},
			},
		},
	}
})

# Traspaso AstrOS → Finance OS

Kit para que una sesión de agente trabajando en **Finance OS**
(`C:\dev\FinanceOS`, repo `Eco-RV/FinanceOS`) construya la **Constelación
familiar**: ahorro familiar en USDC sobre Stellar (testnet), con el tema visual
de constelaciones de AstrOS.

AstrOS (`C:\dev\AstrOS`, repo `Eco-RV/AstrOS`, etiqueta `v1.0.1`) es una dApp de
Stellar ya publicada (insignias de asistencia). De ahí se reusan el
conocimiento, el código de wallets y contratos, y la marca.

## Cómo acceder

- **Misma computadora:** leer directo con las rutas `C:\dev\AstrOS\...` de esta
  guía.
- **Otra máquina o la nube:** `git clone https://github.com/Eco-RV/AstrOS` y
  `git checkout v1.0.1`. Las rutas de abajo son relativas a la raíz del repo.

## Orden de lectura

1. Esta guía.
2. [adaptacion-nextjs.md](adaptacion-nextjs.md): cómo llevar el scaffold de
   Stellar (Vite) a Next.js 16 con la arquitectura DDD de Finance OS.
3. [constelacion-familiar.md](constelacion-familiar.md): qué se va a construir
   (lo decidido con el usuario).
4. [lecciones-aprendidas.md](lecciones-aprendidas.md): problemas reales y su
   solución.
5. Las skills de la sección 1, antes de tocar cada área.

## 1. Skills (conocimiento verificado, por versión)

Están en `.agents/skills/<nombre>/SKILL.md` (formato Agent Skills; sus
`references/` incluidas). **Cópialas** a `FinanceOS/.claude/skills/<nombre>/`
para que Claude Code las cargue solas. Contienen datos que difieren del
entrenamiento de los modelos: léelas antes de trabajar en su área.

| Skill               | Para qué en Finance OS                                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stellar-basics`    | Conceptos para explicar al usuario y a la Academia: cuentas, XLM, trustlines, USDC, Friendbot, errores de transacciones.                                         |
| `soroban-contracts` | Escribir y probar el contrato `family` (soroban-sdk 26, tokens vía SAC, auth, eventos, errores, tests). Incluye los IDs de SAC de USDC y XLM en testnet. |
| `cavos`             | Login con correo/Google y wallet embebida (`@cavos/kit` 0.4.2): firma, fondeo, modal de aprobación, dispositivos y recuperación.                                  |
| `scaffold-stellar`  | Referencia: cómo se compilan, despliegan y generan los clientes TS (en Next.js se hace sin Scaffold, ver la guía de adaptación).                                |
| `build-dapp`        | Cómo decidir qué va on-chain y qué no (`references/data-placement.md`) y qué piezas usar.                                                                        |
| `trustless-work`    | Solo si más adelante hay escrows por hitos. No hace falta para la bóveda familiar.                                                                                |

## 2. Reglas de oro (de `AGENTS.md` de AstrOS, aplican igual)

1. **Solo testnet** salvo que el usuario pida mainnet explícitamente.
2. **Nunca** pedir, imprimir, guardar ni subir claves secretas (`S…`) o frases
   semilla. El usuario firma con su wallet; el agente nunca firma por él.
3. **Toda firma pasa por un único `signTransaction`** (Cavos o extensión), nunca
   importando Cavos o Stellar Wallets Kit directo en las features.
4. **Datos personales nunca on-chain** (nombres, apodos, parentescos, fotos).
   En la cadena solo direcciones `G…`, montos y reglas.
5. Contratos desplegados en entornos fijos (staging/producción): **nunca
   redesplegar**, se cambia el código con `upgrade` y no se rompen los
   `#[contracttype]` ya guardados (tipos y funciones nuevas con `_v2`). Cada
   cambio queda documentado por versión (en AstrOS: `Versionamiento/`; en
   Finance OS conviene `contracts/Versionamiento/` junto a
   `supabase/Versionamiento/`).
6. Nunca `npm audit fix --force` (sube SDKs fijados y rompe la app).
7. Lo que pide firmar en la wallet no lo puede probar el agente: entregarle al
   usuario un guion corto de prueba manual.

## 3. Código de referencia

Todo en `C:\dev\AstrOS\` (o la raíz del clon).

### Contratos (Rust / Soroban)

| Ruta                                                     | Qué tomar                                                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `Cargo.toml`, `rust-toolchain.toml`                      | Workspace con `soroban-sdk` 26 fijado y el target `wasm32v1-none`.                                                              |
| `contracts/attendance/src/lib.rs`                        | Plantilla: `#[contracterror]` con mensajes en español, `#[contracttype]`, `DataKey`, TTL de almacenamiento, `#[contractevent]`, `upgrade` por admin. |
| `contracts/attendance/src/test.rs`                       | Patrón de tests (auth simulada, tiempo del ledger, errores esperados).                                                          |
| `environments.toml`                                      | Contratos por entorno (development redesplegable; staging y producción con id fijo).                                            |
| `Versionamiento/README.md`, `Versionamiento/1.0.0/00_*`  | Cómo se documenta un despliegue o `upgrade` por versión.                                                                        |

### Wallet y Stellar en el frontend

| Ruta                                            | Qué tomar                                                                                                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `app/src/cavos/CavosRoot.tsx`, `config.ts`, `context.ts` | Integración de Cavos aislada detrás de un contexto propio (`CavosState`).                                                 |
| `app/src/providers/WalletProvider.tsx`          | **Un solo `useWallet()`** para Cavos y extensiones: dirección, saldos, `signTransaction`, desconexión.                            |
| `app/src/hooks/useWallet.ts`                    | El hook que consumen las features.                                                                                                |
| `app/src/components/WalletButton.tsx`           | Entrar con correo / usar wallet, menú de cuenta con saldo, copiar dirección, explorador, pedir XLM de prueba, cerrar sesión.     |
| `app/src/components/AutoFund.tsx`               | Fondeo automático con Friendbot al iniciar sesión, con aviso animado "Cargando combustible".                                     |
| `app-lib/env.ts`                                | Lectura de red/RPC/Horizon desde variables públicas (hay que adaptarla a `NEXT_PUBLIC_*`).                                         |
| `app-lib/wallet.ts`                             | Stellar Wallets Kit, `fetchBalances` (Horizon), firma con extensión.                                                              |
| `app-lib/friendbot.ts`                          | `fundAccount` (testnet).                                                                                                          |
| `app-lib/subscription.ts`                       | `subscribeToEvents`: escuchar eventos de un contrato por RPC.                                                                     |
| `app/src/attendance/useAttendance.ts`           | Patrón de lecturas con React Query y escrituras: simular → revisar error del contrato → firmar → enviar → invalidar.              |
| `app/src/pages/Projector.tsx`                   | Decodificar eventos de contrato (`parseClaim`) y contador en vivo.                                                                |
| `app/src/lib/explorer.ts`                       | Enlaces a Stellar Expert (testnet/public).                                                                                        |
| `git show c40bb6b:app/src/trustless/usdc.ts`    | **USDC clásico:** `addUsdcTrustline` y `swapXlmForUsdc` (cambiar XLM de prueba por USDC en el DEX de testnet). Base para `sendUsdc`. |
| `git show c40bb6b:app/src/trustless/config.ts`  | Emisor de USDC por red (testnet `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`) y la clave de saldo `USDC:<emisor>`.  |
| `scripts/ci-clients.mjs`                        | Generar los clientes TS desde contratos ya desplegados, **sin Rust**, en Vercel y GitHub Actions.                                 |
| `app/src/attendance/QrCode.tsx`                 | QR en SVG con `uqr` (corrección H y logo al centro): sirve para "Recibir" y para invitar a la familia.                            |

### Marca "constelaciones"

| Ruta                                          | Qué tomar                                                                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `docs/1.0.1/logos/*.svg`, `index.html`        | Cuatro logos (órbita, constelación, sello, wordmark) y la hoja de paleta. La "Constelación" encaja con la familia.     |
| `app/src/brand/Logo.tsx`                      | Logos como componentes React (`Seal`, `Wordmark`, `sparklePath`).                                                    |
| `app/src/brand/Starfield.tsx` (+ `.module.css`) | Fondo de estrellas con parallax, sin librerías.                                                                     |
| `app-lib/styles.css`                          | Tokens: Noche `#0B0820`, Nebulosa `#1A1438`, Aurora `#7B61FF → #C86DD7 → #3DD6F5`, Estrella `#FFD66B`, Éxito `#3DDC97`. |
| `app/src/pages/MyBadges.tsx`                  | **Constelación SVG**: puntos con líneas que se dibujan (`stroke-dashoffset`) y estrellas que aparecen escalonadas.     |
| `app/src/attendance/Supernova.tsx`            | Celebración a pantalla completa (destello, anillo, chispas, vibración).                                              |
| `app/src/attendance/attendance.module.css`, `projector.module.css` | Las animaciones (supernova, estrellas fugaces, contador que rebota) y el respeto a `prefers-reduced-motion`. |

Finance OS usa Tailwind v4 + shadcn: pasar los colores a variables de su tema y
las animaciones a CSS propio, sin copiar los CSS Modules tal cual.

## 4. Flujo de trabajo

AstrOS copió su flujo de Finance OS (`docs/FLUJO.md`): ramas `main` /
`dev_main` / `feature/x.y.z`, merge commits, release con etiqueta. Lo nuevo que
aporta AstrOS es la parte de **contratos por entorno** (development / staging /
production en testnet, con ids fijos y `upgrade`) y la generación de clientes
en CI: ver `docs/FLUJO.md` secciones 2 y 4 y `Versionamiento/README.md`.

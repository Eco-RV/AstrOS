# Adaptar el scaffold de Stellar a Finance OS (Next.js 16)

AstrOS usa **Scaffold Stellar**: Vite + `stellar scaffold watch` (compila,
despliega y genera clientes TS al guardar). Finance OS es \*\*Next.js 16 +
Supabase

- DDD\*\*. No se migra el scaffold entero: se llevan sus piezas a la estructura
  de Finance OS.

> Antes de tocar Next.js, sigue la advertencia del `AGENTS.md` de Finance OS:
> leer la guía correspondiente en `node_modules/next/dist/docs/`.

## 1. Contratos en el repo de Finance OS

```
contracts/
  family/            crate del contrato (Cargo.toml, src/lib.rs, src/test.rs)
  Versionamiento/    despliegues y upgrades por versión (como AstrOS)
Cargo.toml           workspace (copiar de AstrOS: soroban-sdk 26 fijado)
rust-toolchain.toml  (copiar de AstrOS)
```

- Compilar: `stellar contract build` (target `wasm32v1-none`). Probar:
  `cargo test`.
- Desplegar en testnet:
  `stellar contract deploy --wasm … --source <identidad> --network testnet -- --admin <G…> --usdc <SAC>`.
  Lo corre **el usuario** con su identidad local; el agente nunca maneja claves
  `S…`.
- Entornos: igual que `environments.toml` de AstrOS: development (se redespliega
  libre), staging (Previews) y production (`main`) con **ids fijos** que solo
  cambian con `upgrade`. En Finance OS, los ids van en variables
  `NEXT_PUBLIC_FAMILY_CONTRACT_ID` por entorno de Vercel.

## 2. Clientes TypeScript

- Generar con
  `stellar contract bindings typescript --contract-id <id> --network testnet --output-dir packages/family-client`
  (o el equivalente que traiga la versión instalada; ver `scaffold-stellar`
  skill).
- En Vercel no hay Rust ni Stellar CLI: copiar la idea de
  `scripts/ci-clients.mjs` de AstrOS (genera los bindings desde el contrato
  desplegado con `stellar-js` del SDK de JS, según el id de la variable de
  entorno) y correrlo en `installCommand`/`buildCommand`.
- Los clientes generados no se editan a mano (se regeneran).

## 3. Variables de entorno

Vite usa `import.meta.env.PUBLIC_*`; Next.js usa `process.env.NEXT_PUBLIC_*`
(reemplazadas en build). Reescribir `app-lib/env.ts` de AstrOS:

| AstrOS                              | Finance OS                               |
| ----------------------------------- | ---------------------------------------- |
| `PUBLIC_STELLAR_NETWORK`            | `NEXT_PUBLIC_STELLAR_NETWORK`            |
| `PUBLIC_STELLAR_NETWORK_PASSPHRASE` | `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` |
| `PUBLIC_STELLAR_RPC_URL`            | `NEXT_PUBLIC_STELLAR_RPC_URL`            |
| `PUBLIC_STELLAR_HORIZON_URL`        | `NEXT_PUBLIC_STELLAR_HORIZON_URL`        |
| `PUBLIC_CAVOS_APP_ID`               | `NEXT_PUBLIC_CAVOS_APP_ID`               |
| `PUBLIC_CAVOS_ENVIRONMENT`          | `NEXT_PUBLIC_CAVOS_ENVIRONMENT`          |
| `PUBLIC_<CONTRATO>_CONTRACT_ID`     | `NEXT_PUBLIC_FAMILY_CONTRACT_ID`         |

Con Next.js, cada variable `NEXT_PUBLIC_*` debe leerse **por nombre literal**
(`process.env.NEXT_PUBLIC_STELLAR_RPC_URL`), no recorriendo `process.env`, o no
se reemplaza en el bundle del navegador. Los secretos (si los hubiera) **sin**
prefijo `NEXT_PUBLIC_` y solo en el servidor.

## 4. Wallet solo en el cliente

- Cavos (`@cavos/kit` 0.4.2, versión fija) y Stellar Wallets Kit tocan `window`:
  van en **Client Components** (`"use client"`), y conviene cargar el proveedor
  con `next/dynamic` y `ssr: false` si alguna importación falla en el servidor.
- Copiar el patrón de AstrOS: `CavosRoot` → `WalletProvider` → `useWallet()`.
  Las features solo ven `useWallet().signTransaction`.
- Las Server Actions de Finance OS **no firman** ni envían transacciones de
  Stellar: el usuario firma en el navegador. El servidor puede leer de la cadena
  (RPC/Horizon) si hace falta para el Resumen, pero no tiene llaves.
- Cavos solo acepta orígenes registrados: agregar `http://localhost:3000`, el
  dominio de producción de Finance OS y el de `dev_main` en su dashboard
  (orígenes permitidos y Callback URLs).

## 5. Encaje con la arquitectura DDD de Finance OS

Finance OS separa `src/domain` (puro, probado con `node --test`),
`src/application` (casos de uso con puertos) y `src/infrastructure`
(adaptadores). Propuesta para el contexto nuevo **Constelación**:

| Capa                                   | Contenido                                                                                                                                                                                                                              |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/constellation/`            | Reglas puras: montos USDC con **7 decimales** (`i128` del contrato) ↔ `Money` en céntimos de Finance OS; validación de envíos y depósitos; regla de retiro (aprobación de un guardián distinto); progreso de la meta. Con `*.test.ts`. |
| `src/application/` (puertos)           | `StellarWallet` (saldo USDC/XLM, trustline, enviar), `FamilyVault` (leer familia, depositar, pedir/aprobar retiro), `ConstellationDirectory` (vínculo usuario ↔ `G…` y apodos).                                                        |
| `src/infrastructure/stellar/`          | Adaptadores con `@stellar/stellar-sdk` y el cliente generado de `family`. Las escrituras devuelven la transacción **para firmar en el cliente**.                                                                                       |
| `src/infrastructure/supabase/`         | Tabla con RLS para la dirección `G…` del usuario y los apodos/emoji de sus familiares (datos personales fuera de la cadena). Nunca llaves.                                                                                             |
| `src/app/(app)/procesos/constelacion/` | Páginas (Mi ahorro, Constelación, Bóveda, Enviar, Academia) siguiendo el patrón de módulos de Finance OS.                                                                                                                              |

El SQL nuevo va en `supabase/Versionamiento/<versión>/` como siempre; los pasos
de contrato en `contracts/Versionamiento/<versión>/`.

## 6. Dependencias a agregar (versiones fijas, como en AstrOS)

- `@stellar/stellar-sdk` (AstrOS usa `^16`; ver `app/package.json`).
- `@cavos/kit` `0.4.2`.
- `@creit.tech/stellar-wallets-kit` (si se ofrece wallet de extensión además de
  Cavos; ver `app-lib/package.json` de AstrOS).
- `uqr` `0.1.3` para los QR.
- Revisar que ninguna versión nueva rompa: no correr `npm audit fix --force`.

# Mensaje para la sesión de Finance OS

Copia el bloque de abajo y pégalo como primer mensaje en tu proyecto de Finance
OS (Claude Code abierto en `C:\dev\FinanceOS`).

---

```text
Quiero sumar a Finance OS una nueva lógica de negocio sobre la blockchain de Stellar: la "Constelación familiar", un sistema de ahorro familiar en USDC. Cada persona ve su ahorro y envía dinero a su familia; hay una bóveda familiar con una meta común donde retirar requiere la aprobación de otro familiar (para proteger a las personas mayores de estafas); y una academia que explica de forma simple qué es una wallet, la blockchain y USDC. La familia se ve como una constelación: cada persona es una estrella.

Todo el conocimiento y el código base vienen de mi otro proyecto, AstrOS (dApp de Stellar ya publicada, v1.0.1). Está en esta misma computadora en C:\dev\AstrOS (si no puedes leerlo, clona https://github.com/Eco-RV/AstrOS en la rama dev_main).

Antes de proponer nada, lee en este orden:
1. C:\dev\AstrOS\docs\handoff\finance-os\README.md (índice de todo lo reutilizable: skills, reglas, código, marca)
2. C:\dev\AstrOS\docs\handoff\finance-os\adaptacion-nextjs.md (cómo llevar el scaffold de Stellar, que es Vite, a nuestro Next.js 16 con DDD)
3. C:\dev\AstrOS\docs\handoff\finance-os\constelacion-familiar.md (lo que ya decidí: bolsillos + bóveda, familia en contrato sin nombres, pantallas)
4. C:\dev\AstrOS\docs\handoff\finance-os\lecciones-aprendidas.md
5. Nuestro docs/CONTEXT.md, docs/dominio/ y docs/historias-usuario/ (sobre todo ahorros.md), y el AGENTS.md de Next.js.

Reglas:
- Solo testnet. Nunca pidas, leas ni imprimas claves secretas (S…), frases semilla ni secretos de .env; yo firmo con mi wallet y yo corro los despliegues de contratos.
- Datos personales (nombres, apodos, parentescos) nunca en la blockchain.
- Copia las skills de C:\dev\AstrOS\.agents\skills\ (stellar-basics, soroban-contracts, cavos, scaffold-stellar, build-dapp) a .claude/skills/ de este proyecto y léelas antes de trabajar en cada área.
- Sigue nuestro flujo (docs/flujo-de-trabajo.md y docs/CONTEXT.md): pregúntame el nombre de la rama antes del primer commit, nunca trabajes sobre main, y los PRs los fusiono yo.

Primer entregable, sin escribir código todavía: un plan por fases para integrar la Constelación familiar en Finance OS (contrato family en Rust con sus tests, clientes TS, contexto de dominio "Constelación" con puertos y adaptadores, tablas de Supabase con RLS para direcciones y apodos, pantallas y academia, variables de entorno y Cavos, y cómo se versiona). Incluye las decisiones abiertas que necesitas que yo tome, sobre todo: Finance OS hoy es de un solo usuario, ¿cómo participan los familiares?
```

# Constelación familiar: especificación funcional

Lo decidido con el usuario (octubre 2026) para la nueva lógica de negocio, que
se construirá dentro de Finance OS. Es un punto de partida: la sesión de Finance
OS debe adaptarlo a su dominio (`docs/dominio/`) y a sus historias de usuario.

## Problema

En Costa Rica muchas familias ahorran en dólares y se envían dinero entre sí,
pero las personas mayores (y muchos jóvenes) no entienden qué es una wallet o la
blockchain, y son blanco de estafas. Se quiere una herramienta para:

- **Ahorrar en USDC** (dólar digital) y ver el ahorro de forma simple.
- **Mover dinero entre familiares** (de wallet a wallet) sin miedo a
  equivocarse.
- **Ahorrar juntos** hacia una meta, con una regla que proteja a los mayores.
- **Aprender** qué es una wallet, la blockchain y USDC, con palabras sencillas.

La familia se ve como una **constelación**: cada persona es una estrella.

## Decisiones tomadas

1. **Bolsillos + bóveda.** Cada persona ahorra USDC en su propia wallet y envía
   a otros (pagos clásicos de Stellar, sin contrato). Además, una **bóveda
   familiar** (contrato Soroban) con una meta común: todos pueden depositar, y
   **retirar requiere la aprobación de un guardián distinto a quien pide**.
2. **La familia vive en el contrato, sin nombres.** El contrato guarda solo
   direcciones `G…` y roles (guardián / miembro), para que se vea igual en
   cualquier celular. Apodos, emoji y parentesco van **fuera de la cadena** (en
   Finance OS: Supabase con RLS).
3. **Testnet** mientras sea un proyecto de aprendizaje.
4. Login con **correo o Google (Cavos)** como opción principal: nada que
   instalar. Wallet de extensión como opción secundaria.

## Contrato `family` (propuesta)

Base: patrón de `contracts/attendance/src/lib.rs` de AstrOS.

- `__constructor(admin: Address, usdc: Address)`: `usdc` es el SAC de USDC
  (testnet `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`, ver skill
  `soroban-contracts`); `admin` solo puede hacer `upgrade`.
- Tipos:
  - `Role { Guardian, Member }`, `Member { address, role }`.
  - `Family { id, members: Vec<Member>, goal: i128, balance: i128, approvals_needed: u32 }`
    (máx. 12 miembros).
  - `Withdrawal { id, family_id, to, amount, requested_by, approvals: Vec<Address>, status }`
    con `status` Pending / Executed / Cancelled.
- `DataKey`: `Family(u32)`, `FamiliesOf(Address)` (para que la app encuentre la
  familia de cada uno), `Contribution(u32, Address)`, `Withdrawal(u32)`,
  contadores.
- Funciones:
  - `create_family(creator) -> u32`: quien crea queda como guardián.
  - `add_member(guardian, family_id, member, role)`,
    `remove_member(guardian, family_id, member)` (no se puede quitar al último
    guardián), `leave_family(member, family_id)`.
  - `set_goal(guardian, family_id, goal)`.
  - `deposit(from, family_id, amount)`: `from.require_auth()`, debe ser miembro;
    `TokenClient::transfer(from → contrato)`; suma a `balance` y a la
    contribución de `from`.
  - `request_withdrawal(member, family_id, to, amount) -> u32`.
  - `approve_withdrawal(guardian, withdrawal_id)`: cuentan solo guardianes
    distintos a quien pidió; al llegar a `approvals_needed` (si no existe otro
    guardián, se ejecuta directo) transfiere del contrato a `to` y descuenta
    `balance`.
  - `cancel_withdrawal(caller, withdrawal_id)`: quien pidió o un guardián.
  - Lecturas: `get_family`, `families_of`, `contribution_of`,
    `pending_withdrawals`.
- Errores (`#[contracterror]`, mensajes en español): familia inexistente, no es
  miembro, no es guardián, ya es miembro, familia llena, último guardián, monto
  inválido, saldo insuficiente, retiro inexistente o ya resuelto, no puede
  aprobar su propio retiro.
- Eventos: `family_created`, `member_added`, `member_removed`, `deposited`,
  `withdrawal_requested`, `withdrawal_approved`, `withdrawal_executed`,
  `withdrawal_cancelled`.
- Tests: SAC de prueba con `env.register_stellar_asset_contract_v2(admin)` y
  `StellarAssetClient::mint`; casos de cada error, flujo completo de depósito →
  solicitud → aprobación → ejecución, y saldos finales.
- Riesgo: este contrato **custodia fondos**. El skill `soroban-contracts`
  recomienda Trustless Work para escrows por hitos, pero una tesorería con
  aportes recurrentes de varios miembros no encaja ahí. Antes de mainnet:
  revisión de seguridad (checklist en
  `.agents/skills/scaffold-stellar/references/deploy.md` de AstrOS).

## Pantallas

Mobile first, para personas mayores (botones grandes, textos sin jerga, siempre
una pantalla de confirmación antes de mover dinero). Barra inferior sugerida:
**Inicio · Familia · ＋ Enviar · Aprende**.

1. **Mi ahorro.** Saldo grande en USDC con su equivalente aproximado en colones
   (Finance OS ya maneja tipo de cambio). Botones Enviar, Recibir (QR de mi
   dirección) y "Conseguir USDC de prueba" (trustline + cambio XLM→USDC).
   Últimos movimientos en lenguaje simple ("Mamá te envió $10").
2. **Constelación.** SVG con "Tú" al centro y cada familiar como una estrella
   (su brillo = cuánto aportó a la bóveda), unidas por líneas; la bóveda como
   planeta con un anillo de progreso hacia la meta. Agregar familiar escaneando
   su QR o pegando su dirección. Tocar una estrella → enviarle dinero.
3. **Bóveda.** Saldo, meta y avance, aportes por persona, Depositar, Pedir
   retiro, y la lista de retiros pendientes para aprobar o cancelar (con quién
   lo pidió, a dónde y cuánto).
4. **Enviar.** Elegir familiar (o escanear/pegar dirección) → monto → pantalla
   de revisión clara ("Vas a enviar 10 USDC a Mamá. No se puede deshacer.") →
   firma → animación de una estrella viajando a la otra.
5. **Academia.** Cinco lecciones cortas con un mini-quiz cada una: ¿Qué es una
   wallet? (tu buzón con llave) · ¿Qué es la blockchain? (un cuaderno que todos
   pueden leer y nadie puede borrar) · ¿Qué es USDC? (dólar digital) · Enviar
   sin miedo (revisar la dirección, estafas comunes, nadie legítimo te pide tus
   códigos) · La bóveda familiar (por qué otro familiar aprueba los retiros).
   Progreso guardado.
6. **Letra grande.** Interruptor de accesibilidad que agranda toda la interfaz.

Reusar la marca de AstrOS (logo "Constelación", tokens Noche/Aurora/Estrella,
fondo de estrellas, constelación SVG animada, supernova al completar un envío o
una lección).

## Encaje con Finance OS (decisiones abiertas para esa sesión)

- **Un usuario vs. familia.** Finance OS es de un solo usuario. Decidir con el
  usuario si cada familiar tiene cuenta en Finance OS, o si existe una vista
  ligera solo con wallet (Cavos) para familiares que no usan Finance OS.
- **Ahorros y metas (2.7.0).** La wallet USDC y la bóveda pueden aparecer como
  cuentas en USD dentro del módulo de ahorros (saldo leído de la cadena, no
  escrito a mano), con la meta de la bóveda como meta de ahorro.
- **Resumen.** Mostrar el ahorro on-chain junto a la liquidez, en USD y su
  equivalente en colones.
- **Versión.** Probablemente una versión mayor (p. ej. 3.0.0) o por fases (2.8.0
  wallet y envíos, 2.9.0 bóveda, 2.10.0 academia).

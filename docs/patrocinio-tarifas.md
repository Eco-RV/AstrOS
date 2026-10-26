# Plan: patrocinio de tarifas para asistentes

Estado: **plan, sin implementar** (AstrOS 2.1.0). Testnet primero, mainnet
después de medir costos reales.

## 1. El problema

En testnet cada wallet nueva recibe XLM gratis de Friendbot. **En mainnet no hay
Friendbot.** Un asistente que entra con su correo (Cavos) tiene 0 XLM, y
reclamar una insignia es una transacción que alguien tiene que pagar. Sin
patrocinio, el asistente no puede reclamar.

Hay dos costos distintos:

| Costo                     | Qué es                                                               | Cuándo                          |
| ------------------------- | -------------------------------------------------------------------- | ------------------------------- |
| **Tarifa de transacción** | Comisión de red de `claim_v2`, `request_attendance`, `set_name_hash` | Cada vez que el asistente firma |
| **Reserva de la cuenta**  | Saldo mínimo para que la cuenta exista (hoy 1 XLM: 2 × reserva base) | Una vez por asistente nuevo     |

Los organizadores siguen pagando sus propias tarifas: ya tienen USDC para el
plan y pueden tener XLM. Se puede patrocinar también más adelante.

## 2. Cómo se patrocina en Stellar

Stellar lo resuelve sin contratos extra:

- **Fee-bump:** el asistente firma su transacción normal (la "interna") y AstrOS
  la envuelve en una transacción _fee-bump_ firmada por una cuenta
  patrocinadora, que paga la tarifa. El asistente no necesita XLM para la tarifa
  y su firma no cambia.
- **Reservas patrocinadas** (`beginSponsoringFutureReserves` + `createAccount`
  con saldo inicial 0): la cuenta patrocinadora pone la reserva para que exista
  la cuenta del asistente.

Opciones de infraestructura:

| Opción                                     | A favor                                                           | En contra                                                                                                        |
| ------------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Función propia `/api/sponsor`** (Vercel) | Poco código, reglas propias (solo nuestro contrato), sin terceros | Hay que cuidar la llave patrocinadora y el límite de envíos                                                      |
| **OpenZeppelin Relayer**                   | Infraestructura mantenida, envíos en paralelo, monitoreo          | Otro servicio que operar o contratar; su flujo de "pagar la tarifa con tokens" hoy es solo para activos clásicos |
| Launchtube (SDF)                           | —                                                                 | **Se está retirando**; la SDF recomienda OpenZeppelin Relayer                                                    |

**Recomendación:** empezar con la función propia (fee-bump puro, reglas de
AstrOS) y evaluar OpenZeppelin Relayer cuando el volumen lo pida.

## 3. Diseño de `/api/sponsor`

```
Asistente (wallet)            /api/sponsor (Vercel)                 Stellar
──────────────────            ─────────────────────                 ───────
arma claim_v2 y simula  ──►
firma la transacción    ──►   1. valida la transacción
                              2. simula y revisa el costo
                              3. envuelve en fee-bump y firma
                                 con SPONSOR_SECRET          ──►    envía
                        ◄──   devuelve el hash               ◄──    resultado
```

**Reglas de validación** (la función rechaza todo lo demás):

1. Red correcta (passphrase) y **una sola operación** `invokeHostFunction`.
2. El contrato es **nuestro `attendance`** y la función está en la lista:
   `claim_v2`, `request_attendance`, `set_name_hash` (y `claim` mientras existan
   eventos v1).
3. La cuenta que firma es la misma que el argumento `attendee`.
4. El evento existe, es v2, está abierto y **no llegó a su `max_claims`** (se
   lee del contrato antes de patrocinar).
5. La tarifa de recursos simulada es menor a un tope (`SPONSOR_MAX_FEE`).
6. Límite por asistente (por ejemplo, 10 transacciones por día) para cortar
   reintentos en bucle.

**El límite real lo pone el contrato:** cada evento tiene un tope de asistentes
(`max_claims`), y ese tope lo paga el organizador con su tramo. El gasto de
patrocinio por evento nunca pasa de _tope × tarifa por reclamo_.

**Secretos:** `SPONSOR_SECRET` vive solo en el servidor (variable de Vercel o
`app/.env.local`), **nunca** con prefijo `PUBLIC_`, igual que `PINATA_JWT`. La
cuenta patrocinadora es una "billetera caliente": se mantiene con poco saldo y
se recarga desde la tesorería, con una alerta cuando baja de un mínimo.

## 4. Cambios en el código

| Pieza                           | Cambio                                                                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/sponsor.mjs` (nuevo)       | La función de la sección 3, con el mismo estilo que `api/upload.mjs` (también disponible en local por el middleware de Vite)                    |
| `useAttendanceWrite`            | Opción `sponsored`: en vez de `signAndSend`, firma la transacción (`tx.sign({ signTransaction })`) y manda el XDR a `/api/sponsor`              |
| Detalle de evento y certificado | Usar `sponsored` en reclamar, pedir insignia y registrar nombre                                                                                 |
| `AutoFund` / Friendbot          | Solo en testnet; en mainnet lo reemplaza el patrocinio                                                                                          |
| Contrato `attendance`           | **Sin cambios necesarios.** Opcional: una marca por evento para que el organizador elija si patrocina                                           |
| Cavos                           | **Por confirmar:** si Cavos crea y fondea la cuenta en mainnet. Si no, `/api/sponsor` agrega la creación con reserva patrocinada la primera vez |

## 5. Costos y precio

El costo de patrocinar un evento es:

```
costo del evento = asistentes × tarifa por reclamo
                 + asistentes nuevos × reserva de cuenta (1 XLM, si AstrOS la pone)
```

- **Tarifa por reclamo:** hay que medirla en mainnet. En testnet un reclamo
  costó ~0,15–0,20 XLM, pero testnet está inflado (su estado supera el umbral
  que multiplica la tarifa de escritura). Un análisis antiguo de mainnet midió
  ~0,026 XLM por transacción que escribe datos.
- **Reserva:** es el costo más alto por asistente nuevo. Una cuenta que se
  reutiliza en varios eventos la paga una sola vez.

Con los tramos de `Versionamiento/2.1.0/01_set_pricing.md`, el margen por evento
es _precio del tramo − costo del evento − parte de infraestructura_. Ejemplo de
cálculo (llenar con las tarifas medidas en mainnet y el precio del XLM del día):

| Tramo          | Precio   | Asistentes máx. | Tarifas (máx. × tarifa) | Reservas (si son nuevos) | Margen |
| -------------- | -------- | --------------- | ----------------------- | ------------------------ | ------ |
| Evento ≤ 100   | 15 USDC  | 100             | 100 × t                 | hasta 100 × 1 XLM        | …      |
| Evento ≤ 500   | 45 USDC  | 500             | 500 × t                 | hasta 500 × 1 XLM        | …      |
| Evento ≤ 2 000 | 120 USDC | 2 000           | 2 000 × t               | hasta 2 000 × 1 XLM      | …      |

Si las reservas pesan demasiado, opciones: que Cavos cree las cuentas, pedir la
reserva solo a quien reclama su segunda insignia, o subir los tramos.

## 6. Fases

1. **Medir** (mainnet, con XLM real, lo corre Oswald): desplegar en una cuenta
   de prueba y medir la tarifa real de `claim_v2`, `request_attendance` y
   `set_name_hash`. Confirmar con Cavos cómo se crean las cuentas en mainnet.
2. **Construir en testnet:** `api/sponsor.mjs` y la opción `sponsored`, con una
   cuenta patrocinadora fondeada por Friendbot. Probar los rechazos (otro
   contrato, otra función, evento lleno).
3. **Ajustar precios** con los costos medidos y las entrevistas a organizadores.
4. **Mainnet:** cuenta patrocinadora con saldo limitado, alertas de saldo y un
   tablero simple de gasto por evento.

## 7. Preguntas abiertas

- ¿Cavos crea y fondea la cuenta del usuario en mainnet, o hay que hacerlo?
- ¿Patrocinio siempre, o el organizador lo elige por evento (y paga más)?
- ¿Se patrocina también al organizador en su primer evento, para quitarle la
  fricción de conseguir XLM?

## Fuentes

- Stellar Docs:
  [Fee-bump transactions](https://developers.stellar.org/docs/build/guides/transactions/fee-bump-transactions)
- Stellar Docs:
  [OpenZeppelin Relayer](https://developers.stellar.org/docs/tools/openzeppelin-relayer)
  (reemplazo de Launchtube)
- OpenZeppelin:
  [Stellar Sponsored Transactions Guide](https://docs.openzeppelin.com/relayer/1.4.x/guides/stellar-sponsored-transactions-guide)
- Stellar Docs:
  [Fees and resource limits](https://developers.stellar.org/docs/learn/fundamentals/fees-resource-limits-metering)

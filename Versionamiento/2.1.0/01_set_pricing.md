# 2.1.0 · 01 · Precios en USDC por tramos (`set_pricing`)

- **Versión:** 2.1.0
- **Qué hace:** fija el token (USDC), la tesorería, la cuota gratis y los
  precios por tramos de asistentes. Sin esto, crear eventos es gratis y sin tope
  (y `subscribe` responde "Los cobros todavía no están configurados").
- **Por qué:** el precio depende del tamaño del evento, que es lo que hace
  crecer el costo de patrocinar tarifas por asistente. Se cobra en USDC para que
  el ingreso no dependa del precio del XLM.
- **Cuándo:** DESPUÉS de `00_upgrade_attendance.md`, en cada entorno.

## Valores propuestos (hipótesis para validar con organizadores)

| Concepto     | Tramo                  | Precio       |
| ------------ | ---------------------- | ------------ |
| Gratis       | 2 eventos al mes       | hasta 50     |
| Evento único | hasta 100 asistentes   | 15 USDC      |
| Evento único | hasta 500 asistentes   | 45 USDC      |
| Evento único | hasta 2 000 asistentes | 120 USDC     |
| Plan mensual | eventos de hasta 100   | 39 USDC/mes  |
| Plan mensual | eventos de hasta 500   | 99 USDC/mes  |
| Plan mensual | eventos de hasta 2 000 | 249 USDC/mes |

Reglas del contrato:

- Solo los eventos gratis gastan la cuota gratis.
- Un evento más grande que la cuota gratis o que el plan paga su tramo de evento
  único.
- Más de 2 000 asistentes no tiene precio automático (`TooManyAttendees`): plan
  a medida.
- Montos con 7 decimales: `150000000` = 15 USDC.

## Paso 1: trustline USDC de la tesorería

La tesorería (`astros-admin`) no puede recibir USDC sin trustline. Una sola vez
por red (desde `app/`):

```bash
stellar tx new change-trust --source astros-admin --network testnet --line USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
```

## Paso 2: precios

USDC de Circle en testnet: contrato
`CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.

```bash
stellar contract invoke --id attendance-staging --source astros-admin --network testnet -- set_pricing --pricing '{"token":"CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA","treasury":"GBD4BE67JX4WMH2COPATPLJJ5ILG6YL7JVL7MF66VRWT5H5NEAJFMW4K","free_events_per_month":2,"free_claims_per_event":50,"event_tiers":[{"max_attendees":100,"price":"150000000"},{"max_attendees":500,"price":"450000000"},{"max_attendees":2000,"price":"1200000000"}],"plan_tiers":[{"max_attendees":100,"price":"390000000"},{"max_attendees":500,"price":"990000000"},{"max_attendees":2000,"price":"2490000000"}]}'
```

Para producción, el mismo comando con `--id attendance-production`. En mainnet
el USDC de Circle es otro: emisor
`GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`, contrato
`CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`.

## Verificación

```bash
stellar contract invoke --id attendance-staging --source astros-admin --network testnet -- quote_event --space_id 0 --max_claims 300
```

Con un espacio sin plan y la cuota gratis usada (o pidiendo más de 50), debe
cotizar el tramo de 500: `{"cost":"450000000","kind":2,"max_claims":300}`.

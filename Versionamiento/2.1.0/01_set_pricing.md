# 2.1.0 · 01 · Precios (`set_pricing`)

- **Versión:** 2.1.0
- **Qué hace:** fija los precios y el token en que se cobran. Sin esto, crear
  eventos es gratis y sin tope (y `subscribe` responde "Los cobros todavía no
  están configurados").
- **Por qué:** la demo muestra el plan gratis con límite, el evento único y el
  plan mensual.
- **Cuándo:** DESPUÉS de `00_upgrade_attendance.md`, en cada entorno.

## Valores de la demo (testnet, XLM de prueba)

| Campo                   | Valor             | Significa                                                  |
| ----------------------- | ----------------- | ---------------------------------------------------------- |
| `token`                 | XLM (SAC testnet) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| `treasury`              | `astros-admin`    | Cuenta que recibe los pagos                                |
| `free_events_per_month` | `2`               | Eventos gratis por espacio al mes                          |
| `free_claims_per_event` | `50`              | Tope de asistentes en un evento gratis                     |
| `monthly_price`         | `500000000`       | 50 XLM (7 decimales)                                       |
| `single_event_price`    | `100000000`       | 10 XLM por evento único                                    |

## Comando (desde `app/`)

```bash
stellar contract invoke --id attendance-staging --source astros-admin --network testnet -- set_pricing --pricing '{"token":"CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC","treasury":"GBD4BE67JX4WMH2COPATPLJJ5ILG6YL7JVL7MF66VRWT5H5NEAJFMW4K","free_events_per_month":2,"free_claims_per_event":50,"monthly_price":"500000000","single_event_price":"100000000"}'
```

Para producción, el mismo comando con `--id attendance-production`. En
producción real (mainnet) el token sería USDC, no XLM.

## Verificación

```bash
stellar contract invoke --id attendance-staging --source astros-admin --network testnet -- pricing
```

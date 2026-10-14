# 1.0.0 · 00 · Despliegue inicial de staging y producción

- **Versión:** 1.0.0
- **Qué hace:** despliega por primera vez `attendance` y `reputation` en testnet
  para los entornos `staging` y `production`.
- **Por qué:** hasta ahora solo existía el contrato de `development`, que
  `npm start` redespliega cuando cambia el código (sus datos son desechables).
- **Cuándo:** ya corrido el 2026-10-14. **No volver a correrlo**: crearía
  contratos vacíos con IDs nuevos.

## Resultado

| Contrato   | Entorno    | ID                                                         |
| ---------- | ---------- | ---------------------------------------------------------- |
| attendance | staging    | `CBYKEFCNBPQW3G2XABSKYBOGV4VAOS7QPXM3QEUXVH4T4CZECC72YSAU` |
| attendance | production | `CAJ4FV5EEP7SFCXLSCOLTVWL6F3ZM34SIDDNR6XGR7FQSTPNF3QIJCFD` |
| reputation | staging    | `CAIDTMGHVR2NG33A32AGALDFCXQS4JKF5DVJNMOSSP2C4TGRJ55RYDUI` |
| reputation | production | `CDJDECLWXATHQ7CAYM2BDMRE2XJ4N6EV74MQHP3FMVCCILNI4DOUUNVW` |

- Wasm de `attendance`:
  `63f078559c77a02fc732345ec0f7cba2d9dbf744bba5f8348ae76f934c1d2438`
- Admin de `attendance`: `astros-admin`
  (`GBD4BE67JX4WMH2COPATPLJJ5ILG6YL7JVL7MF66VRWT5H5NEAJFMW4K`).
- `reputation` no tiene admin ni constructor (plantilla del starter, la app no
  la usa en sus páginas).

## Comandos (desde `app/`, como referencia)

```bash
stellar keys generate astros-admin --network testnet --fund
stellar contract build --manifest-path ../contracts/attendance/Cargo.toml
stellar contract upload --wasm ../target/wasm32v1-none/release/attendance.wasm --source astros-admin --network testnet
stellar contract deploy --wasm-hash 63f078559c77a02fc732345ec0f7cba2d9dbf744bba5f8348ae76f934c1d2438 --source astros-admin --network testnet --alias attendance-staging -- --admin astros-admin
stellar contract deploy --wasm-hash 63f078559c77a02fc732345ec0f7cba2d9dbf744bba5f8348ae76f934c1d2438 --source astros-admin --network testnet --alias attendance-production -- --admin astros-admin
stellar contract build --manifest-path ../contracts/reputation/Cargo.toml
stellar contract deploy --wasm ../target/wasm32v1-none/release/reputation.wasm --source astros-admin --network testnet --alias reputation-staging
stellar contract deploy --wasm ../target/wasm32v1-none/release/reputation.wasm --source astros-admin --network testnet --alias reputation-production
```

Verificación: `event_count` devuelve `0` en ambos `attendance`.

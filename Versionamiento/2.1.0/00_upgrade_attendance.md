# 2.1.0 · 00 · Upgrade de `attendance` (espacios, prueba, moderación, cobro)

- **Versión:** 2.1.0
- **Qué hace:** sube el wasm nuevo de `attendance` y lo instala con `upgrade` en
  staging y producción. Los datos se quedan.
- **Por qué:** 2.1.0 agrega espacios por negocio, roles (moderadores y staff),
  eventos v2 con prueba de asistencia (QR rotativo, check-in del staff,
  aprobación), certificados (hash del nombre), reportes, espacios verificados y
  cobro (cuota gratis, plan mensual y evento único).
- **Compatibilidad:** aditivo. `Event` y `Badge` no cambian; solo se agregan
  `DataKey`, tipos y funciones. Las funciones v1 (`create_event`, `claim`…)
  siguen funcionando para los eventos que ya existen.
- **Cuándo:**
  1. **Staging:** ANTES de fusionar el PR de 2.1.0 en `dev_main`. El CI y los
     Previews de Vercel generan los clientes desde staging: sin este upgrade el
     typecheck del PR falla (las funciones nuevas no existen).
  2. **Producción:** ANTES de fusionar `dev_main → main`.

## Comandos (desde `app/`, con la identidad `astros-admin`)

```bash
stellar contract build --manifest-path ../contracts/attendance/Cargo.toml
stellar contract upload --wasm ../target/wasm32v1-none/release/attendance.wasm --source astros-admin --network testnet
```

El `upload` imprime el hash del wasm. Úsalo en los dos `upgrade`:

```bash
stellar contract invoke --id attendance-staging --source astros-admin --network testnet -- upgrade --new_wasm_hash <HASH>
```

```bash
stellar contract invoke --id attendance-production --source astros-admin --network testnet -- upgrade --new_wasm_hash <HASH>
```

## Verificación

```bash
stellar contract invoke --id attendance-staging --source astros-admin --network testnet -- event_count
```

Debe devolver el mismo número que antes del upgrade. Luego:

```bash
stellar contract invoke --id attendance-staging --source astros-admin --network testnet -- latest_spaces --limit 10 --only_verified false
```

Debe devolver `[]` (todavía no hay espacios).

## Resultado

- Hash del wasm:
  `8cd374974ef6938f514caa74c8b29b19f87c0ae45547a22c6739e1a0cfa7533f` (upload:
  [tx e0a6fa19…](https://stellar.expert/explorer/testnet/tx/e0a6fa19b513e8e8bcbc6f553f2f617f5d431c954970045243976924b8d40c35))
- Fecha staging: 2026-10-26 · Fecha producción: _(completar)_

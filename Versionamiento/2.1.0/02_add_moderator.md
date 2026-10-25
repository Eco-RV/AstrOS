# 2.1.0 · 02 · Moderadores (`add_moderator`)

- **Versión:** 2.1.0
- **Qué hace:** da permisos de moderación a una wallet: verificar espacios,
  ocultar espacios o eventos y revisar reportes desde `/admin`.
- **Por qué:** el admin (`astros-admin`) es una identidad de la terminal, no una
  wallet del navegador. La moderación del día a día la hace una wallet de
  moderador.
- **Cuándo:** DESPUÉS de `00_upgrade_attendance.md`, en cada entorno, una vez
  por moderador.

## Comando (desde `app/`)

Reemplaza `<WALLET>` por la dirección pública (empieza con `G`) de quien va a
moderar:

```bash
stellar contract invoke --id attendance-staging --source astros-admin --network testnet -- add_moderator --moderator <WALLET>
```

Para quitarlo: `remove_moderator --moderator <WALLET>`.

## Verificación

```bash
stellar contract invoke --id attendance-staging --source astros-admin --network testnet -- is_moderator --address <WALLET>
```

Debe devolver `true`. Al entrar con esa wallet aparece la pestaña **Admin**.

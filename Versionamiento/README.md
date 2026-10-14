# Versionamiento de contratos

En AstrOS no hay base de datos SQL: los datos viven en el almacenamiento de los
contratos en Stellar. Esta carpeta cumple el papel de `supabase/Versionamiento/`
en Finance OS: deja por escrito **qué se hizo en cada contrato, en qué orden y
cuándo**, por versión de la app.

```
Versionamiento/
  1.0.0/
    00_despliegue_inicial.md
  1.1.0/
    00_upgrade_attendance.md
```

## Contratos por entorno

| Entorno (`environments.toml`) | Rama / Vercel | `attendance` | `reputation` |
| --- | --- | --- | --- |
| `development` | local (`npm start`) | se redespliega solo; datos desechables | igual |
| `staging` | `dev_main` y Previews | `CBYKEFCNBPQW3G2XABSKYBOGV4VAOS7QPXM3QEUXVH4T4CZECC72YSAU` | `CAIDTMGHVR2NG33A32AGALDFCXQS4JKF5DVJNMOSSP2C4TGRJ55RYDUI` |
| `production` | `main` (Production) | `CAJ4FV5EEP7SFCXLSCOLTVWL6F3ZM34SIDDNR6XGR7FQSTPNF3QIJCFD` | `CDJDECLWXATHQ7CAYM2BDMRE2XJ4N6EV74MQHP3FMVCCILNI4DOUUNVW` |

Todos en **testnet**. El admin (el único que puede hacer `upgrade`) de los de
staging y producción es la identidad local `astros-admin`, guardada en
`app/.config/stellar/identity/` (no se sube a git). Si se pierde, esos contratos
ya no se pueden actualizar: respáldala fuera del repo.

## Reglas

1. **Todo cambio en un contrato desplegado** (upgrade, migración, llamada de
   configuración) va en la carpeta de la versión en desarrollo. Una carpeta
   publicada no se vuelve a tocar.
2. Archivos `NN_descripcion.md` (`00_`, `01_`, …) en el orden en que se corren.
   Cada uno empieza con: versión, qué hace, por qué y **cuándo correrlo**
   ("ANTES de fusionar `dev_main → main`", "DESPUÉS de `00_…`").
3. **Nunca redesplegar** staging ni producción: un despliegue nuevo es un
   contrato vacío (se pierden eventos e insignias) y cambia el ID. El código se
   cambia con `upgrade`; los datos se quedan.
4. **Compatibilidad del almacenamiento** (el equivalente a no romper columnas):
   - No cambies un `#[contracttype]` que ya está guardado (`Event`, `Badge`,
     `DataKey`): agregar, quitar o reordenar campos hace que los datos viejos
     ya no se puedan leer después del `upgrade`.
   - Para datos nuevos usa **variantes nuevas** de `DataKey` o un tipo nuevo
     (`EventV2`) y, si hace falta, una función de migración.
   - Una función con firma nueva se crea con otro nombre (`claim_v2`); la vieja
     se borra en la versión siguiente, no en la misma. Así el `upgrade` se puede
     correr antes de publicar la app sin romper la versión anterior.
5. Orden: primero **staging**, se prueba en el Preview de `dev_main`, y después
   **producción**, justo antes de fusionar `dev_main → main`.

## Plantilla: upgrade de un contrato

Desde `app/` (ahí `app/.env` apunta a la configuración local del CLI), en Git
Bash:

```bash
# 1. Compilar y subir el wasm nuevo (devuelve el hash)
stellar contract build --manifest-path ../contracts/attendance/Cargo.toml
stellar contract upload --wasm ../target/wasm32v1-none/release/attendance.wasm --source astros-admin --network testnet

# 2. Upgrade en staging; probar el Preview de dev_main
stellar contract invoke --id attendance-staging --source astros-admin --network testnet -- upgrade --new_wasm_hash <HASH>

# 3. Upgrade en producción (antes de fusionar dev_main → main)
stellar contract invoke --id attendance-production --source astros-admin --network testnet -- upgrade --new_wasm_hash <HASH>
```

`attendance-staging`, `attendance-production`, `reputation-staging` y
`reputation-production` son alias locales del CLI (`app/.config/stellar/contract-ids/`).
En otra computadora se pueden usar los IDs de la tabla.

Si la interfaz del contrato cambió (funciones o tipos nuevos), Vercel genera de
nuevo los clientes en cada build, así que después del `upgrade` hay que
**redesplegar** el Preview o Production (Vercel → Deployments → Redeploy) para
que la app vea los cambios.

# Flujo de trabajo: ramas, entornos, contratos y releases

Adaptación del flujo de Finance OS a AstrOS (Scaffold Stellar + Vite/React +
Vercel). La diferencia de fondo: **no hay base de datos SQL**; los datos viven
en los contratos de Stellar, así que el "SQL versionado" es
[`Versionamiento/`](../Versionamiento/README.md).

## 1. Ramas

| Rama                                         | Para qué                                             | Cómo entra el código                                               |
| -------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| `main`                                       | Lo publicado (producción). Nunca se trabaja directo. | Solo por PR desde `dev_main`.                                      |
| `dev_main`                                   | Integración: lo que va en la próxima versión.        | PR desde las ramas de feature; docs y ajustes menores van directo. |
| `feature/<versión>` (p. ej. `feature/1.1.0`) | Una versión o feature nueva.                         | Sale de `dev_main` y vuelve por PR a `dev_main`.                   |

- Las ramas son **solo para features nuevas**. Docs, README, CHANGELOG y ajustes
  menores se commitean directo en `dev_main`.
- PRs con **merge commit** (sin squash ni rebase).
- Publicar = PR `dev_main → main` + etiqueta + release (sección 5).

```
feature/1.1.0 ──PR──▶ dev_main ──PR──▶ main ──▶ etiqueta v1.1.0 + release
     ▲                   │
     └── sale de ────────┘
```

## 2. Entornos y despliegue

Cada entorno tiene **sus propios contratos** (sus propios datos), como un
proyecto de Supabase aparte:

| Entorno       | Dónde corre                                       | Contratos                                                     |
| ------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| `development` | tu computadora (`npm start`)                      | se redespliegan solos al cambiar el código; datos desechables |
| `staging`     | `dev_main` y todas las ramas (Vercel **Preview**) | fijos en testnet, se actualizan con `upgrade`                 |
| `production`  | `main` (Vercel **Production**)                    | fijos en testnet, se actualizan con `upgrade`                 |

IDs en `environments.toml` y en
[Versionamiento/README.md](../Versionamiento/README.md). Todo es **testnet** por
ahora; mainnet solo con decisión explícita.

**Vercel** (integración de GitHub + `vercel.json`):

- Cada push a cualquier rama genera un **Preview**; cada commit en `main` va a
  **Production**.
- Vercel no tiene Rust ni el Stellar CLI. `scripts/ci-clients.mjs` genera los
  clientes TypeScript desde los contratos ya desplegados (con `stellar-js` del
  SDK de JS), según el ID de las variables de entorno.
- Variables en _Project → Settings → Environment Variables_:

| Variable                            | Production                                                 | Preview                                                    |
| ----------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| `PUBLIC_STELLAR_NETWORK`            | `TESTNET`                                                  | `TESTNET`                                                  |
| `PUBLIC_STELLAR_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015`                        | igual                                                      |
| `PUBLIC_STELLAR_RPC_URL`            | `https://soroban-testnet.stellar.org`                      | igual                                                      |
| `PUBLIC_STELLAR_HORIZON_URL`        | `https://horizon-testnet.stellar.org`                      | igual                                                      |
| `PUBLIC_CAVOS_APP_ID`               | el App ID público (el mismo de `app/.env`)                 | igual                                                      |
| `PUBLIC_CAVOS_ENVIRONMENT`          | `development`                                              | `development`                                              |
| `PUBLIC_ATTENDANCE_CONTRACT_ID`     | `CAJ4FV5EEP7SFCXLSCOLTVWL6F3ZM34SIDDNR6XGR7FQSTPNF3QIJCFD` | `CBYKEFCNBPQW3G2XABSKYBOGV4VAOS7QPXM3QEUXVH4T4CZECC72YSAU` |
| `PUBLIC_REPUTATION_CONTRACT_ID`     | `CDJDECLWXATHQ7CAYM2BDMRE2XJ4N6EV74MQHP3FMVCCILNI4DOUUNVW` | `CAIDTMGHVR2NG33A32AGALDFCXQS4JKF5DVJNMOSSP2C4TGRJ55RYDUI` |

Nunca una clave `cav_…` ni una clave secreta `S…`: todo `PUBLIC_*` termina en el
navegador.

- **Cavos** solo acepta los orígenes registrados en su dashboard. Agrega el
  dominio de producción (`https://<proyecto>.vercel.app/`) y el de la rama
  `dev_main` (`https://<proyecto>-git-dev-main-<equipo>.vercel.app/`) a los
  orígenes permitidos y a las Callback URLs. Los Previews de otras ramas tienen
  URLs que cambian: ahí el login de Cavos no funciona (se prueba en local o en
  `dev_main`).

## 3. Chequeos (CI)

`.github/workflows/ci.yml` corre en cada PR (y push) a `dev_main` y `main`:

- **Contratos:** `cargo test` y `cargo fmt --check`.
- **App:** genera los clientes desde staging, `typecheck`, `lint`,
  `format:check` y `build`.

En local, antes de cada PR:

```bash
npm run check
npm run build
```

Recomendado en GitHub (_Settings → Branches_): regla para `dev_main` y `main`
que pida los dos checks en verde para fusionar.

## 4. Contratos versionados (`Versionamiento/`)

Reglas completas y plantilla de `upgrade` en
[Versionamiento/README.md](../Versionamiento/README.md). En corto:

- Cambio en un contrato desplegado = archivo `NN_descripcion.md` en la carpeta
  de la versión, con qué, por qué y cuándo correrlo.
- **Nunca redesplegar** staging/producción: `upgrade` y los datos se quedan.
- **No romper el almacenamiento:** no cambies los `#[contracttype]` ya
  guardados; usa claves o tipos nuevos y funciones con nombre nuevo (`_v2`).
- Primero staging (se prueba en `dev_main`), después producción, **antes** de
  fusionar `dev_main → main`.

## 5. Publicar una versión (release)

1. En la rama de la feature: subir la versión
   (`npm version 1.1.0 --no-git-tag-version`) y escribir su sección en
   `CHANGELOG.md`.
2. PR `feature/x.y.z → dev_main` y fusionar.
3. Correr lo de `Versionamiento/x.y.z/` en **staging** y probar el Preview de
   `dev_main`.
4. Correrlo en **producción**.
5. PR `dev_main → main` y fusionar. Vercel despliega a producción.
6. Etiqueta sobre el commit de `main`:

   ```bash
   git fetch origin
   git tag -a vx.y.z origin/main -m "vx.y.z"
   git push origin vx.y.z
   ```

7. GitHub → Releases → etiqueta `vx.y.z`, título `vx.y.z — <resumen>` y como
   cuerpo la sección del CHANGELOG: qué cambió por área, **Contratos** (pasos en
   orden y cuándo) y **Configuración** (variables, Cavos, etc.).

## Checklist por versión

- [ ] Rama `feature/x.y.z` desde `dev_main`
- [ ] Cambios de contrato documentados en `Versionamiento/x.y.z/`, compatibles
      con los datos guardados
- [ ] `npm run check` y `npm run build` en verde
- [ ] CHANGELOG, docs y versión en `package.json`
- [ ] PR → `dev_main`, CI y Preview de Vercel OK
- [ ] `upgrade` en staging, probado en `dev_main`
- [ ] `upgrade` en producción
- [ ] PR `dev_main` → `main` (despliega producción)
- [ ] Etiqueta `vx.y.z` + release con notas, contratos y configuración

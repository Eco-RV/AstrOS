# Changelog

Formato: una sección por versión (`## x.y.z — AAAA-MM-DD`, o `— sin publicar`
mientras se desarrolla). Flujo completo en [docs/FLUJO.md](docs/FLUJO.md).

## 1.0.1 — sin publicar

"Tu constelación": rediseño mobile first para la demo de clase. Plan completo en
[docs/1.0.1/PLAN.md](docs/1.0.1/PLAN.md).

### Diseño

- Tema "cielo nocturno": nueva paleta, tipografías Space Grotesk + Inter, fondo
  de estrellas con parallax y logo nuevo (sello + wordmark; propuestas en
  `docs/1.0.1/logos/`).
- Móvil: barra inferior con Eventos · ＋ Crear · Mi constelación, botón de
  reclamar fijo al alcance del pulgar.
- Inicio con "Tu misión" en 3 pasos (entra, reclama, crea) que se marcan solos,
  evento destacado (`PUBLIC_FEATURED_EVENT_ID`) y filtros de eventos.
- Reclamar una insignia dispara la animación "supernova" (con vibración en
  móvil).
- "Mi constelación": las insignias como estrellas unidas en orden de reclamo,
  más vista de lista y estadísticas.
- Crear evento en su propia página (`/crear`), con atajos de horario y vista
  previa de la insignia.
- Menú de cuenta (avatar) con saldo, dirección, enlace al explorador y cierre de
  sesión.

### Cuentas

- Las cuentas nuevas reciben XLM de prueba automáticamente (Friendbot) al
  iniciar sesión, con aviso de progreso.

### Imágenes

- Crear evento empieza con la foto: cámara o galería, se comprime en el
  navegador (máx. 800 px, JPEG) y se sube al instante a IPFS público con Pinata
  mediante la función `api/upload.mjs`. En el contrato se guarda `ipfs://<CID>`.
- Las imágenes `ipfs://<CID>` se muestran con `PUBLIC_IPFS_GATEWAY`.
- Sigue disponible pegar un enlace `https://` o `ipfs://` en lugar de subir
  foto.

### Limpieza

- Se quitaron Escrow Studio (Trustless Work), el panel de reputación, la página
  de contratos (Debug), `tw:smoke` y la dependencia `@trustless-work/escrow`.
- La app ya no usa el contrato `reputation`; sus despliegues de staging y
  producción quedan donde están (sin cambios). La variable
  `PUBLIC_REPUTATION_CONTRACT_ID` ya no hace falta en Vercel.

### Contratos

- Sin cambios: no hay pasos en `Versionamiento/1.0.1/`.

### Configuración

- Vercel (Production y Preview): `PUBLIC_FEATURED_EVENT_ID` (opcional),
  `PUBLIC_IPFS_GATEWAY` y el secreto `PINATA_JWT` (sin prefijo `PUBLIC_`).
- Local: `PINATA_JWT` en `app/.env.local` para probar la subida de fotos.

## 1.0.0 — 2026-10-14

Primera versión publicada de AstrOS: insignias de asistencia estilo POAP en
Stellar testnet.

### Eventos

- Cualquiera crea un evento con ventana de reclamo y máximo de insignias
  opcional.
- El organizador puede cerrar su evento antes de tiempo.

### Insignias

- Una insignia personal y no transferible por cuenta y evento; el reclamo es
  abierto (sin código) mientras el evento está abierto.
- Página "Mis insignias" con la colección de la cuenta.

### Cuentas

- Inicio de sesión con correo o Google (Cavos), sin extensión de billetera.

### Flujo de trabajo

- Ramas `main` / `dev_main` / `feature/x.y.z`, CI en GitHub Actions y despliegue
  en Vercel (Preview por rama, Production desde `main`).

### Contratos (ya corrido, en orden)

1. `Versionamiento/1.0.0/00_despliegue_inicial.md`: contratos de staging y
   producción en testnet.

### Configuración

- Vercel: variables de entorno por entorno (ver docs/FLUJO.md, sección 2).
- Cavos: agregar el dominio de producción y el de `dev_main` en Vercel a los
  orígenes permitidos y a las Callback URLs.

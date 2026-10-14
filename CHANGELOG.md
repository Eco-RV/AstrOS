# Changelog

Formato: una sección por versión (`## x.y.z — AAAA-MM-DD`, o `— sin publicar`
mientras se desarrolla). Flujo completo en [docs/FLUJO.md](docs/FLUJO.md).

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

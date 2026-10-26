# Changelog

Formato: una sección por versión (`## x.y.z — AAAA-MM-DD`, o `— sin publicar`
mientras se desarrolla). Flujo completo en [docs/FLUJO.md](docs/FLUJO.md).

## 2.1.0 — 2026-10-26

AstrOS como SaaS para cualquier negocio: cada barbería, universidad o comunidad
tiene su espacio, con tres roles (asistente, organizador y moderador), prueba de
asistencia contra el farming, certificados verificables, moderación y cobro.

### Espacios y roles

- **Espacios** (`/s/:enlace`): nombre, categoría (Universidad, Empresa,
  Comunidad, Belleza, Bienestar, Conferencia, Otro), logo y un color de una
  lista curada (todos con contraste ≥ 7:1).
- **Consola del organizador** (`/organizar`): crear espacios, ver sus eventos,
  el plan y el uso del mes, y agregar staff por dirección.
- **Panel de moderación** (`/admin`): verificar u ocultar espacios, revisar
  reportes y ocultar eventos. Solo para el admin y los moderadores.
- La navegación muestra "Admin" solo a moderadores.

### Prueba de asistencia y certificados

- Cada evento elige cómo se comprueba la asistencia:
  - **Check-in del staff**: el staff escanea el QR personal del asistente con la
    cámara y firma por él.
  - **QR rotativo**: el proyector muestra un código firmado que cambia cada 30 s
    y vale 2 minutos. La llave se crea en el navegador del organizador y no se
    puede extraer.
  - **Aprobación** (virtual): el asistente pide su insignia y el organizador
    aprueba la lista.
- El `claim` abierto ya no sirve en estos eventos; cada insignia registra quién
  dio fe y con qué método.
- **Certificado verificable** (`/certificado/:evento/:cuenta`), público e
  imprimible. El nombre no va a la blockchain: solo una huella con sal que el
  titular registra; el enlace lleva el nombre y la sal para comprobarlo.

### Moderación

- El inicio muestra **solo eventos de espacios verificados**, con filtro por
  categoría. Los eventos anteriores a 2.1.0 siguen en su página y en "Mi
  constelación", pero no en el inicio.
- Botón **Reportar** en cada evento (una vez por cuenta) y filtro de palabras
  ofensivas o de burla al crear espacios y eventos.

### Cobro en USDC por tramos de asistentes

- Plan gratis: 2 eventos al mes por espacio, hasta 50 asistentes cada uno.
- **Evento único** por tamaño (hasta 100 / 500 / 2 000 asistentes: 15 / 45 / 120
  USDC), cobrado en la misma firma.
- **Plan mensual** por tamaño de evento (39 / 99 / 249 USDC al mes). Un evento
  más grande que el plan paga su tramo.
- `quote_event` cotiza el costo exacto antes de firmar; el formulario lo muestra
  según los asistentes esperados. Solo los eventos gratis gastan la cuota
  gratis.
- Botón para agregar la trustline de USDC y enlace al faucet de Circle.
- Plan de patrocinio de tarifas para asistentes en `docs/patrocinio-tarifas.md`
  (sin implementar).

### Contratos

- `attendance`: upgrade aditivo (espacios, eventos v2, prueba, moderación,
  cobro). Ver `Versionamiento/2.1.0/` (upgrade, precios y moderadores).
- Script `scripts/seed-demo.mjs`: datos de demo en development.

## 2.0.1 — 2026-10-25

Rediseño visual completo con el sistema visual común de las apps de Oswald
(`design-system.md`: estructura de Stellar Apex, energía de Zenless Zone Zero) y
la paleta propia de AstrOS, **Nebula**. Pensado para organizadores serios
(empresas, universidades, eventos de blockchain). Solo cambia lo visual: rutas,
wallets, contratos y testnet quedan igual.

### Sistema

- **Paleta Nebula** en un solo bloque de `app-lib/styles.css` (`--void`,
  `--surface`, `--paper`, `--signal` violeta claro, `--alert` rosa) más los
  semánticos `--ok` y `--danger`. Todo lo demás se deriva con `color-mix`; los
  componentes no usan colores literales.
- **Slabs de papel** (`.slab`) con bordes diagonales, medio tono y banda de
  peligro: redefinen los mismos tokens, así los componentes funcionan igual
  dentro.
- Tipografía **Oswald** en toda la app (títulos en mayúsculas, números de
  capítulo inclinados, cifras tabulares).
- **Sombras duras** (`8px 8px 0`) en lugar de sombras difusas; botones que se
  hunden al presionar. Esquinas cuadradas en todo.
- **Ícono nuevo** (sello de verificación con anillo que gira) en el header, el
  login, el QR y el favicon.
- Fondo técnico (`Blueprint`) con guías verticales; reemplaza el cielo con
  estrellas fugaces (`Starfield` eliminado).
- Índice lateral de secciones (escritorio, ≥ 1100 px) y tira de película con los
  nombres de los eventos.
- Movimiento: letras que suben en secuencia, entrada al hacer scroll
  (`useReveal`) y botones magnéticos. Los textos no reaccionan al cursor; solo
  botones y tarjetas. Todo se apaga con "reducir movimiento".

### Pantallas

- **Login**: tarjeta en bloque de color sobre la cuadrícula, "Entra a la
  constelación" y chip de red con punto que pulsa.
- **Pantalla de carga**: "Cargando constelación · NN %", una vez por sesión, 1.3
  s y se salta con un clic.
- **Inicio**: hero con la foto del evento destacado, sticker "Testnet" y rail de
  estado (el número de eventos en curso sale del contrato); misiones dentro de
  un slab y CTA final para crear un evento.
- **Eventos = misiones**: tarjetas escalonadas con la foto de cada evento (o su
  medalla si no tiene) y sticker de estado, agrupadas en En curso, Próximas,
  Completadas y Terminadas (estilo bloqueado a rayas con candado). Reemplazan
  los filtros.
- **Detalle**: medalla grande y ficha del evento en un slab, con medidor
  semicircular del cupo (solo si el evento tiene máximo).
- **Mi constelación**: ficha de jugador (nivel = insignias, barra de XP sobre el
  máximo de 100 por cuenta), mapa técnico con anillos que giran y la última ruta
  punteada, y logros que se voltean (fecha, evento y enlace a Stellar Expert).
  Las insignias por reclamar de eventos abiertos o próximos se ven bloqueadas.
- **Insignias**: `BadgeArt` ahora es una medalla SVG (anillo, marcas y disco con
  la sigla o la foto del evento).
- Crear evento, modo presentación, celebración al reclamar, menú de cuenta,
  avisos (banda oscura con borde `--ok`/`--danger`) y banner de XLM de prueba
  con el estilo nuevo.

### Contratos

- Sin cambios.

## 1.0.2 — 2026-10-17

AstrOS vuelve a lo esencial: una app limpia de eventos e insignias, a la que
solo se entra con una wallet.

### Entrada

- **Pantalla de carga** con el tema de AstrOS cada vez que se abre la app: la
  constelación del logo se dibuja estrella por estrella mientras se restaura la
  sesión. También da la bienvenida al terminar de entrar.
- **Login obligatorio** ("Entra a la constelación"): sin wallet no se ve la app.
  Opciones: correo o Google (Cavos crea la wallet al instante) o conectar una
  wallet de extensión (Freighter, xBull, Lobstr…). Si la cuenta de Cavos
  necesita desbloquear este dispositivo, ofrece la passkey.
- El modo presentación (`/evento/:id/proyectar`) sigue abierto sin login.
- **Lluvia de estrellas** en el fondo de toda la app: estrellas fugaces suaves,
  cada una a su ritmo (se apagan con "reducir movimiento" y en el modo
  presentación, para no confundirlas con los reclamos).

### Limpieza

- Se quitó "Tu misión" (el paso a paso del inicio).
- Fuera los botones y mensajes de "inicia sesión" dentro de la app: ahora todo
  pasa por la pantalla de entrada.

### Correcciones

- Las animaciones que usaban `spin`, `twinkle` y `fade-up` dentro de los CSS
  Modules no corrían (los nombres se renombran por archivo): el anillo que gira
  en los eventos abiertos, el parpadeo de las estrellas y las entradas de página
  ya funcionan.

### Contratos

- Sin cambios.

## 1.0.1 — 2026-10-15

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
- Modo presentación (`/evento/:id/proyectar`, botón «Proyectar» para quien
  organiza): QR gigante al evento, contador en vivo que rebota con cada
  insignia, estrella fugaz por reclamo, últimas direcciones que reclamaron y los
  3 pasos para la clase. Avisa si el QR apunta a localhost.
- Menú de cuenta (avatar) con saldo, dirección, enlace al explorador y cierre de
  sesión.

### Cuentas

- Las cuentas nuevas reciben XLM de prueba automáticamente (Friendbot) al
  iniciar sesión, con aviso de progreso.

### Imágenes

- Crear evento empieza con la foto: cámara o galería, se comprime en el
  navegador (máx. 800 px, JPEG) y se sube al instante a IPFS público con Pinata
  mediante la función `api/upload.mjs`. En el contrato se guarda `ipfs://<CID>`.
- Las imágenes `ipfs://<CID>` se muestran con `PUBLIC_IPFS_GATEWAY` (acepta el
  dominio sin `https://`) y, si falla, con gateway.pinata.cloud e ipfs.io.
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

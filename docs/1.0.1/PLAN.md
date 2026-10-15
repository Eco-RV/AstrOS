# AstrOS 1.0.1 — "Tu constelación" (demo de clase del sábado)

> Estado: **publicado** en v1.0.1 (pendiente: PWA instalable y pruebas en
> móviles reales). Rama: `feature/1.0.1` desde `dev_main`.

## 1. Objetivo

Que un estudiante, **desde su móvil y sin saber nada de cripto**, en menos de 2
minutos:

1. Escanee un QR proyectado → abra AstrOS.
2. Entre con su correo (Cavos crea su wallet).
3. Reclame la insignia del evento de la demo.
4. Cree su propio evento con una foto tomada con la cámara.
5. Vea sus insignias en "Mi constelación".

Todo lo demás de la app se va (escrows, reputación, debug, explorador).

## 2. Alcance

| Sí entra                                              | No entra (queda para después)       |
| ----------------------------------------------------- | ----------------------------------- |
| Login con correo/Google (Cavos) o wallet de extensión | Escrows / Trustless Work            |
| Lista de eventos de la comunidad + evento destacado   | Reputación / reseñas                |
| Crear evento con foto (cámara o galería)              | Página Debug / "Contratos"          |
| Reclamar insignia + animación                         | Editar o borrar eventos             |
| "Mi constelación": mis insignias                      | Códigos secretos / QR por asistente |
| Fondeo automático con Friendbot                       | Mainnet                             |
| Modo presentación (QR grande + contador en vivo)      | Cambios en contratos                |

**Sin cambios de contrato:** `Event.image_url` ya existe (máx. 200 caracteres),
así que no hay `upgrade` ni archivos en `Versionamiento/1.0.1/`.

## 3. Decisión: las fotos van a IPFS (Pinata)

Decidido el 2026-10-14: **IPFS con Pinata**.

- El navegador comprime la foto y la manda a una función de Vercel
  `/api/upload`, que guarda el `PINATA_JWT` (secreto, **solo** en el servidor,
  nunca `PUBLIC_`) y sube el archivo a la red pública de IPFS de Pinata.
- En el contrato se guarda `ipfs://<CID>` (~66 caracteres, cabe en los 200). La
  app lo convierte en URL con `PUBLIC_IPFS_GATEWAY` (el gateway de Pinata del
  proyecto; `https://ipfs.io` como respaldo), así se puede cambiar de gateway
  sin tocar datos guardados.
- En local, un middleware de Vite (`app/vite.config.ts`) sirve la misma función
  en `/api/upload`; el JWT va en `app/.env.local`.
- Implementado en `api/upload.mjs`, `app/src/lib/photo.ts` y
  `app/src/attendance/PhotoPicker.tsx`.
- Las fotos en IPFS no se pueden borrar de forma garantizada: el aviso lo dice.

Opciones que se evaluaron:

| Opción                        | Pros                                                                                           | Contras                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Vercel Blob** (recomendada) | Ya estamos en Vercel; 1 función `/api/upload`; gratis en Hobby; se pueden borrar fotos después | Centralizado; necesita `BLOB_READ_WRITE_TOKEN` (secreto, solo en el servidor) |
| IPFS (Pinata)                 | Más "web3", buena historia para la clase                                                       | Otra cuenta + JWT secreto; borrar no es garantizado; gateways lentos          |
| Solo URL pegada (como hoy)    | Cero trabajo                                                                                   | En el móvil nadie tiene una URL de su foto: rompe la demo                     |

En ambos casos la foto se **comprime en el navegador** (máx. 800 px, WebP ~100
KB) antes de subir, y se avisa: "La foto queda pública. No subas fotos de otras
personas sin permiso". Límite en la función: solo `image/*`, máx. 2 MB.

## 4. Experiencia (mobile first)

### Flujo del estudiante

```
QR en el proyector ─▶ /evento/:id (evento demo)
  └─ "Entrar con correo" ─▶ Cavos ─▶ vuelve al evento
       └─ (auto) Friendbot fondea la cuenta  · animación "cargando combustible"
            └─ "Reclamar mi insignia" ─▶ modal de Cavos ─▶ ✦ supernova
                 └─ la insignia vuela a la pestaña "Mi constelación"
                      └─ CTA: "Ahora crea tu propio evento" ─▶ cámara
```

### Navegación

- **Móvil:** barra inferior fija con 3 pestañas: `Eventos` · `＋ Crear` (botón
  central elevado) · `Mi constelación`. Header mínimo: logo + avatar/sesión.
- **Web (≥ 768 px):** header con las mismas 3 entradas; grilla de eventos de 2–3
  columnas; crear evento en un panel lateral.
- Áreas táctiles ≥ 44 px, `env(safe-area-inset-bottom)` para iPhone, inputs de
  16 px (evita el zoom de iOS).

### Pantallas

1. **Bienvenida / Eventos** — hero con cielo estrellado y "Misión en 3 pasos"
   (Entra → Reclama → Crea) que se va tachando sola según lo que el usuario ya
   hizo (guardado en `localStorage`). Debajo: **evento destacado** (el de la
   demo, vía `PUBLIC_FEATURED_EVENT_ID`) y la lista "Eventos de la comunidad"
   con filtros `Abiertos / Próximos / Terminados`.
2. **Detalle de evento** — foto grande como sello circular, estado, contador
   `12 / 50`, botón principal pegado abajo en móvil. Para el organizador:
   "Compartir" (Web Share API en móvil, copiar en web) y **Modo presentación**.
3. **Crear evento** — wizard de 3 pasos en móvil: _Foto_ (cámara/galería con
   `accept="image/*" capture="environment"`, vista previa recortada en círculo =
   así se verá la insignia) → _Datos_ (nombre, descripción, lugar) → _Cuándo_
   (atajos: "Ahora · 2 h", "Hoy", "Personalizado"; máximo opcional).
4. **Mi constelación** — las insignias como estrellas unidas por líneas en orden
   de reclamo (vista "constelación") + vista "lista" con número de asistente y
   fecha. Estado vacío: "Tu cielo está vacío. Reclama tu primera estrella".
5. **Modo presentación** (`/evento/:id/proyectar`) — pantalla completa: QR
   gigante, nombre del evento y contador que sube en vivo (suscripción a
   `BadgeClaimed`, ya existe `useSubscription`), con una estrella que aparece
   por cada reclamo. Ideal para el proyector.

### Microcopy instructivo

Tooltips de una línea ("¿Qué es esto?") en los conceptos clave: _wallet_, _XLM
de prueba_, _transacción_, _insignia no transferible_. Cada uno con 1–2 frases
simples y un enlace "Ver en el explorador" tras cada transacción (Stellar Expert
testnet) para que vean que es real.

## 5. Dirección visual

**Concepto: "cada evento al que asistes es una estrella; tu colección es tu
constelación".**

- **Paleta (tema oscuro por defecto, claro opcional)**
  - Noche `#0B0820` (fondo), Nebulosa `#1A1438` (tarjetas)
  - Aurora: degradado `#7B61FF → #C86DD7 → #3DD6F5`
  - Estrella `#FFD66B` (acentos, insignias reclamadas)
  - Éxito `#3DDC97`, Error `#FF6B8A`
- **Tipografía:** _Space Grotesk_ (títulos, logo) + _Inter_ (texto).
- **Formas:** tarjetas con borde de 1 px semitransparente y brillo sutil
  ("glass"), insignias siempre circulares con borde dentado de sello.

### Animaciones (todas con `prefers-reduced-motion` respetado)

| Momento              | Animación                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| Fondo                | Campo de estrellas en 2 capas con parallax leve al hacer scroll (canvas o CSS)                      |
| Login listo          | La órbita del logo da una vuelta y aparece el avatar                                                |
| Friendbot fondeando  | Barra "cargando combustible" con cohete; termina en "10 000 XLM de prueba"                          |
| Esperando firma      | El botón se vuelve una órbita girando ("Firmando en tu wallet…")                                    |
| Insignia reclamada   | **Supernova:** el sello hace scale + destello radial + chispas ✦, vibración `navigator.vibrate(50)` |
| Insignia → colección | La insignia vuela a la pestaña "Mi constelación" (View Transitions API, fallback fade)              |
| Constelación         | Las líneas entre estrellas se dibujan con `stroke-dashoffset`                                       |
| Lista de eventos     | Entrada escalonada de tarjetas (stagger 40 ms)                                                      |
| Modo presentación    | Cada reclamo nuevo = estrella fugaz cruzando la pantalla + contador que rebota                      |

Todo en CSS / Web Animations API, **sin librerías nuevas** (salvo un generador
de QR pequeño, p. ej. `qrcode`).

## 6. Limpieza

Eliminar:

- `app/src/pages/Escrows.tsx`, `Escrows.module.css`, `Home.tsx`,
  `Home.module.css`, `Debug.tsx` y sus rutas.
- `app/src/trustless/` completo y su provider en `main.tsx`.
- `app/src/components/ReputationPanel.*`.
- Dependencia `@trustless-work/escrow`; variables `PUBLIC_TRUSTLESS_*` del
  `.env.example`.
- `reputation` de `environments.toml` (development), de `scripts/ci-clients.mjs`
  y de `.github/workflows/ci.yml`. Los contratos ya desplegados en staging y
  producción se quedan donde están (no molestan); se anota en el CHANGELOG.
- Botón "Fund Account" visible (pasa a ser automático; queda como reintento
  dentro del menú de la cuenta).
- Enlace "Explorador" y "Contratos" del header; footer reducido a 1 línea.

Se quedan: skills, `contracts/` de ejemplo (es un starter), `FLUJO.md`.

## 7. Tareas (en orden, cada una verificable)

| #   | Tarea                                                                              | Verificación                  |
| --- | ---------------------------------------------------------------------------------- | ----------------------------- |
| 1   | Crear `feature/1.0.1`, bump `package.json` a 1.0.1, sección en CHANGELOG           | —                             |
| 2   | Limpieza (sección 6)                                                               | `npm run check` verde         |
| 3   | Tokens de diseño nuevos en `app-lib/styles.css` + fuentes + logo/favicon/PWA icons | revisión visual               |
| 4   | Layout: header + barra inferior móvil + fondo de estrellas                         | 375 px y 1280 px              |
| 5   | Fondeo automático tras login (Friendbot si la cuenta no existe)                    | cuenta nueva en testnet       |
| 6   | `/api/upload` + compresión en navegador + wizard "Crear evento"                    | foto desde el móvil real      |
| 7   | Detalle de evento + supernova + Web Share                                          | reclamo en testnet            |
| 8   | "Mi constelación" (vista constelación + lista)                                     | cuenta con 0, 1 y 5 insignias |
| 9   | Evento destacado + "Misión en 3 pasos"                                             | —                             |
| 10  | Modo presentación con QR y contador en vivo                                        | 2 móviles reclamando a la vez |
| 11  | `manifest.webmanifest` (instalable, ícono) + meta `theme-color`                    | Lighthouse móvil              |
| 12  | PR `feature/1.0.1 → dev_main`, prueba en Preview de `dev_main`, PR a `main`        | checklist sección 8           |

## 8. Checklist antes del sábado

- [ ] Cavos dashboard: dominio de producción en orígenes permitidos y Callback
      URLs (Previews de ramas no funcionan con Cavos).
- [ ] Cavos dashboard → **Approvals**: revisar si se pueden permitir las
      llamadas al contrato `attendance` sin modal; si no, avisar en clase "te
      aparecerá una ventana de confirmación: acéptala".
- [ ] `PINATA_JWT` (y `PUBLIC_IPFS_GATEWAY`) en Vercel; el JWT solo del lado del
      servidor (nunca `PUBLIC_`).
- [ ] Crear el evento de la demo en **producción** con ventana que cubra toda la
      clase (p. ej. 08:00–14:00) y sin límite; poner su id en
      `PUBLIC_FEATURED_EVENT_ID`.
- [ ] Probar el flujo completo en Android (Chrome) e iPhone (Safari) con datos
      móviles, no solo Wi-Fi.
- [ ] Plan B si Friendbot falla con 30 personas a la vez: reintento con espera
      exponencial + mensaje claro; como último recurso, fondear desde la cuenta
      del profesor.
- [ ] Imprimir el QR también en papel por si falla el proyector.

## 9. Riesgos

| Riesgo                                     | Mitigación                                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Friendbot limitado / lento                 | Reintentos + plan B (sección 8)                                                                           |
| Modal de aprobación de Cavos confunde      | Pantalla de "qué vas a ver" antes de firmar, con captura                                                  |
| Wi-Fi del aula saturado                    | Fotos comprimidas ~100 KB; probar con datos móviles                                                       |
| Fotos inapropiadas en el evento público    | Aviso + el organizador puede borrar el archivo del Blob; filtrar la lista por "eventos de hoy" en la demo |
| Login en otro dispositivo pierde la wallet | Explicarlo como "es testnet"; ofrecer passkey después del primer reclamo                                  |

## 10. Logotipos

Propuestas en [`docs/1.0.1/logos/`](logos/) (abre `logos/index.html` para verlas
en claro y oscuro):

1. **Órbita** — una "A" atravesada por una órbita, con una estrella en la punta.
2. **Constelación** — cinco estrellas unidas que dibujan la "A".
3. **Sello** — insignia circular dentada con planeta y anillo (ideal para ícono
   de app / favicon).
4. **Wordmark** — "AstrOS" con la "O" como planeta con anillo.

Recomendación: **Sello** como ícono (favicon, PWA, avatar) + **Wordmark** en el
header.

# Lecciones aprendidas en AstrOS

Problemas reales que aparecieron construyendo AstrOS (v1.0.0 y v1.0.1) y cómo se
resolvieron. Ahorran horas en Finance OS.

## Stellar y wallets

| Problema                                                                                                                                               | Solución                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Una cuenta nueva (Cavos recién creada) **no existe en la red** hasta que recibe XLM; cualquier transacción falla.                                      | Al iniciar sesión, si `fetchBalances` no trae `xlm`, llamar a Friendbot automáticamente (`AutoFund.tsx`) y mostrar el progreso. Friendbot solo funciona una vez por cuenta.   |
| Si Cavos crea la cuenta con su patrocinio (`wallet.execute`, `addTrustline`) antes de Friendbot, queda con 0 XLM y Friendbot la rechaza.               | **Friendbot primero**, después trustline USDC y lo demás (skill `cavos`, sección de fondos en testnet).                                                                       |
| Para tener USDC hace falta **trustline** (reserva de 0,5 XLM).                                                                                         | `addUsdcTrustline` (en `git show c40bb6b:app/src/trustless/usdc.ts`). Explicarlo en la Academia: "abrir tu bolsillo de dólares".                                              |
| El faucet de Circle da poco USDC y con espera.                                                                                                         | En testnet, cambiar XLM de prueba por USDC en el DEX (`swapXlmForUsdc`, path payment a uno mismo con 5 % de tolerancia). Si no hay liquidez, enlazar al faucet de Circle.     |
| Las llamadas a contratos con Cavos muestran **un modal de aprobación** (pagos pequeños de XLM/USDC y `changeTrust` son silenciosos).                   | Avisar en la interfaz antes de firmar ("te aparecerá una ventana de confirmación") y manejar los errores `the user rejected this transaction` / `policy does not allow`.      |
| Cavos solo permite **orígenes registrados**; los Previews de ramas de Vercel cambian de URL y ahí el login falla.                                      | Registrar localhost, producción y la URL fija de `dev_main` (orígenes y Callback URLs). Probar el login en local o en `dev_main`.                                             |
| `app-lib` y la app tenían **dos copias del SDK de Stellar**: los `xdr.ScVal` de una no son instancias de la otra (error de tipos con `scValToNative`). | Decodificar pasando por XDR: `scValToNative(xdr.ScVal.fromXDR(v.toXDR("base64"), "base64"))`. Mejor: una sola versión del SDK en todo el proyecto.                            |
| Leer eventos de contrato: el filtro de RPC por tema solo coincide si el número de temas es exacto.                                                     | Filtrar con `[<tema>, "**"]` (lo hace `subscribeToEvents`). Topics de `#[contractevent]`: `[nombre_snake_case, …campos #[topic]]`; el cuerpo es un mapa con los demás campos. |
| El contador "en vivo" desde eventos se pierde reclamos anteriores a abrir la página.                                                                   | Fuente de verdad = leer el contrato con polling (React Query `refetchInterval`); los eventos solo para el "quién" y las animaciones.                                          |

## Datos y archivos

| Problema                                                                                       | Solución                                                                                                                                       |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Las imágenes `ipfs://` no cargaban: **`ipfs.io` responde 429** (demasiadas peticiones).        | Gateway dedicado de Pinata en una variable, y cadena de respaldo (`gateway.pinata.cloud`, luego `ipfs.io`) en el componente de imagen.         |
| La variable del gateway se cargó sin `https://` y el navegador la trató como ruta local.       | Normalizar en código: si no trae protocolo, anteponer `https://`.                                                                              |
| Un JWT pegado con un carácter de más ("Yes" dentro del token) daba 401 `signature is invalid`. | Probar credenciales con un endpoint de autenticación (Pinata: `GET /data/testAuthentication`) sin subir nada, y pedir pegar con Ctrl+A/Ctrl+V. |
| En Node, `process.env.X = undefined` guarda el **texto** `"undefined"`.                        | Asignar solo si hay valor, y validar `!x \|\| x === "undefined"`.                                                                              |
| La regla de rewrite de la SPA en Vercel capturaba `/api/*`.                                    | `"source": "/((?!api/).*)"` (en Next.js no aplica, pero sí si hay rewrites propios).                                                           |

## Interfaz (mobile first)

| Problema                                                                                    | Solución                                                                                                          |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Un botón `position: fixed` (reclamar, pegado abajo) quedaba atrapado dentro de una tarjeta. | `backdrop-filter` (y `transform`) en un ancestro crea un nuevo contenedor para `fixed`: quitarlo de las tarjetas. |
| iOS hace zoom al enfocar inputs.                                                            | Fuente de 16 px en los inputs.                                                                                    |
| Barra inferior tapada por la barra de gestos del iPhone.                                    | `env(safe-area-inset-bottom)` y `viewport-fit=cover`.                                                             |
| Fotos de celular de 3–12 MB saturan el Wi-Fi de un aula.                                    | Reducir en el navegador a 800 px JPEG (~60–200 KB) con `createImageBitmap` (respeta la rotación EXIF).            |
| Animaciones para todos, sin marear a nadie.                                                 | Bloque global `prefers-reduced-motion: reduce` que las apaga.                                                     |

## Trabajo con el agente

| Situación                                                                                                   | Cómo se resolvió                                                                                                          |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| El panel del navegador de Claude a veces es muy pequeño u oculto (altura 0) y `loading="lazy"` nunca carga. | Capturas reales con Edge headless: `msedge --headless=new --window-size=390,844 --screenshot=… <url>`.                    |
| En modo auto, el agente **no puede fusionar PRs** sin revisión.                                             | El agente abre PRs, etiqueta y publica releases; el usuario fusiona.                                                      |
| `gh` apuntaba al repo `upstream` (el starter original) y fallaba al crear PRs.                              | `gh repo set-default <owner>/<repo>`.                                                                                     |
| Secretos en archivos `.env`.                                                                                | El agente no los lee ni los imprime: solo verifica que existan o su forma (largo, partes de un JWT) sin mostrar el valor. |

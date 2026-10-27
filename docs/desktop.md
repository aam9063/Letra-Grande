# Escritorio con Electron

Documento de decisión y de diseño del descargable de Letra Grande. Corresponde a la decisión D-11 del documento de arranque. Decide la plataforma, fija las reglas que no se negocian y deja escrito qué falta. La PWA sigue siendo el mismo producto en el navegador: no se sustituye, se envuelve.

## 1. Decisión

| Tema | Decisión |
|---|---|
| Envoltorio | **Electron**, con `electron-builder` para empaquetar |
| Alcance inicial | **Solo Windows**, instalador NSIS |
| macOS y Linux | Después, con el trabajo de firma que describe la sección 8 |
| Asistente de IA | **Llama al proxy alojado**. El binario **no** lleva ninguna clave |
| PWA | Se mantiene. Misma base de código, dos entregas |
| Distribución | Descargable desde la landing, sin tiendas |

Por qué Electron y no Tauri: el renderer es el mismo Chromium que ya cubren las pruebas de Playwright, así que lo que funciona en `pnpm e2e` funciona en el binario. OCR con WASM y trabajadores, IndexedDB y WebCrypto se comportan igual que en las pruebas, y no dependemos de la versión de WebView de cada sistema. El coste es el tamaño del instalador, y ese coste se acepta.

## 2. Regla que no se rompe: la clave de IA no viaja en el binario

Una clave dentro de un `.exe` se extrae con `strings` en un minuto. Si el escritorio la llevara:

- cualquiera podría usar la cuota de todos;
- se incumpliría la condición de NaN de clave personal e intransferible (H-08);
- se caería la garantía de que el servidor es el único que habla con el proveedor.

Por eso el escritorio **no empaqueta el proxy**: apunta a la URL del proxy alojado y envía texto ya enmascarado, exactamente como el navegador. La única diferencia es de dónde sale la petición.

Consecuencia que hay que decir en la interfaz: **sin conexión, el asistente no responde**. La carpeta, el radar, las fichas y las plantillas siguen funcionando.

## 3. Arquitectura

```
apps/desktop/            Electron: proceso principal, preload y empaquetado
  src/main.ts            ventana, protocolo app://, actualizador, menú, ciclo de vida
  src/preload.ts         superficie mínima expuesta al renderer
  electron-builder.yml   objetivos de empaquetado por plataforma

apps/web/                el mismo renderer que la PWA
  next.config.ts         dos salidas: servidor (web) y exportación estática (escritorio)
```

El renderer es el build estático de `apps/web`. El proceso principal lo sirve por un protocolo propio, `app://letra-grande`, y no con `file://`. Esto no es un detalle: en Chromium, `file://` da un origen opaco y deja IndexedDB y WebCrypto en un estado poco fiable. Con un protocolo propio el origen es estable y el vault funciona igual que en la web.

### Por qué exportación estática y no cargar la web alojada

Cargar `https://letragrande.app` dentro de una ventana sería un navegador con marco. Perdería lo que buscamos: funcionar sin conexión, tener el vault en almacenamiento propio de la app y actualizar por el canal del escritorio. La exportación estática viaja dentro del binario; el asistente es lo único que sale a la red.

La ruta de API no se puede exportar de forma estática, y no hace falta: el escritorio no la usa, llama al proxy alojado por su URL pública.

### Almacenamiento

IndexedDB, igual que en la PWA, pero en el directorio de datos de la aplicación (`app.getPath("userData")`). Esto cierra el riesgo real de la PWA: **el navegador no puede desalojar el vault**. Se mantiene la copia cifrada como red de seguridad, ahora guardada en una carpeta real del sistema.

## 4. Seguridad del envoltorio

El proceso principal es código privilegiado. Reglas mínimas, todas verificables en revisión:

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- El `preload` expone una superficie mínima y explícita. Hoy son exactamente tres valores: `version`, `platform` y `isDesktop`. Nada de `ipcRenderer` en crudo. Los avisos de actualización son diálogos nativos del proceso principal, no del renderer (sección 8 ter), así que no pasan por el preload y la superficie no cambia. La ruta de la copia cifrada elegida por la persona llegará con su tarea propia.
- `will-navigate` y `setWindowOpenHandler` bloquean navegación fuera de `app://`; los enlaces externos se abren en el navegador del sistema.
- CSP estricta en la respuesta del protocolo propio, con `connect-src` limitado al proxy configurado. La única excepción es `style-src 'unsafe-inline'`, y es deliberada: las páginas prerenderizadas llevan atributos `style` en línea para los colores de estado, y CSS no ejecuta código. Los scripts siguen protegidos por hashes sha256 calculados por archivo servido, y con `connect-src` e `img-src` limitados al propio origen una inyección de CSS no tiene manera de exfiltrar nada a terceros.
- Sin telemetría, sin analytics, sin scripts remotos. Lo mismo que en la web.
- Una sola instancia por usuario.
- **Permisos denegados por defecto.** `setPermissionRequestHandler` y `setPermissionCheckHandler` rechazan cámara, micrófono, geolocalización, notificaciones y portapapeles salvo que una función concreta lo necesite y se justifique en revisión. Con documentos personales dentro, una página comprometida pidiendo permisos es un vector real.
- **Canal de actualización con confianza explícita.** La firma del paquete no protege del secuestro del feed: la URL de actualizaciones es fija y va por HTTPS. El canal es GitHub Releases y es el único proveedor (sección 8 ter); el certificado de firma, cuando exista, se guarda en el gestor de secretos del CI, nunca en el repositorio.
- Sin firma no hay actualización silenciosa: la instalación solo ocurre cuando la persona acepta el diálogo de reinicio (sección 8 ter).

## 5. Diferencia con la PWA en el comportamiento

| Aspecto | PWA | Escritorio |
|---|---|---|
| Arranque | La landing, con la puerta de entrada al producto | **Hoy**, directo a la aplicación: la landing es de la web, donde se descarga la app. La exportación usa `trailingSlash` para que cada ruta tenga su `index.html` y el protocolo pueda servir `/hoy/` |
| Service worker | Sí, cachea el shell | **No**. El binario ya es local y el ciclo de actualización es otro |
| Aviso de almacenamiento | Sí: el navegador puede desalojar | No hace falta |
| Copia cifrada | Descarga del navegador | Diálogo nativo a una carpeta real |
| Instalación | "Instalar app" del navegador | Instalador NSIS |
| Actualizaciones | Al recargar | `electron-updater`, con aviso y reinicio |
| Asistente | Requiere conexión | Requiere conexión |

El registro del service worker se desactiva cuando la app corre en el escritorio. El mecanismo previsto es una constante del build estático (`import.meta.env.DESKTOP`), que `next build` fija para la salida de escritorio y deja vacía en la web: no depende de `process`, que es justo lo que `sandbox` elimina del renderer.

## 6. Qué hay que cambiar en el código

1. `apps/web/next.config.ts`: soportar dos salidas. Con una variable de entorno, `output: "export"`; sin ella, el build de servidor actual. El `webpack` de `extensionAlias` se mantiene en las dos, porque los paquetes del workspace siguen siendo fuentes TypeScript con especificadores `.js` y la exportación no lo cambia. Es el cambio más delicado y va primero.
2. `apps/web/src/components/shell/ServiceWorkerRegistrar.tsx`: no registrar nada en modo escritorio.
3. Un módulo de configuración con la URL base del proxy, con valor por entorno y sin secretos.
4. La copia cifrada: en escritorio usa el diálogo nativo; en web, descarga.
5. `apps/desktop`: proceso principal, preload, protocolo `app://`, actualizador, menú en español y empaquetado.

Nada de esto toca el vault, la privacidad, el radar ni el motor de contenido: el escritorio reusa esos paquetes sin cambios.

## 7. Estado y pruebas

- `pnpm check` y `pnpm e2e` siguen siendo la puerta de la web. No se relajan.
- El binario se verifica con una prueba de humo por sistema: abre, muestra la portada, crea el vault, reinicia y el vault sigue ahí, y la copia cifrada se puede exportar e importar.
- Las pruebas de Playwright siguen cubriendo el renderer, que es el mismo Chromium.
- La compilación es matriz por sistema en CI con `electron-builder`; Windows primero.

## 8. Windows ahora, macOS y Linux después

**Windows (alcance inicial)**

- Instalador NSIS, sin firma al principio.
- El comando `pnpm package:win` construye el renderer, compila el proceso principal y genera el instalador con `electron-builder`. El artefacto publicado es `release/Letra Grande-<version>-x64.exe`, por ejemplo `Letra Grande-0.1.0-x64.exe`, y su bloque de actualización acompaña como `.blockmap`. Solo se genera para Windows x64.
- El paquete lleva el renderer estático en `resources/renderer` (fuera del asar) y el proceso principal y el preload compilados dentro del asar. No lleva tests, código fuente ni el árbol de `node_modules` de desarrollo, y no lleva ninguna clave de IA.
- `electron-builder` descarga herramientas al empaquetar (el zip de Electron y NSIS, desde GitHub) y no configura firma de código si no hay certificado.
- Sin firma, Windows SmartScreen muestra "Editor desconocido" en la primera ejecución. No bloquea la instalación, pero asusta. Un certificado de firma de código lo reduce, aunque desde 2024 los certificados EV ya no dan confianza instantánea: la reputación se gana con descargas. Firmar cambiaría solo la advertencia de SmartScreen y permitiría el actualizador automático, que exige paquetes firmados; exigiría comprar y custodiar un certificado (en el gestor de secretos del CI) y no cambia nada del contenido del paquete.
- El actualizador funciona igual; su firma es la del paquete.

**macOS (cuando se decida)**

- Distribuir fuera del App Store **no requiere** licencia de Apple ni cuenta de tienda.
- Para que la app abra sin bloqueo hace falta **firmar y notarizar**, y eso **sí** exige el Apple Developer Program, 99 USD al año. Sin eso, Gatekeeper bloquea la primera ejecución y el usuario tiene que ir a Ajustes del Sistema, Privacidad y Seguridad, y pulsar "Abrir igualmente". Desde macOS 15 ya no basta el clic derecho y abrir.
- El actualizador automático en macOS exige app firmada, así que sin la licencia no hay actualizaciones silenciosas: habría que publicar cada versión y pedir descarga manual.
- Requiere una máquina macOS para compilar y firmar.

**Linux (cuando se decida)**

- AppImage o `.deb`, sin firma obligatoria.
- El actualizador automático no está soportado por el módulo `autoUpdater` de Electron en Linux. Con `electron-updater` sí funciona para AppImage; en `.deb` se actualiza por el gestor de paquetes o descargando de nuevo.

## 8 bis. Icono de la aplicación

El icono del ejecutable y del instalador es `apps/desktop/build/icon.png`, un PNG de 512 por 512 generado desde el SVG de la PWA (`apps/web/public/icon.svg`) con el navegador que ya usan las pruebas:

```
pnpm --filter @letra-grande/web exec playwright screenshot --viewport-size=512,512   "file:///<ruta-al-repo>/apps/web/public/icon.svg" apps/desktop/build/icon.png
```

Sustituye `<ruta-al-repo>` por la ruta de tu copia, con barras normales también en Windows. Se versiona el PNG y no el comando, porque el empaquetado no debe depender de tener navegadores instalados. Si cambia la identidad visual, se regenera con esa orden.

## 8 ter. Canal de actualizaciones (DESK-03b)

El descargable se actualiza con `electron-updater` contra GitHub Releases. Es la decisión D-12: un solo proveedor, sin telemetría y sin servidores de actualización de terceros. La configuración vive en `apps/desktop/electron-builder.yml` (`publish` con `provider: github`, `owner: aam9063`, `repo: Letra-Grande`, `releaseType: draft`); con ella, cada empaquetado genera `resources/app-update.yml`, el manifiesto que lee `electron-updater` en la app instalada.

**Cuándo se comprueba.** Solo en la app empaquetada: en desarrollo no hay feed que consultar. La variable de entorno `LG_UPDATES=off` desactiva la comprobación de forma explícita. La comprobación ocurre una vez al arrancar.

**Qué pregunta la app.** Dos diálogos nativos, siempre con la persona al mando:

1. Si hay versión nueva: "¿Descargar ahora?" con los botones "Descargar ahora" y "Ahora no". Solo se descarga si la respuesta es afirmativa.
2. Cuando la descarga termina: "¿Reiniciar ahora para instalarla?" con los botones "Reiniciar e instalar" y "Más tarde". `quitAndInstall` solo se llama si la respuesta es afirmativa.

Nada se instala sin consentimiento: `autoDownload` y `autoInstallOnAppQuit` están desactivados, así que ni la descarga ni la instalación son automáticas. La misma versión no se anuncia dos veces en la misma sesión, para que no haya bucles de avisos.

**Sin red.** La comprobación falla en silencio: el error queda en la consola del proceso principal y no se muestra nada. La app funciona igual sin conexión; solo el asistente la necesita, y ya avisa de ello.

**Modo diagnóstico.** Ejecutar la app con `--check-updates` (desde el instalador o desde `win-unpacked`) hace una única comprobación, imprime una línea y sale, sin abrir ventana: `actualizacion disponible: 0.0.2` o `sin actualizaciones` con código 0, y `error: <motivo>` con código 1 si la comprobación falla. Es la herramienta para probar el canal sin interfaz. El diagnóstico se ejecuta siempre que el indicador esté presente: no le afecta `LG_UPDATES=off` y funciona también en desarrollo. En desarrollo, `electron-updater` salta la comprobación fuera del paquete, así que el resultado es `sin actualizaciones`: la comprobación de verdad solo ocurre en la app empaquetada, que lleva su `app-update.yml` en `resources`.

**Ritual de publicación.** La entrega la decide una persona:

1. Subir la versión en `apps/desktop/package.json` y crear el tag `v<version>`, por ejemplo `v0.0.2`.
2. Empaquetar y publicar con el token de GitHub: `pnpm package:win` con `GH_TOKEN` en el entorno y `--publish always` en lugar de `--publish never`. El empaquetado sube al borrador de la release los tres artefactos: `Letra Grande-<version>-x64.exe`, su `.blockmap` y `latest.yml`.
3. Revisar el borrador en GitHub Releases y publicarlo. Mientras siga en borrador, la app instalada no ve la versión nueva.

Para ensayar el canal de principio a fin se publican dos versiones de prueba (por ejemplo `v0.0.1` y `v0.0.2`) y se ejecuta `--check-updates` con la primera instalada: debe imprimir `actualizacion disponible: 0.0.2`.

**Firma pendiente.** El paquete sigue sin firmar, así que Windows SmartScreen muestra "Editor desconocido" en la primera ejecución (sección 8). No bloquea la instalación ni la actualización, pero avisa. La firma de código se queda en el backlog como tarea de entrega.

## 9. Riesgos y límites

- **Tamaño del instalador**: entre 120 y 200 MB. Es el precio de llevar Chromium. Se acepta a cambio de paridad con las pruebas.
- **Superficie de seguridad mayor**: el proceso principal es código privilegiado. La lista de la sección 4 es obligatoria, no una recomendación.
- **Confianza del usuario en Windows**: sin firma, el aviso de SmartScreen cuesta instalaciones. Está en el backlog como tarea de entrega, no de código.
- **Qué descarga el empaquetado**: `electron-builder` baja el zip de Electron, NSIS y las herramientas de 7zip desde GitHub la primera vez. En una máquina sin red o con GitHub bloqueado el empaquetado falla; no hay empaquetado sin conexión.
- **Dos salidas de build**: si la exportación estática se rompe, la web sigue funcionando y el escritorio no. La CI debe construir las dos.
- **El asistente no funciona sin red**: es consecuencia de la decisión de no llevar clave en el binario.

## 10. Tareas

Las tareas están en `docs/backlog.md` con prefijo `DESK-`: preparación del build de dos salidas, aplicación de escritorio, canal de entrega de Windows y, más adelante, macOS y Linux con firma.

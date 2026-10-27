# DOCS-01b: OCR de fotos en el navegador

## Objetivo y motivo

Una foto del móvil es la forma más habitual de meter una factura o una carta en la app, y una foto no tiene capa de texto: DOCS-01a ya declara ese caso con `hasTextLayer: false` y deja el documento esperando. Esta tarea cierra ese hueco con OCR en el dispositivo, mediante `tesseract.js`, sin una sola petición a un origen ajeno. La decisión D-13 ya fijó lo que costaba: los datos de idioma se versionan en el repositorio para que el OCR funcione sin conexión desde el primer uso.

## Alcance y restricciones

- Dentro:
  - `packages/extract/src/ocr.ts`: `extractImageText(image, options)` que devuelve texto, confianza media y la señal de "no se ha leído nada", con la misma forma de pensar que `hasTextLayer` en el extractor de PDF.
  - Rutas de los activos resueltas de forma explícita y de nuestro propio origen: `workerPath`, `corePath` y `langPath` nunca se dejan con el valor por defecto, que apunta a jsDelivr.
  - Carga diferida: `tesseract.js` entra con `import()` dinámico, solo la primera vez que se sube una foto, y el worker se reutiliza entre fotos.
  - Caché de los datos de idioma tras la primera descarga (la caché de `tesseract.js` vive en IndexedDB), con un test que fija que la descarga ocurre una sola vez.
  - Activos versionados con su licencia, su origen exacto y su sha256: el worker de `tesseract.js`, los núcleos wasm que puede pedir el worker y el modelo `best` de español de `tessdata_best`.
  - Normalización y post-proceso del texto del OCR (unir líneas, quitar espacios sobrantes, marcar la confianza) para dejarlo listo para el extractor de factura de DOCS-02.
  - Tests de unidad de las partes puras, test de que los activos versionados existen y coinciden con lo que el código pide, y espía sobre `fetch` que **rechaza** si se intentara alguna petición.
  - README del paquete, fila D-13 de `docs/ARRANQUE.md` con el peso real medido y fila DOCS-01b del backlog.
- Fuera:
  - Cablear el OCR en la interfaz: subida de fotos, progreso, carpeta (carril de UI y CARPETA-01).
  - El extractor de factura (DOCS-02) y el clasificador (DOCS-03).
  - El service worker y la puerta de escritorio (DESK-02d).
  - Cualquier cambio en `apps/web`, `apps/desktop` y `packages/schema`.
- Invariantes del proyecto que aplican:
  - Privacidad: ninguna petición a un origen ajeno durante la extracción, comprobado con un espía que rechaza. Los activos se sirven desde el propio origen, bajo `/ocr/`.
  - Sin datos personales en fixtures, tests ni documentación: la imagen de prueba es sintética.
  - Licencias compatibles con MIT: `tesseract.js` y `tesseract.js-core` son Apache-2.0; los datos de idioma son Apache-2.0.
  - Nada inventado: cada activo lleva su URL de origen y su sha256; los tamaños que se documentan son los medidos.

## Superficie de edición (nuestra)

`packages/extract/**`, `pnpm-lock.yaml`, `docs/ARRANQUE.md` (solo la fila D-13), `docs/backlog.md`, `odd/tasks/docs-01b-ocr.md`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest` en entorno `node` para las partes puras, la configuración del worker y la presencia de los activos.
- RED: primero los tests contra un módulo que todavía no existe.
- La prueba de navegador con OCR real sobre una imagen sintética es deseable pero no cabe en esta tarea sin una pantalla que la dispare (carril de UI). Queda escrito qué no está probado y por qué.

## Riesgo y review (nuestra)

- Tipo: privacidad y extracción.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 2 (que la extracción no salga del dispositivo: una dependencia que por defecto baja el worker, el wasm y el modelo de un CDN) y elemento 1 (el contenido de los documentos del usuario). La revisión mira: que las tres rutas sean explícitas y de mismo origen, que la carga sea diferida, que el texto no se invente y que la confianza se comunique, que los activos declaren licencia y origen, y que el peso en el repositorio esté medido y aceptado por D-13.

## Tareas

- [x] Documento de funcionalidad antes del primer código.
- [x] Activos versionados en `packages/extract/assets/ocr/` (worker, núcleos y modelo de español) con licencia, origen y sha256.
- [x] Rutas explícitas de mismo origen (`resolveOcrAssets`); la variante de núcleo la elige el worker entre las tres versionadas.
- [x] `extractImageText` con carga diferida, caché del modelo, worker reutilizado y resultado con texto, confianza y "sin texto".
- [x] Normalización y post-proceso del texto, listo para DOCS-02.
- [x] Tests en rojo antes de implementar, y espía de `fetch` que rechaza.
- [x] README del paquete, D-13 con el peso real y backlog actualizados.
- [x] `pnpm check` y `pnpm e2e` en verde: `check` con los 39 tests del paquete y el resto del monorepo, `e2e` con 84 specs en verde.

## Evidencia y progreso

Rama `lg/docs-01b-ocr`, worktree aparte sobre `dev`.

- API en `packages/extract/src/ocr.ts`: `extractImageText(imagen, options?)` y `releaseOcrWorker()`, con `ExtractedImageText = { text, confidence, hasText }`. `hasText` es a la foto lo que `hasTextLayer` al PDF.
- Rutas en `packages/extract/src/ocr-assets.ts`: `resolveOcrAssets(basePath = "/ocr")` devuelve `workerPath`, `corePath` y `langPath`, todos de mismo origen; una base con esquema o con `//host` se rechaza con error, para que reintroducir un CDN rompa en un test y no en producción.
- Texto en `packages/extract/src/ocr-text.ts`: `normalizarTextoOcr` deja una línea por línea, un solo espacio entre palabras y ninguna línea vacía; `construirResultadoOcr` acota la confianza a 0..100 y marca `hasText`.
- Carga diferida: `import("tesseract.js")` solo en la primera foto (`cargarTesseractPorDefecto`), inyectable para los tests. El worker y su modelo se reutilizan; `releaseOcrWorker()` los suelta, que es lo que toca al bloquear el vault.
- Configuración del worker: `workerPath`, `corePath` y `langPath` explícitos, `workerBlobURL: false` (la CSP no necesita `blob:`), `gzip: false` y `cacheMethod: "write"` (el modelo se descarga una vez y queda en la caché de tesseract en IndexedDB).
- Activos versionados en `packages/extract/assets/ocr/`, con `README.md` de origen, licencia Apache-2.0, tamaño y sha256: `worker.min.js` (111 307 B), tres núcleos LSTM (relaxed SIMD, SIMD y sin SIMD: 3 905 767, 3 899 472 y 3 896 484 B) y `spa.traineddata` del modelo `best` (13 570 187 B, commit `9ddc24e`) de `tessdata_best`. Total 25 363 217 B, unos 24 MiB. Regenerables con `pnpm --filter @letra-grande/extract ocr:assets`, que verifica el sha256 de lo que descarga.
- Tests: 39 en el paquete, todos en verde. Nuevos: 10 de rutas y activos, 8 de normalización y resultado, 13 de la sesión de OCR (carga diferida sin tocar tesseract hasta la primera foto, un solo worker para tres fotos, configuración de mismo origen y caché activada, texto y confianza, "no se ha leído nada", sin peticiones de red con espía que rechaza, cambio de idioma sin mezclar modelos, arranque fallido que se reintenta, fallo de lectura con su causa, `release` y el cargador por defecto).
- Sin probar, y está documentado en el README: el reconocimiento real en un navegador sobre una imagen. Necesita la app sirviendo los activos (`apps/web/public/ocr`, carril de interfaz) y un flujo de subida que aún no existe (CARPETA-01); queda para el spec de Playwright de esa tarea.

## Siguiente paso

Review gate y PR en borrador. Después, la integración en la interfaz es de CARPETA-01: servir `packages/extract/assets/ocr` en `/ocr` y añadir el spec de Playwright con una imagen sintética y los activos reales.

## Cambios de alcance aceptados

1. D-13 acepta el peso en el repositorio y en cada clon: los datos de idioma del modelo `best` de español se versionan, se descargan una sola vez del propio origen bajo demanda al subir la primera foto y quedan en caché. Los tamaños reales se anotan en D-13 y en el README.

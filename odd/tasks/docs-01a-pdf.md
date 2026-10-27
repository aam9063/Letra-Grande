# DOCS-01a: extracción de texto de PDF en local

## Objetivo y motivo

La carpeta necesita leer lo que el usuario sube, en el dispositivo y sin red. Esta tarea crea `packages/extract` con la lectura de texto de PDF mediante `pdfjs-dist` y deja fuera, a propósito, el OCR de fotos: los datos de idioma del OCR pesan unos 15 MB y decidir si viajan en el repositorio o se descargan una vez es una decisión de la persona responsable del proyecto.

## Alcance y restricciones

- Dentro: el paquete `packages/extract` con `extractPdfText`, la lectura por páginas, el manejo de PDF sin capa de texto (devuelve texto vacío y lo declara, para que el OCR pueda ocuparse después), los tests con un PDF sintético versionado y la documentación del paquete.
- Fuera: OCR (`DOCS-01b`), extractores de factura (`DOCS-02`), clasificador (`DOCS-03`), las pantallas de subida y la carpeta (carril de interfaz).
- Invariantes del proyecto que aplican: **ninguna petición de red durante la extracción**, comprobado con un espía sobre `fetch`; nada de datos personales en fixtures; sin dependencias que no sean necesarias y con licencia compatible (pdfjs-dist es Apache-2.0).

## Superficie de edición (nuestra)

`packages/extract/**`, `pnpm-lock.yaml`, `docs/backlog.md`, `odd/tasks/docs-01a-pdf.md`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest` en entorno `node`.
- RED: primero los tests contra un PDF sintético, viendo fallar el paquete inexistente.

## Riesgo y review (nuestra)

- Tipo: privacidad y extracción.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 1 (documentos del usuario) y elemento 2 (que la extracción no salga del dispositivo). La revisión mira: que no haya red ni escritura en disco, que el worker qued explicado para el navegador, que un PDF corrupto o cifrado falle con un error claro y no cuelgue, y que la licencia y el peso de la dependencia estén justificados.

## Tareas

- [x] Paquete `packages/extract` con su `package.json`, `tsconfig.json` y `vitest`.
- [x] `extractPdfText(bytes, options)`: texto por página, total de páginas y bandera de "sin capa de texto".
- [x] PDF sintético versionado como fixture, generado a mano sin dependencias.
- [x] Tests: texto conocido, PDF sin texto, PDF corrupto, y espía de `fetch` en cero.
- [x] Documentar en el paquete cómo se sirve el worker en el navegador.
- [x] `pnpm check` en verde.

## Evidencia y progreso

Implementado en la rama `lg/docs-01a-pdf`.

- API: `extractPdfText(data: ArrayBuffer | Uint8Array, options?: { maxPages?: number }): Promise<ExtractedText>`, con `ExtractedText = { pages: string[]; text: string; pageCount: number; hasTextLayer: boolean }`. `pageCount` es el total del documento aunque `maxPages` recorte la lectura.
- Configuración de pdf.js sin red: `getDocument({ data, useWorkerFetch: false, disableFontFace: true, useSystemFonts: false })`, sin `cMapUrl` ni `standardFontDataUrl`. Nota: `isEvalSupported: false` ya no existe en pdfjs-dist v6.4.299, la opción se retiró de la API, así que no se pasa. El test del espía sobre `fetch` garantiza cero peticiones igualmente.
- En Node se usa el build `pdfjs-dist/legacy/build/pdf.mjs`, que funciona sin worker dedicado; el README explica cómo debe servir la app el worker autoalojado en el navegador.
- Fixtures generadas por `scripts/make-fixtures.mjs` (PDF montado a mano, flujos sin comprimir, sin dependencias): `fixtures/factura-sintetica.pdf` (3 páginas, empresa, persona e importes ficticios), `fixtures/escaneado-sintetico.pdf` (1 página sin capa de texto) y `fixtures/grueso-sintetico.pdf` (60 páginas, para el límite por defecto).
- Tests (8, todos en verde): texto conocido por página, `hasTextLayer: false` con texto vacío, buffer corrupto con error claro en español, espía de `fetch` en cero en ambas fixtures y con la implementación sustituida por un rechazo (cerrojo, no solo contador), truncado por `maxPages`, límite por defecto con el documento de 60 páginas, buffer del llamador sin mutar (Uint8Array y ArrayBuffer) y validación de `maxPages` no válido.
- Tras el review gate (aprobado con cambios, una ronda): el espía de `fetch` rechaza si se llamara, los errores conservan el original como `cause`, la promesa sobre PDF cifrados se suaviza en el README y queda `REF-DOCS-01a` en el backlog, y se documenta que `hasTextLayer` solo mira las páginas leídas y que el texto se pega sin separador salvo fin de línea.
- Dependencia justificada: `pdfjs-dist` (Apache-2.0, compatible con MIT) es la única dependencia en tiempo de ejecución; es la librería de referencia para PDF en navegador, con mantenimiento activo, y funciona sin red con la configuración anterior. DevDependencies: `typescript`, `vitest`, `@types/node`.

Ronda de correcciones aplicada: el espía de red rechaza en vez de solo contar, `hasTextLayer` documenta su límite con `maxPages`, los errores conservan la causa, la concatenación de fragmentos queda explicada y dos tests nuevos fijan el buffer intacto y el tope de páginas. El fixture cifrado queda como `REF-DOCS-01a` porque fabricar un PDF cifrado a mano es desproporcionado, y el README ya no promete lo que no está probado. Informe en `odd/reviews/docs-01a.md`.

## Siguiente paso

Desbloquea DOCS-02 (extractor de factura de luz) y, cuando se decida el OCR, DOCS-01b.

## Cambios de alcance aceptados

1. La tarea original DOCS-01 incluía OCR. Se separa porque los datos de idioma pesan unos 15 MB y su distribución en el repositorio es una decisión pendiente.

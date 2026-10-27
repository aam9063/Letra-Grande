# @letra-grande/extract

Lectura de texto de PDF en el dispositivo. Extrae el texto página a página con `pdfjs-dist` y declara cuando el PDF no tiene capa de texto (un escaneo, por ejemplo), para que el OCR de `DOCS-01b` pueda ocuparse después.

## API

```ts
function extractPdfText(
  data: ArrayBuffer | Uint8Array,
  options?: { maxPages?: number },
): Promise<ExtractedText>

interface ExtractedText {
  pages: string[];       // texto de cada página leída, en orden
  text: string;          // páginas unidas con doble salto de línea
  pageCount: number;     // total de páginas del documento, aunque se lean menos
  hasTextLayer: boolean; // falso cuando el texto unido, sin espacios, queda vacío
}
```

`maxPages` limita las páginas leídas y por defecto es 50, para acotar documentos patológicos. `pageCount` sigue siendo el total del documento, así quien llama puede avisar de que faltan páginas.

Ojo con `hasTextLayer`: solo mira las páginas que permite `maxPages`. Con un límite bajo, un documento escaneado cuya capa de texto empieza más tarde se declara `false`; antes de decidir pasar el documento al OCR, mira también `pageCount`.

El texto se junta tal cual: los fragmentos que reporta pdf.js se pegan sin separador, salvo donde pdf.js marca fin de línea. Así, algunos documentos pierden límites de palabra (dos palabras pegadas o un salto donde había espacio). Es deliberado: el OCR y los extractores no deben suponer un espaciado perfecto.

## Garantía de sin red

Durante la extracción no hay ninguna petición de red y no se lee del sistema de archivos: la función solo consume los bytes que le pasan. Lo comprueba un test con un espía sobre `globalThis.fetch` que debe seguir en cero. La configuración de pdf.js que lo hace posible:

- Sin `cMapUrl` y sin `standardFontDataUrl`: pdf.js no tiene de dónde descargar CMaps ni fuentes estándar, así que no lo intenta.
- `useWorkerFetch: false`: el worker no usa `fetch` para recursos auxiliares.
- `disableFontFace: true` y `useSystemFonts: false`: no se tocan fuentes del sistema ni del navegador, solo se lee texto.
- Nota: `isEvalSupported: false` ya no existe en pdfjs-dist v6, la opción se retiró de la API, así que no hace falta pasarla.

Si el buffer está corrupto o vacío, la función rechaza con un mensaje claro en español en vez de colgarse: lo verifica una fixture. Los documentos cifrados se mapean a su propio mensaje (por `PasswordException`), pero aún no hay fixture cifrada que cubra ese camino: queda registrado como `REF-DOCS-01a` en el backlog.

## El worker en el navegador

En Node, el build `pdfjs-dist/legacy/build/pdf.mjs` funciona sin worker dedicado. En el navegador, la app debe servir el worker autoalojado: copiar `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` a los recursos propios de la app (nunca desde un CDN) y asignar su ruta antes de extraer:

```ts
import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
GlobalWorkerOptions.workerSrc = "/pdf/pdf.worker.min.mjs";
```

Copiar el fichero es trabajo de la tarea de interfaz que integre la extracción, no de este paquete.

## Fixtures sintéticas

`fixtures/` contiene dos PDF generados por `scripts/make-fixtures.mjs` (`pnpm fixtures` desde este paquete). El generador existe para que las fixtures sean reproducibles y auditables: monta el PDF a mano, sin dependencias, con flujos de texto sin comprimir, y todo su contenido es inventado (empresa, persona e importes ficticios). Nunca debe contener datos reales. Regenera:

- `factura-sintetica.pdf`: 3 páginas con texto conocido, para probar el texto, el recorte de `maxPages` y el recuento.
- `escaneado-sintetico.pdf`: 1 página sin capa de texto, para probar `hasTextLayer: false`.
- `grueso-sintetico.pdf`: 60 páginas, para probar el límite por defecto de 50.

## Fuera de alcance: OCR (DOCS-01b)

El OCR de fotos se deja fuera a propósito: los datos de idioma pesan unos 15 MB y decidir si viajan en el repositorio o se descargan una vez es una decisión pendiente de la persona responsable del proyecto. Cuando se decida, el OCR puede apoyarse en la señal `hasTextLayer: false` de este paquete.

## Dependencia

`pdfjs-dist` (Apache-2.0) es la única dependencia en tiempo de ejecución. La licencia es compatible con MIT del proyecto. Es la librería de referencia para leer PDF en el navegador, se mantiene activamente y funciona sin red si se configura como arriba.

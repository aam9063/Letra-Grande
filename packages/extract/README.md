# @letra-grande/extract

Lectura de documentos en el dispositivo. Extrae el texto de un PDF página a página con `pdfjs-dist` y declara cuando el PDF no tiene capa de texto (un escaneo, por ejemplo); una foto de ese mismo documento la lee el OCR con `tesseract.js`, sin salir del dispositivo y sin pedirle nada a un tercero.

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

## OCR de fotos (DOCS-01b)

Una foto de una factura no tiene capa de texto: `extractPdfText` la declara con `hasTextLayer: false` y la lee `extractImageText`.

```ts
function extractImageText(
  image: Blob | string | HTMLCanvasElement | HTMLImageElement | ImageBitmap,
  options?: { basePath?: string; lang?: string },
): Promise<ExtractedImageText>

function releaseOcrWorker(): Promise<void>

interface ExtractedImageText {
  text: string;       // texto limpio: una línea por línea, sin líneas vacías
  confidence: number; // confianza media del OCR, de 0 a 100
  hasText: boolean;   // falso cuando no se ha leído nada
}
```

`hasText` es a la foto lo que `hasTextLayer` al PDF: la señal de que hay que avisar en vez de seguir. `text` queda con un solo espacio entre palabras y sin líneas vacías, porque el OCR no conserva columnas; el extractor de factura de DOCS-02 no debe suponer maquetación.

### Sin red ajena, y sin cargar nada hasta la primera foto

`tesseract.js` entra con un `import()` dinámico: ni el paquete ni los activos cuestan algo hasta que alguien sube una foto. En esa primera llamada se descarga el modelo de español del **propio origen** (unos 13,5 MB), se queda en la caché de `tesseract.js` (IndexedDB) y el worker se reutiliza, así que la segunda foto no vuelve a descargar ni a arrancar nada. `releaseOcrWorker()` suelta el worker y su modelo; es lo que hay que llamar al bloquear el vault.

Las tres rutas se pasan explícitas, porque los valores por defecto de `tesseract.js` apuntan a jsDelivr:

- `workerPath`, `corePath` y `langPath` salen de `resolveOcrAssets(basePath)`, con `/ocr` por defecto. Una base con origen (`https://...` o `//host/...`) se rechaza con un error: reintroducir un CDN tiene que romper en un test, no en producción.
- `workerBlobURL: false`: el worker se carga de una ruta propia y la CSP no necesita `blob:`.
- `cacheMethod: "write"` y `gzip: false`: el modelo se sirve sin comprimir y se guarda en la caché tras la primera descarga.

Los activos versionados y su licencia están en `assets/ocr/` (ver su `README.md`): el worker, los tres núcleos wasm LSTM y el modelo `best` de español. D-13 aceptó el peso en el repositorio. La app tiene que servir esa carpeta en `/ocr`; en `apps/web` eso es copiarla a `apps/web/public/ocr`, y es trabajo de la tarea que integre el OCR en la interfaz, igual que el worker de pdf.js.

### Qué está probado y qué no

Probado con `vitest`, sin ejecutar OCR real: la resolución de rutas y el rechazo de bases con origen, la carga diferida (no se importa `tesseract.js` hasta la primera foto), la reutilización del worker y de su modelo entre fotos, las tres rutas de mismo origen y la caché activada, la normalización del texto, la confianza acotada, el caso de "no se ha leído nada", el cambio de idioma o de base sin mezclar modelos, el arranque fallido que se reintenta y el espía sobre `fetch` que rechaza y comprueba que nadie pide red. También se comprueba, contra `assets/ocr/manifest.json`, que los activos versionados están, pesan lo que dice el manifiesto y su sha256 coincide; y que lo que pide el código es lo que el manifiesto versiona.

Sin probar, y por qué: el reconocimiento real sobre una imagen en un navegador. Eso necesita que la app sirva los activos y un flujo de subida que hoy no existe (carril de interfaz, CARPETA-01), y una prueba de OCR de verdad tarda y depende del motor. Queda para el spec de Playwright de esa tarea, con una imagen sintética y los activos reales, y ese spec tiene que fallar ante cualquier petición a un origen ajeno (interceptando la red y comparando el origen), no solo comprobar que el texto sale. Es lo único que puede cazar una opción de `tesseract.js` que cambie de nombre y caiga en su CDN por defecto.

## Factura de la luz (DOCS-02)

`extractInvoiceFields(texto)` lee los datos de una factura de la luz a partir del texto que ya está en el dispositivo.

```ts
function extractInvoiceFields(texto: string): FacturaLuz

interface FacturaLuz {
  comercializadora: string | null;
  cups: string | null;                                     // mayúsculas, sin espacios ni guiones
  periodo: { desde: string; hasta: string } | null;        // AAAA-MM-DD
  tarifa: string | null;                                   // 2.0TD, 3.0TD...
  potencia: { periodo: string; kw: number }[];             // vacío si no se ha leído
  consumo: { periodo: string; kwh: number }[];             // vacío si no se ha leído
  importeTotalEur: number | null;                          // euros, como número
  noLeidos: CampoFactura[];                                // lo que no se ha podido leer
}
```

`camposParaVault(factura)` aplana el resultado a los tipos primitivos que admite `VaultDocument.fields` del esquema (`comercializadora`, `cups`, `periodoDesde`, `periodoHasta`, `tarifa`, `potenciaP1Kw`, `consumoP1Kwh`, `importeTotalEur` y `camposNoLeidos` con los nombres separados por comas).

### La regla: no se inventa nada

Un campo que no aparece en el texto, o que aparece imposible (un 31 de febrero, un importe que no es un número, un CUPS que no tiene el formato `ES` más 16 dígitos y dos letras), queda a `null` y se declara en `noLeidos`. De estos campos salen avisos y comparaciones, así que un hueco visible es mejor que un dato falso. Un campo con valor nunca aparece en `noLeidos`, y la lista se calcula, no se rellena a mano.

Los valores se normalizan: importes con coma o punto decimal y separador de miles (`1.234,56`, `1234.56`, `€ 62,35`) a número de euros; fechas `DD/MM/AAAA` o `AAAA-MM-DD` a `AAAA-MM-DD`; consumos a kWh y potencias a kW.

Es lógica pura: sin red (lo comprueba un espía sobre `fetch` que rechaza), sin ficheros y determinista.

### Corpus sintético y precisión

`fixtures/facturas/` tiene 20 facturas de texto con su verdad esperada en `verdad.json`, generadas por `scripts/make-invoice-fixtures.mjs` (`pnpm --filter @letra-grande/extract facturas`). Todo es ficticio: comercializadoras, NIF, titulares, direcciones, CUPS e importes. Las variantes son las que de verdad cambian entre compañías: cinco plantillas de etiquetas y formato de fecha e importe, peajes 2.0TD con tres periodos de consumo y dos de potencia y 3.0TD con seis y tres, y tres facturas a las que les falta a propósito un campo (CUPS, tarifa o detalle de potencia).

`test/invoice-precision.test.ts` mide campo a campo contra esa verdad y falla por debajo del 90 % (hoy acierta 140 de 140), comprueba que no se inventa ningún valor donde la factura no lo trae y que `noLeidos` coincide exactamente con lo que falta. **El corpus es una línea base de regresión, no una prueba de precisión sobre facturas reales**: las reglas son genéricas (sinónimos de etiqueta, formatos de número y fecha), pero una comercializadora con maquetación distinta puede fallar. Cuando aparezca una factura real que no se lea, se añade una variante al generador (nunca la factura real) y se ajusta la regla.

### Límites conocidos

- La etiqueta y el valor tienen que ir en la misma línea. Un OCR que parta "Importe total:" y la cifra en dos líneas deja el campo sin leer, que es lo honesto, pero se pierde.
- Solo facturas de luz en español, con las etiquetas del corpus y sus sinónimos.
- No se leen desgloses de impuestos, lecturas del contador ni datos del titular: no hacen falta para entender la factura y son datos personales.

## Dependencias

- `pdfjs-dist` (Apache-2.0), para leer PDF. Es la librería de referencia para PDF en el navegador, con mantenimiento activo y funciona sin red con la configuración de arriba.
- `tesseract.js` 7 (Apache-2.0), para leer fotos. Se carga de forma diferida y todos sus activos se sirven desde nuestro origen.

Las dos licencias son compatibles con la MIT del proyecto. El detalle de los activos del OCR, con origen, tamaño y sha256, está en `assets/ocr/README.md`.

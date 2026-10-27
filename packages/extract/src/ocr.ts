/**
 * OCR de fotos en el dispositivo.
 *
 * Una foto de una factura o de una carta no tiene capa de texto, así que
 * DOCS-01a la declara `hasTextLayer: false` y aquí se lee con `tesseract.js`.
 * Todo ocurre en el dispositivo: el worker, el núcleo wasm y el modelo de
 * idioma se sirven desde nuestro propio origen (ver `ocr-assets.ts`) y el
 * resultado no sale de aquí.
 *
 * `tesseract.js` entra con un `import()` dinámico: el paquete y sus 25 MB de
 * activos no cuestan nada hasta que alguien sube la primera foto. El modelo
 * de idioma se queda en la caché de `tesseract.js` (IndexedDB) y el worker se
 * reutiliza, así que la segunda foto no vuelve a descargar ni a arrancar nada.
 */
import {
  LANG_POR_DEFECTO,
  OCR_BASE_PATH,
  resolveOcrAssets,
  type OcrAssets,
} from "./ocr-assets";
import { construirResultadoOcr, type ExtractedImageText } from "./ocr-text";

/** Imagen que se puede pasar al OCR: lo que da un `<input type="file">` o un canvas. */
export type ImagenOcr = Blob | string | HTMLCanvasElement | HTMLImageElement | ImageBitmap;

/** Worker del OCR, con lo único que se usa de él. */
export interface OcrWorkerLike {
  recognize(imagen: ImagenOcr): Promise<{ data: { text: string; confidence: number } }>;
  terminate(): Promise<unknown>;
}

/** Módulo de `tesseract.js`, reducido a lo que este paquete necesita. */
export interface TesseractLike {
  createWorker(
    langs: string,
    oem: number | undefined,
    opciones: Record<string, string | number | boolean>,
  ): Promise<OcrWorkerLike>;
}

/** Cargador del módulo de `tesseract.js`. Se inyecta en los tests. */
export type CargarTesseract = () => Promise<TesseractLike>;

/** Opciones de extracción de una foto. */
export interface ExtractImageOptions {
  /** Ruta donde la app sirve los activos del OCR. Por defecto `/ocr`. */
  basePath?: string;
  /** Idioma del modelo. Por defecto `spa`, el único que se versiona hoy. */
  lang?: string;
}

/** Sesión de OCR: un worker, su modelo y el texto que va leyendo. */
export interface OcrSession {
  /** Lee el texto de una foto. */
  extract(imagen: ImagenOcr, options?: ExtractImageOptions): Promise<ExtractedImageText>;
  /** Suelta el worker y su modelo; la siguiente foto arranca de cero. */
  release(): Promise<void>;
}

/**
 * Carga `tesseract.js` de verdad. Es dinámico a propósito: hasta que no hay
 * una foto, el paquete no entra en el bundle que se ejecuta.
 */
export const cargarTesseractPorDefecto: CargarTesseract = async () => {
  const modulo = (await import("tesseract.js")) as unknown as { default?: TesseractLike };
  return modulo.default ?? (modulo as unknown as TesseractLike);
};

/**
 * Crea una sesión de OCR con su propio worker y su propia caché en memoria.
 *
 * La sesión no arranca nada hasta la primera foto. Si se pide un idioma o una
 * base distintos, suelta el worker anterior y arranca uno nuevo: mezclar dos
 * modelos en el mismo worker daría texto en el idioma equivocado sin avisar.
 *
 * @param cargar Cargador de `tesseract.js`; los tests le pasan uno falso.
 * @returns Sesión con `extract` y `release`.
 */
export function crearSesionOcr(cargar: CargarTesseract = cargarTesseractPorDefecto): OcrSession {
  let claveActual: string | null = null;
  let workerEnCurso: Promise<OcrWorkerLike> | null = null;

  async function cerrar(): Promise<void> {
    const promesa = workerEnCurso;
    workerEnCurso = null;
    claveActual = null;
    if (promesa === null) return;
    try {
      const worker = await promesa;
      await worker.terminate();
    } catch {
      // El worker no llegó a existir o ya estaba cerrado: no hay nada que soltar.
    }
  }

  async function obtenerWorker(lang: string, basePath: string): Promise<OcrWorkerLike> {
    const activos: OcrAssets = resolveOcrAssets(basePath);
    const clave = `${lang}|${activos.workerPath}`;
    if (workerEnCurso !== null && claveActual === clave) return workerEnCurso;
    if (workerEnCurso !== null) await cerrar();

    claveActual = clave;
    const promesa = (async () => {
      const { createWorker } = await cargar();
      return createWorker(lang, undefined, {
        workerPath: activos.workerPath,
        corePath: activos.corePath,
        langPath: activos.langPath,
        // Sin blob: el worker se carga de una ruta propia y la CSP no necesita blob:.
        workerBlobURL: false,
        // El modelo se sirve sin comprimir; se dice explícito para no depender del valor por defecto.
        gzip: false,
        // Descarga una vez y guarda en IndexedDB; las siguientes fotos leen de ahí.
        cacheMethod: "write",
      });
    })();
    workerEnCurso = promesa;

    try {
      return await promesa;
    } catch (error) {
      // Un arranque fallido no se queda cacheado: la siguiente foto reintenta.
      await cerrar();
      throw new Error(
        "No se ha podido cargar el OCR de la imagen. Vuelve a intentarlo; si sigue fallando, recarga la página.",
        { cause: error },
      );
    }
  }

  return {
    async extract(imagen, options = {}) {
      const worker = await obtenerWorker(
        options.lang ?? LANG_POR_DEFECTO,
        options.basePath ?? OCR_BASE_PATH,
      );
      let datos: { text: string; confidence: number };
      try {
        ({ data: datos } = await worker.recognize(imagen));
      } catch (error) {
        throw new Error("No se ha podido leer el texto de la imagen.", { cause: error });
      }
      return construirResultadoOcr(datos.text, datos.confidence);
    },
    release: cerrar,
  };
}

/** Sesión de la app: una sola, con su worker y su modelo compartidos. */
const sesionPorDefecto = crearSesionOcr();

/**
 * Lee el texto de una foto de un documento, en el dispositivo y sin red ajena.
 *
 * La primera llamada carga `tesseract.js` y descarga el modelo de español del
 * propio origen (una sola vez: después lo lee de la caché). Las siguientes
 * reutilizan el worker.
 *
 * @param imagen Foto o recorte que entrega la interfaz.
 * @param options Base de los activos e idioma; por defecto `/ocr` y `spa`.
 * @returns Texto limpio, confianza media y si se ha leído algo.
 */
export async function extractImageText(
  imagen: ImagenOcr,
  options: ExtractImageOptions = {},
): Promise<ExtractedImageText> {
  return sesionPorDefecto.extract(imagen, options);
}

/** Suelta el worker y el modelo del OCR. Útil al bloquear el vault. */
export async function releaseOcrWorker(): Promise<void> {
  await sesionPorDefecto.release();
}

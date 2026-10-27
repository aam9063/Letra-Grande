/**
 * Extracción de texto de PDF en el dispositivo, sin red.
 *
 * La extracción ocurre donde ya está el documento: nada sale del
 * dispositivo y ninguna configuración apunta a un CDN. La función no lee
 * del sistema de archivos: solo consume los bytes que le pasa quien llama.
 *
 * Se usa el build legacy de pdfjs-dist porque funciona en Node y en
 * navegador sin worker dedicado; en la app el worker se sirve autoalojado
 * (ver README.md).
 */
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/** Límite por defecto de páginas leídas, para evitar documentos patológicos. */
const MAX_PAGES_DEFECTO = 50;

/** Texto extraído de un PDF, página a página y unido. */
export interface ExtractedText {
  /** Texto de cada página leída, en orden. */
  pages: string[];
  /** Texto completo, páginas unidas con doble salto de línea. */
  text: string;
  /** Número total de páginas del documento, aunque se hayan leído menos. */
  pageCount: number;
  /** Falso cuando el PDF no tiene capa de texto (un escaneo, por ejemplo). */
  hasTextLayer: boolean;
}

/** Opciones de extracción. */
export interface ExtractPdfOptions {
  /** Máximo de páginas a leer. Por defecto 50. */
  maxPages?: number;
}

/** Convierte cualquier fallo de pdf.js en un mensaje claro en español. */
function mensajeDeError(error: unknown): Error {
  const nombre = error instanceof Error ? error.name : "";
  if (nombre === "PasswordException") {
    return new Error("El PDF está protegido con contraseña y no se puede leer sin ella.", {
      cause: error,
    });
  }
  return new Error(
    "No se ha podido leer el PDF: el archivo parece corrupto o no es un PDF válido.",
    { cause: error },
  );
}

/**
 * Extrae el texto de un PDF sin salir del dispositivo.
 *
 * Ojo: `hasTextLayer` solo mira las páginas que permite `maxPages`. Con un
 * límite bajo, un documento escaneado cuya capa de texto empieza más tarde
 * se declara sin texto; quien llama debe mirar también `pageCount` antes
 * de decidir pasar el documento al OCR.
 *
 * @param data Bytes del PDF, tal como llegan de la subida del usuario.
 * @param options Límites de lectura; `maxPages` acota documentos grandes.
 * @returns Texto por página, texto unido, total de páginas y si hay capa de texto.
 */
export async function extractPdfText(
  data: ArrayBuffer | Uint8Array,
  options: ExtractPdfOptions = {},
): Promise<ExtractedText> {
  const maxPages = options.maxPages ?? MAX_PAGES_DEFECTO;
  if (!Number.isInteger(maxPages) || maxPages < 1) {
    throw new Error("maxPages debe ser un entero mayor que cero.");
  }

  // pdf.js puede transferir el buffer a su worker: copiamos para no tocar
  // los datos de quien llama.
  const bytes =
    data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(data.slice(0));

  // Sin cMapUrl ni standardFontDataUrl: pdf.js no descarga nada, usa lo que
  // ya trae el documento o renuncia a esos recursos. La opción
  // isEvalSupported ya no existe en pdfjs-dist v6: se retiró de la API.
  const loadingTask = getDocument({
    data: bytes,
    useWorkerFetch: false,
    disableFontFace: true,
    useSystemFonts: false,
  });
  let doc;
  try {
    doc = await loadingTask.promise;
  } catch (error) {
    await loadingTask.destroy();
    throw mensajeDeError(error);
  }

  try {
    const total = doc.numPages;
    const limite = Math.min(maxPages, total);
    const pages: string[] = [];
    for (let numero = 1; numero <= limite; numero++) {
      const page = await doc.getPage(numero);
      try {
        const contenido = await page.getTextContent();
        let texto = "";
        for (const item of contenido.items) {
          if ("str" in item) {
            texto += item.str;
            if (item.hasEOL) {
              texto += "\n";
            }
          }
        }
        pages.push(texto);
      } finally {
        page.cleanup();
      }
    }
    const text = pages.join("\n\n");
    const hasTextLayer = text.trim().length > 0;
    return { pages, text, pageCount: total, hasTextLayer };
  } catch (error) {
    throw mensajeDeError(error);
  } finally {
    await loadingTask.destroy();
  }
}

// OCR de fotos (DOCS-01b): todo se sirve desde nuestro propio origen.
export {
  LANG_POR_DEFECTO,
  OCR_ASSETS,
  OCR_ASSET_DIR,
  OCR_BASE_PATH,
  resolveOcrAssets,
  type OcrAssets,
} from "./ocr-assets";
export { construirResultadoOcr, normalizarTextoOcr, type ExtractedImageText } from "./ocr-text";
export {
  extractImageText,
  releaseOcrWorker,
  type ExtractImageOptions,
  type ImagenOcr,
} from "./ocr";

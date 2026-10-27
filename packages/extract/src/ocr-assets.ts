/**
 * Rutas de los activos del OCR.
 *
 * `tesseract.js` trae, por defecto, `workerPath`, `corePath` y `langPath`
 * apuntando a jsDelivr. En Letra Grande ninguna de las tres se deja por
 * defecto: el worker, el núcleo wasm y el modelo de idioma se sirven desde
 * nuestro propio origen, así que la extracción no habla con nadie. D-13
 * aceptó el precio: el modelo viaja en el repositorio.
 */

/** Carpeta del paquete donde viven los activos versionados. */
export const OCR_ASSET_DIR = "assets/ocr";

/** Base con la que la app sirve los activos desde su propio origen. */
export const OCR_BASE_PATH = "/ocr";

/** Idioma por defecto: español, el único modelo que viaja hoy en el repositorio. */
export const LANG_POR_DEFECTO = "spa";

/**
 * Ficheros que el paquete versiona y que la app tiene que servir en `OCR_BASE_PATH`.
 *
 * Los núcleos son las tres variantes LSTM que el worker elige según lo que
 * soporte el dispositivo (relaxed SIMD, SIMD o ninguna): sin las tres, un
 * navegador moderno acabaría pidiendo el núcleo a un CDN.
 */
export const OCR_ASSETS = {
  worker: "worker.min.js",
  cores: [
    "tesseract-core-relaxedsimd-lstm.wasm.js",
    "tesseract-core-simd-lstm.wasm.js",
    "tesseract-core-lstm.wasm.js",
  ],
  languageData: (lang: string) => `${lang}.traineddata`,
} as const;

/** Rutas con las que se configura el worker del OCR. */
export interface OcrAssets {
  /** Script del worker, en nuestro origen. */
  workerPath: string;
  /** Carpeta del núcleo wasm; el worker elige dentro el fichero que soporta. */
  corePath: string;
  /** Carpeta del modelo de idioma. */
  langPath: string;
}

/**
 * Resuelve las rutas de los activos a partir de la base con la que se sirven.
 *
 * Solo acepta una ruta del propio sitio, nunca una URL con origen: una base
 * con origen devolvería el OCR a un CDN sin que nadie lo notara hasta el
 * primer test de red.
 *
 * @param basePath Ruta donde la app sirve `assets/ocr`, por defecto `/ocr`.
 * @returns Rutas del worker, del núcleo y del modelo.
 */
export function resolveOcrAssets(basePath: string = OCR_BASE_PATH): OcrAssets {
  const limpia = basePath.trim();
  // Un esquema (https:) o una URL sin esquema (//host) traerían un origen ajeno.
  if (/^[a-z][a-z0-9+.-]*:/i.test(limpia) || /^\/\/[^/]/.test(limpia)) {
    throw new Error(
      "Los activos del OCR se sirven desde nuestro propio origen: usa una ruta del sitio, no una URL.",
    );
  }

  const segmentos = limpia.split("/").filter((segmento) => segmento !== "" && segmento !== ".");
  const base = `/${segmentos.join("/")}`;
  if (base === "/") {
    throw new Error(
      `La base de los activos del OCR no puede estar vacía: indica dónde se sirven (por defecto ${OCR_BASE_PATH}).`,
    );
  }

  return {
    workerPath: `${base}/${OCR_ASSETS.worker}`,
    // Las dos carpetas llevan barra final: el worker concatena el nombre del
    // fichero que elige y sin ella construiría una ruta rota.
    corePath: `${base}/`,
    langPath: `${base}/`,
  };
}

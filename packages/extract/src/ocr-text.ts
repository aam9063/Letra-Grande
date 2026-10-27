/**
 * Texto del OCR: normalización y resultado.
 *
 * El OCR no devuelve maquetación fiable: deja espacios de más, líneas vacías
 * entre bloques y saltos de línea que no son del documento. Se limpia una vez
 * aquí, para que quien lea el texto después (DOCS-02) trabaje sobre algo
 * predecible y no reimplemente la limpieza.
 */

/** Texto leído de una foto, con la confianza que declara el OCR. */
export interface ExtractedImageText {
  /** Texto limpio: una línea por línea, sin líneas vacías. */
  text: string;
  /** Confianza media del OCR de 0 a 100, redondeada. */
  confidence: number;
  /** Falso cuando no se ha podido leer nada, igual que `hasTextLayer` en el PDF. */
  hasText: boolean;
}

/**
 * Limpia el texto que devuelve el OCR.
 *
 * Deja una línea por línea con un solo espacio entre palabras y sin líneas
 * vacías: el OCR no conserva columnas ni sangrías, así que fingirlas solo
 * engañaría a quien lea el texto después.
 *
 * @param texto Texto crudo del reconocimiento.
 * @returns Texto normalizado; cadena vacía si no había nada legible.
 */
export function normalizarTextoOcr(texto: string): string {
  return texto
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((linea) => linea.replace(/\s+/g, " ").trim())
    .filter((linea) => linea !== "")
    .join("\n");
}

/**
 * Construye el resultado del OCR a partir del texto crudo y su confianza.
 *
 * @param texto Texto crudo del reconocimiento.
 * @param confianza Confianza media declarada por el OCR, de 0 a 100.
 * @returns Texto normalizado, confianza acotada y marca de si hay texto.
 */
export function construirResultadoOcr(texto: string, confianza: number): ExtractedImageText {
  const limpio = normalizarTextoOcr(texto);
  const acotada = Number.isFinite(confianza) ? Math.min(100, Math.max(0, Math.round(confianza))) : 0;
  return { text: limpio, confidence: acotada, hasText: limpio !== "" };
}

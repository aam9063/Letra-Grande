/**
 * Normalización compartida de texto (REF-QA-08-04): una sola definición para
 * las comparaciones insensibles a tildes del paquete de IA (guardarraíles de
 * tono y caducidad, y tokenizador del índice BM25).
 *
 * Descompone en NFD, quita el rango de diacríticos combinantes y pasa a
 * minúsculas. Así "reclamación", "Reclamacion" y "RECLAMACIÓN" comparan igual
 * de forma determinista, sin depender del locale.
 */

/** Quita tildes y diacríticos (NFD) y pasa a minúsculas. */
export function normalizarSinTildes(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

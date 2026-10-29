// Tokenizador español determinista para el índice BM25 (AI-03a).
// Sin dependencias y sin colación dependiente del locale: solo operaciones
// sobre unidades de código ASCII tras quitar tildes y diacríticos con la
// normalización compartida del paquete (src/normalizar.ts, REF-QA-08-04).
import { normalizarSinTildes } from "../normalizar.js";

/**
 * Lista corta de palabras vacías del español. Solo se incluyen las más
 * frecuentes y sin valor discriminante para consultas de facturas, contratos
 * y trámites; no pretende ser exhaustiva.
 */
export const SPANISH_STOPWORDS: readonly string[] = [
  "a", "al", "algo", "algun", "alguna", "algunas", "algunos", "ante", "antes", "aqui",
  "asi", "bien", "como", "con", "contra", "cual", "cuando", "de", "del", "desde",
  "donde", "el", "ella", "ellas", "ellos", "en", "entre", "era", "eran", "eres",
  "es", "esa", "esas", "ese", "eso", "esos", "esta", "estaba", "estan", "estar",
  "estas", "este", "esto", "estos", "estoy", "fue", "fueron", "ha", "habia", "han",
  "hasta", "hay", "la", "las", "le", "les", "lo", "los", "mas", "me", "mi", "mis",
  "mucho", "muy", "nada", "ni", "no", "nos", "nuestra", "nuestro", "o", "os",
  "otra", "otras", "otro", "otros", "para", "pero", "poco", "por", "porque",
  "que", "quien", "se", "segun", "ser", "si", "sido", "sin", "sobre", "solo",
  "son", "soy", "su", "sus", "tal", "tambien", "tan", "tanto", "te", "tiene",
  "tienen", "toda", "todas", "todo", "todos", "tu", "tus", "un", "una", "unas",
  "unos", "usted", "ustedes", "va", "van", "varios", "ya", "yo",
];

// Conjunto para consulta en tiempo constante; se construye una vez por proceso.
const STOPWORDS = new Set<string>(SPANISH_STOPWORDS);

/**
 * Normaliza un texto para indexación:
 * 1. minúsculas;
 * 2. las tildes y diacríticos se quitan con la normalización compartida
 *    (á -> a, ñ -> n, y también caracteres fuera del set del español como
 *    ç, à u ö, que antes partían la palabra y ahora resuelven a su base;
 *    medido sobre el corpus real y los tests de recuperación: sin cambios);
 * 3. se parte por todo lo que no sea letra o dígito ASCII;
 * 4. se sueltan las palabras vacías y los tokens de una o dos letras
 *    (incluidos los números sueltos de uno o dos dígitos).
 *
 * Comportamiento aceptado y fijado en pruebas: un importe con separador de
 * miles como "1.500 euros" se reduce a ["500", "euros"], porque el punto es
 * separador. Se acepta porque las cifras que cita el modelo se validan contra
 * el texto completo de la fuente (no contra los términos del índice) y el
 * filtro del gate se apoya en palabras, no en importes.
 *
 * Es determinista: la misma entrada produce siempre la misma lista.
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let current = "";
  for (const char of normalizarSinTildes(text)) {
    if ((char >= "a" && char <= "z") || (char >= "0" && char <= "9")) {
      current += char;
    } else if (current.length > 0) {
      tokens.push(current);
      current = "";
    }
  }
  if (current.length > 0) tokens.push(current);

  return tokens.filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

/**
 * Normaliza texto para comparar valores de filtro (sector, región, tipo):
 * minúsculas y sin acentos, sin partir en palabras ni soltar nada.
 * Así "Cataluña" y "cataluna" comparan igual de forma determinista.
 */
export function normalizeText(text: string): string {
  return normalizarSinTildes(text);
}

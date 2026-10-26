// Tokenizador español determinista para el índice BM25 (AI-03a).
// Sin dependencias y sin colación dependiente del locale: solo operaciones
// sobre unidades de código ASCII tras la normalización manual de acentos.

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

/** Mapa de acentos y diacríticos del español a su forma base. */
const DIACRITICOS = new Map<string, string>([
  ["á", "a"], ["é", "e"], ["í", "i"], ["ó", "o"], ["ú", "u"], ["ü", "u"], ["ñ", "n"],
]);

/**
 * Normaliza un texto para indexación:
 * 1. minúsculas (solo ASCII: los acentos se tratan en el paso 2);
 * 2. los acentos del español se sustituyen por su vocal base (á -> a, ñ -> n);
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
  for (const char of text.toLowerCase()) {
    const base = DIACRITICOS.get(char) ?? char;
    if ((base >= "a" && base <= "z") || (base >= "0" && base <= "9")) {
      current += base;
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
  let out = "";
  for (const char of text.toLowerCase()) out += DIACRITICOS.get(char) ?? char;
  return out;
}

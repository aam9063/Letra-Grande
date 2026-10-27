// Hashes de los scripts en linea que la exportacion estatica de Next incluye
// en sus paginas (el payload de hidratacion). La CSP no permite scripts en
// linea a ciegas: calcula el hash sha256 de cada bloque y lo anade a script-src,
// de modo que solo el contenido conocido del renderer puede ejecutarse.
// Funcion pura, probada con vitest.
//
// El extractor solo reconoce <script> pelado, sin atributos. Es deliberado:
// si algun dia aparece un script en linea con atributos, no se hashea y la CSP
// lo bloquea (falla cerrado) en lugar de autorizarlo sin calculo de hash.
import { createHash } from "node:crypto";

/**
 * Extrae los hashes CSP de los scripts en linea de una pagina HTML.
 * Un script con src no cuenta: solo los bloques sin src. El bloque se toma
 * igual que lo hace el navegador: desde <script> hasta el primer </script>.
 * Los bloques vacios se ignoran.
 */
export function inlineScriptHashes(html: string): string[] {
  const hashes: string[] = [];
  const patron = /<script>([\s\S]*?)<\/script>/g;
  let coincidencia: RegExpExecArray | null;
  while ((coincidencia = patron.exec(html)) !== null) {
    const contenido = coincidencia[1] ?? "";
    if (contenido.trim() === "") continue;
    const hash = createHash("sha256").update(contenido).digest("base64");
    hashes.push(`'sha256-${hash}'`);
  }
  return hashes;
}

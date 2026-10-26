// Cargador del índice de contenido desde los YAML de content/ (AI-03a).
// Valida cada ficha con los esquemas de @letra-grande/schema: los ficheros
// que fallan se saltan (no son fatales) y solo se comunica cuántos fueron.
// No escribe nada en consola: el contenido indexado es público, pero el
// arranque del proxy no debe emitir logs.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { Authority, Company, Procedure } from "@letra-grande/schema";
import { buildIndex, type FichasInput, type SearchIndex } from "./index.js";

/** Resultado de la carga: índice y número de ficheros descartados por no validar. */
export interface LoadedContentIndex {
  readonly index: SearchIndex;
  /** Cuántos ficheros .yaml se saltaron por YAML roto o validación fallida. */
  readonly skippedFiles: number;
}

// Caché por contentRoot: el índice se construye una vez por proceso.
const cache = new Map<string, LoadedContentIndex>();

const SUBCARPETAS: readonly string[] = ["companies", "authorities", "procedures"];

function leerFichasDirectorio<T>(directorio: string, parseFicha: (datos: unknown) => T): {
  fichas: T[];
  saltados: number;
} {
  const fichas: T[] = [];
  let saltados = 0;
  let nombres: string[];
  try {
    nombres = readdirSync(directorio);
  } catch {
    return { fichas, saltados };
  }
  for (const nombre of nombres.sort()) {
    const ruta = join(directorio, nombre);
    if (!nombre.endsWith(".yaml") || !statSync(ruta).isFile()) continue;
    try {
      fichas.push(parseFicha(parse(readFileSync(ruta, "utf8")) as unknown));
    } catch {
      // YAML roto o ficha que no encaja en el esquema: se salta, sin detalles
      // en consola. El conteo queda disponible para diagnóstico.
      saltados += 1;
    }
  }
  return { fichas, saltados };
}

/**
 * Lee y valida las fichas YAML de `contentRoot` (carpetas companies,
 * authorities y procedures) y construye el índice BM25. Los ficheros que
 * fallan la validación se saltan; su cuenta va en `skippedFiles`. El índice
 * se cachea en memoria para el mismo `contentRoot` durante la vida del proceso.
 */
export function loadContentIndex(contentRoot: string): LoadedContentIndex {
  const clave = contentRoot;
  const enCache = cache.get(clave);
  if (enCache !== undefined) return enCache;

  const companies: Company[] = [];
  const authorities: Authority[] = [];
  const procedures: Procedure[] = [];
  let skippedFiles = 0;

  for (const carpeta of SUBCARPETAS) {
    const directorio = join(contentRoot, carpeta);
    if (carpeta === "companies") {
      const leido = leerFichasDirectorio(directorio, Company.parse);
      skippedFiles += leido.saltados;
      companies.push(...leido.fichas);
    } else if (carpeta === "authorities") {
      const leido = leerFichasDirectorio(directorio, Authority.parse);
      skippedFiles += leido.saltados;
      authorities.push(...leido.fichas);
    } else {
      const leido = leerFichasDirectorio(directorio, Procedure.parse);
      skippedFiles += leido.saltados;
      procedures.push(...leido.fichas);
    }
  }

  const fichas: FichasInput = { companies, authorities, procedures };
  const resultado: LoadedContentIndex = { index: buildIndex(fichas), skippedFiles };
  cache.set(clave, resultado);
  return resultado;
}

/** Indica si un directorio parece ser la raíz de contenido del repositorio. */
function esRaizContenido(repositorio: string): boolean {
  try {
    return statSync(join(repositorio, "content", "companies")).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Localiza la carpeta `content/` del repositorio subiendo directorios desde
 * `startDir` (por defecto, el directorio de trabajo del proceso). Funciona
 * igual en `next dev` y en `next start` dentro del monorepo, donde el cwd es
 * `apps/web`. Devuelve undefined si no la encuentra en ninguna carpeta madre.
 */
export function findContentRoot(startDir: string = process.cwd()): string | undefined {
  let actual = startDir;
  for (;;) {
    if (esRaizContenido(actual)) return join(actual, "content");
    const madre = join(actual, "..");
    if (madre === actual) return undefined;
    actual = madre;
  }
}

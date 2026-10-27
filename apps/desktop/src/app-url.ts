// Resolucion de URLs del protocolo propio a archivos del renderer estatico.
// Funcion pura: recibe la URL cruda y un predicado de existencia, para poder
// probarla con vitest sin arrancar Electron ni tocar el sistema de archivos.
//
// Por que no basta con `new URL(rawUrl)`: el analizador de URLs normaliza los
// segmentos "." y ".." (tambien en su forma codificada %2e) antes de darnos la
// ruta, asi que un salto de directorio llegaria camuflado como una ruta normal.
// Aqui analizamos la porcion cruda de la ruta antes de normalizar nada.

/** Host del origen propio de la aplicacion. */
export const APP_HOST = "letra-grande";

/** Esquema del protocolo propio, sin los dos puntos finales. */
export const APP_SCHEME = "app:";

export type AppUrlResolution =
  | { kind: "file"; relativePath: string }
  | { kind: "directoryIndex"; relativePath: string }
  | { kind: "fallbackIndex" }
  | { kind: "rejected" };

/** Predicado de existencia sobre rutas relativas a la raiz del renderer. */
export type ExistsPredicate = (relativePath: string) => boolean;

/**
 * Devuelve la porcion de ruta cruda de la URL (sin host, sin query, sin hash),
 * o null si la cadena no tiene la forma de una URL de nuestro protocolo.
 */
function extractRawPath(rawUrl: string): string | null {
  const separador = "://";
  const indiceSeparador = rawUrl.indexOf(separador);
  if (indiceSeparador === -1) return null;
  const trasSeparador = indiceSeparador + separador.length;
  const resto = rawUrl.slice(trasSeparador);
  const finHost = Math.min(
    ...["/", "?", "#"].map((c) => {
      const indice = resto.indexOf(c);
      return indice === -1 ? resto.length : indice;
    }),
  );
  return resto.slice(finHost).split("?")[0]?.split("#")[0] ?? null;
}

/**
 * Convierte la ruta cruda en segmentos decodificados seguros.
 * Devuelve null si cualquier segmento intenta salir del directorio:
 * saltos de directorio (literales o codificados), barras invertidas,
 * barras codificadas o bytes nulos.
 */
function safeSegments(rawPath: string): string[] | null {
  const segmentos: string[] = [];
  for (const segmento of rawPath.split("/")) {
    if (segmento === "") continue;
    let decodificado: string;
    try {
      decodificado = decodeURIComponent(segmento);
    } catch {
      return null;
    }
    if (
      decodificado === "." ||
      decodificado === ".." ||
      decodificado.includes("\\") ||
      decodificado.includes("/") ||
      decodificado.includes("\0")
    ) {
      return null;
    }
    segmentos.push(decodificado);
  }
  return segmentos;
}

/**
 * Resuelve una URL `app://letra-grande/...` a un archivo dentro del renderer.
 *
 * - Un directorio (ruta vacia o terminada en barra) resuelve a su index.html.
 * - Una ruta de archivo existente resuelve a ese archivo.
 * - Un directorio sin nombre de archivo resuelve a su index.html si existe.
 * - Una ruta desconocida cae al index.html de la raiz para que funcione la
 *   navegacion del cliente.
 * - Cualquier intento de salir del directorio del renderer se rechaza.
 */
export function resolveAppUrl(rawUrl: string, exists: ExistsPredicate): AppUrlResolution {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { kind: "rejected" };
  }
  if (url.protocol !== APP_SCHEME || url.host !== APP_HOST) {
    return { kind: "rejected" };
  }
  const rutaCruda = extractRawPath(rawUrl);
  if (rutaCruda === null) return { kind: "rejected" };
  const segmentos = safeSegments(rutaCruda);
  if (segmentos === null) return { kind: "rejected" };
  const relativo = segmentos.join("/");
  if (relativo === "") {
    return { kind: "directoryIndex", relativePath: "index.html" };
  }
  if (exists(relativo)) {
    return { kind: "file", relativePath: relativo };
  }
  const indiceDelDirectorio = `${relativo}/index.html`;
  if (exists(indiceDelDirectorio)) {
    return { kind: "directoryIndex", relativePath: indiceDelDirectorio };
  }
  return { kind: "fallbackIndex" };
}

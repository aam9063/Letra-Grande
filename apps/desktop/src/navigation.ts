// Politica de navegacion: solo se puede navegar dentro del origen propio.
// Todo lo demas se bloquea en la ventana y, si es un enlace web, se delega al
// navegador del sistema. Funcion pura, probada con vitest.

/** Esquema del protocolo propio, con los dos puntos finales. */
export const APP_SCHEME = "app:";

/** Host del origen propio de la aplicacion. */
export const APP_HOST = "letra-grande";

/** Origen completo que la ventana tiene permiso para cargar. */
export const APP_ORIGIN = `${APP_SCHEME}//${APP_HOST}`;

/**
 * Origen de una URL ya analizada. Se calcula a mano porque el estandar devuelve
 * "null" para esquemas que no reconoce, y el nuestro es un esquema propio.
 */
function originOf(url: URL): string {
  return `${url.protocol}//${url.host}`;
}

/** Decide si una navegacion puede quedarse dentro de la ventana. */
export function isNavigationAllowed(rawUrl: string): boolean {
  try {
    return originOf(new URL(rawUrl)) === APP_ORIGIN;
  } catch {
    return false;
  }
}

/** Decide si una URL es un enlace web que pertenece al navegador del sistema. */
export function isExternalWebUrl(rawUrl: string): boolean {
  try {
    const protocolo = new URL(rawUrl).protocol;
    return protocolo === "https:" || protocolo === "http:";
  } catch {
    return false;
  }
}

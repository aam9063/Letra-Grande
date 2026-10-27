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
 * Pantalla de arranque del escritorio. La app instalada abre directamente en
 * Hoy: la landing es la puerta de la web, donde se descarga la aplicación, y no
 * tiene sentido mostrarla dentro del producto ya instalado. El primer arranque
 * lo resuelve `GateOnboarding` desde el propio shell.
 */
export const DESKTOP_START_PATH = "/hoy/";

/** URL con la que se carga la ventana. */
export function startUrl(origin: string = APP_ORIGIN): string {
  return `${origin}${DESKTOP_START_PATH}`;
}

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

// Configuracion por entorno del escritorio. Sin secretos: el binario nunca
// lleva ninguna clave, solo la URL publica del proxy del asistente (seccion 4
// de docs/desktop.md).

/** Variable de entorno con el origen https del proxy del asistente. */
export const PROXY_ORIGIN_ENV_VAR = "LG_ASSISTANT_PROXY_ORIGIN";

/** Variable de entorno opcional con otra raiz del renderer para desarrollo. */
export const RENDERER_DIST_ENV_VAR = "LG_DESKTOP_DIST";

/**
 * Lee el origen del proxy del asistente del entorno. Devuelve undefined si no
 * esta configurado: entonces la CSP limita connect-src al propio origen.
 */
export function proxyOriginFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const valor = env[PROXY_ORIGIN_ENV_VAR]?.trim();
  return valor === undefined || valor === "" ? undefined : valor;
}

/**
 * Lee del entorno una raiz alternativa del renderer. Sirve para desarrollo y
 * pruebas: en produccion el renderer viaja dentro del paquete (DESK-03).
 */
export function rendererDistFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const valor = env[RENDERER_DIST_ENV_VAR]?.trim();
  return valor === undefined || valor === "" ? undefined : valor;
}

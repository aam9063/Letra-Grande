// Cuándo se comprueba si hay actualizaciones. Lógica pura, probada con vitest:
// solo la app empaquetada comprueba, y una variable de entorno lo desactiva.

/** Variable de entorno que desactiva el canal de actualizaciones. */
export const UPDATES_TOGGLE_ENV_VAR = "LG_UPDATES";

/** Unico valor de la variable que desactiva la comprobacion. */
export const UPDATES_OFF_VALUE = "off";

/**
 * Decide si toca comprobar actualizaciones al arrancar. Solo se comprueba en
 * la app empaquetada (en desarrollo no hay feed que consultar) y la variable
 * LG_UPDATES=off lo desactiva de forma explicita.
 */
export function shouldCheckForUpdates(options: {
  isPackaged: boolean;
  env?: NodeJS.ProcessEnv;
}): boolean {
  if (!options.isPackaged) return false;
  const toggle = options.env?.[UPDATES_TOGGLE_ENV_VAR];
  return toggle !== UPDATES_OFF_VALUE;
}

/** Resultado de una comprobacion unica, como la del modo diagnostico. */
export type UpdateCheckOutcome =
  | { readonly kind: "available"; readonly version: string }
  | { readonly kind: "none" }
  | { readonly kind: "error"; readonly message: string };

/**
 * Linea y codigo de salida del modo diagnostico. Una sola linea con el
 * resultado y un codigo de salida claro, sin abrir ventana.
 */
export function updateCheckResult(
  outcome: UpdateCheckOutcome,
): { line: string; exitCode: number } {
  if (outcome.kind === "available") {
    return { line: `actualizacion disponible: ${outcome.version}`, exitCode: 0 };
  }
  if (outcome.kind === "none") {
    return { line: "sin actualizaciones", exitCode: 0 };
  }
  return { line: `error: ${outcome.message}`, exitCode: 1 };
}

// Texto en espanol de los dos dialogos del actualizador. Logica pura, probada
// con vitest. Regla del canal (seccion 4 de docs/desktop.md): nada se descarga
// ni se instala sin que la persona lo acepte, y el texto nunca promete lo
// contrario.

/** Titulo y cuerpo de un dialogo nativo. */
export interface DialogText {
  readonly title: string;
  readonly message: string;
}

/** Dialogo de que hay una version nueva: pregunta si se descarga ahora. */
export function updateAvailableText(currentVersion: string, newVersion: string): DialogText {
  return {
    title: "Letra Grande: actualizacion disponible",
    message:
      `Hay una version nueva de Letra Grande: la ${newVersion} (tienes la ${currentVersion}). ` +
      "¿Descargar ahora? La descarga va en segundo plano. " +
      "No se instala nada sin que lo aceptes.",
  };
}

/** Dialogo de que la descarga ha terminado: pregunta si se reinicia ahora. */
export function updateReadyText(newVersion: string): DialogText {
  return {
    title: "Letra Grande: actualizacion lista",
    message:
      `La version ${newVersion} ya está descargada. ` +
      "¿Reiniciar ahora para instalarla? " +
      "Si prefieres seguir trabajando, no se instala nada hasta que tú lo pidas.",
  };
}

/** Aviso corto cuando la descarga falla. Un solo boton, sin reintentos. */
export function downloadErrorText(): DialogText {
  return {
    title: "Letra Grande",
    message: "No se pudo descargar la actualización. Prueba más tarde.",
  };
}

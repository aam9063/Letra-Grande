// Reintentos para las medidas de Lighthouse (QA-05).
//
// Por qué existe: en el PR #76, Lighthouse no consiguió arrancar Chrome en `/`
// ("waiting for dynamic debugging port in chrome-err.log") y `/hoy` midió sin
// problema en el mismo job. Eso no es una regresión de rendimiento: es el
// lanzador del navegador fallando. Tratar ese fallo como un presupuesto
// incumplido pone en rojo un check requerido y bloquea la entrega por azar.
//
// Qué NO hace: tapar la falta de medida. Si no se consigue medir tras los
// intentos, se falla. Un presupuesto que se aprueba sin medir no protege de
// nada; lo que se evita es fallar por un arranque fallido, no por no medir.

/**
 * Ejecuta `medir` hasta `intentos` veces. Devuelve el resultado del primer
 * intento que funcione; si todos fallan, propaga el último error.
 *
 * @param {object} datos
 * @param {() => Promise<T>} datos.medir Intento de medida.
 * @param {number} datos.intentos Total de intentos, al menos 1.
 * @param {(intentoFallido: number) => void} [datos.avisar] Aviso por intento fallido.
 */
export async function medirConReintentos({ medir, intentos, avisar }) {
  const total = Number.isInteger(intentos) && intentos > 0 ? intentos : 1;
  let ultimoError;
  for (let intento = 1; intento <= total; intento += 1) {
    try {
      return await medir();
    } catch (error) {
      ultimoError = error;
      if (intento < total) avisar?.(intento);
    }
  }
  throw ultimoError;
}

/** Mensaje del fallo definitivo, que distingue "no se midió" de "se pasó". */
export function mensajeSinMedida({ ruta, intentos, error }) {
  return [
    `No se pudo medir ${ruta} con Lighthouse tras ${intentos} intento(s):`,
    `  ${String(error?.message ?? error).split("\n")[0]}`,
    "",
    "Esto es un fallo de infraestructura, no un presupuesto incumplido: no hay medida que aprobar ni que suspender. Vuelve a lanzar el job; si se repite en la misma ruta, mira si el runner se está quedando sin recursos.",
  ].join("\n");
}

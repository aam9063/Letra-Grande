// Cadena de Content-Security-Policy que el protocolo propio anade a cada
// respuesta del renderer. Funcion pura, probada con vitest.
//
// Reglas del proyecto: sin terceros, sin fuentes remotas y sin scripts en linea
// sin hash. El unico destino de red permitido ademas del propio origen es el
// proxy del asistente, que llega configurado por entorno y nunca lleva clave.
// Los atributos style en linea si se permiten: el renderer prerenderizado los
// usa para los colores de estado y no ejecutan codigo.

/** Directivas fijas previas a connect-src, en orden. */
const DIRECTIVAS_INICIALES = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
] as const;

/** Directivas fijas posteriores a connect-src, en orden. */
const DIRECTIVAS_FINALES = [
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
] as const;

/** Acepta solo origenes https completos; cualquier otra cosa se ignora. */
function isHttpsOrigin(valor: string | undefined): valor is string {
  if (valor === undefined || valor === "") return false;
  try {
    const url = new URL(valor);
    return url.protocol === "https:" && url.origin === valor;
  } catch {
    return false;
  }
}

/**
 * Construye la CSP de la ventana. Con proxy configurado, su origen https se
 * anade solo a connect-src; sin proxy, la conexion se limita al propio origen.
 * Los hashes de script en linea (uno por bloque conocido del renderer) se
 * anaden a script-src: ningun otro script en linea puede ejecutarse.
 */
export function buildCsp(
  proxyOrigin: string | undefined,
  inlineScriptHashes: readonly string[] = [],
): string {
  const scriptSrc = ["script-src 'self'", ...inlineScriptHashes].join(" ");
  const conecta = isHttpsOrigin(proxyOrigin)
    ? `connect-src 'self' ${proxyOrigin}`
    : "connect-src 'self'";
  return [
    DIRECTIVAS_INICIALES[0],
    scriptSrc,
    DIRECTIVAS_INICIALES[1],
    DIRECTIVAS_INICIALES[2],
    DIRECTIVAS_INICIALES[3],
    conecta,
    ...DIRECTIVAS_FINALES,
  ].join("; ");
}

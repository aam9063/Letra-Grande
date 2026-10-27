/**
 * Guardián de red de la auditoría de privacidad (QA-01).
 *
 * Mira todas las peticiones de un contexto de navegador, no solo las de una
 * página: así entran también las del service worker, que era el hueco conocido
 * (REF-OPS-04). Una petición a un origen que no esté en la lista permitida, o un
 * cuerpo con datos personales sin enmascarar, se anota como violación y el spec
 * tiene que terminarlo con la lista vacía.
 *
 * Los datos personales los detecta `detect()` de `@letra-grande/privacy`, la
 * misma implementación que después enmascara: el guardián no reimplementa
 * patrones que podrían desviarse.
 */
import type { BrowserContext, Page, Request } from "@playwright/test";
import { detect } from "@letra-grande/privacy";
import permitidos from "../allowed-origins.json";

/** Lo que se puede vigilar: una página o un contexto entero. */
export type ObjetivoDeRed = Page | BrowserContext;

/**
 * Orígenes permitidos: el de la app y los pocos que declare el fichero versionado.
 *
 * @param baseURL URL con la que corre la app en las pruebas.
 * @param extras Orígenes adicionales; por defecto, los de `allowed-origins.json`.
 * @returns Lista de orígenes exactos, sin barras finales.
 */
export function origenesPermitidos(
  baseURL: string,
  extras: readonly string[] = permitidos.extraOrigins,
): string[] {
  const propios = new URL(baseURL).origin;
  return [propios, ...extras.map((origen) => new URL(origen).origin)];
}

/** Motivos por los que una petición se considera violación. */
export function motivosDePeticion(
  url: string,
  metodo: string,
  cuerpo: string | null,
  permitidosOrigenes: readonly string[],
): string[] {
  const destinos: string[] = [];
  const parseada = new URL(url);
  if (!permitidosOrigenes.includes(parseada.origin)) {
    destinos.push(`Origen no permitido: ${metodo} ${parseada.origin}${parseada.pathname}`);
  }
  if (cuerpo !== null && cuerpo !== "") {
    for (const hallazgo of detect(cuerpo)) {
      destinos.push(`Posible ${hallazgo.kind} en el cuerpo de ${metodo} ${parseada.pathname}`);
    }
  }
  return destinos;
}

/**
 * Registra el guardián y devuelve la lista viva de violaciones.
 *
 * @param objetivo Página o contexto a vigilar.
 * @param allowedOrigins Orígenes permitidos, normalmente de `origenesPermitidos`.
 * @returns Lista de violaciones; compruébala vacía al final del test.
 */
export function guardNetwork(objetivo: ObjetivoDeRed, allowedOrigins: string[]): string[] {
  const violaciones: string[] = [];
  objetivo.on("request", (peticion: Request) => {
    const url = new URL(peticion.url());
    // data: y blob: no salen del navegador.
    if (url.protocol === "data:" || url.protocol === "blob:") return;
    violaciones.push(
      ...motivosDePeticion(peticion.url(), peticion.method(), peticion.postData(), allowedOrigins),
    );
  });
  return violaciones;
}

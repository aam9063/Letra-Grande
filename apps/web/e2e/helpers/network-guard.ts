/**
 * Guardián de red de la auditoría de privacidad (QA-01).
 *
 * Mira todas las peticiones de un contexto de navegador, no solo las de una
 * página: así entran también las de otras pestañas y las del service worker,
 * que era el hueco conocido (REF-OPS-04). Una petición a un origen que no esté
 * en la lista permitida, un WebSocket a un origen ajeno o un cuerpo con datos
 * personales sin enmascarar se anotan como violación, y el spec tiene que
 * terminarlo con la lista vacía.
 *
 * Los datos personales los detecta `detect()` de `@letra-grande/privacy`, la
 * misma implementación que después enmascara: el guardián no reimplementa
 * patrones que podrían desviarse.
 */
import type { BrowserContext, Page, Request, WebSocket } from "@playwright/test";
import { detect } from "@letra-grande/privacy";
import permitidos from "../allowed-origins.json";

/** Lo que se puede vigilar: una página o un contexto entero. */
export type ObjetivoDeRed = Page | BrowserContext;

/** Lo que ha visto el guardián mientras estaba puesto. */
export interface VigilanciaDeRed {
  /** Motivos por los que el test tiene que fallar; vacío es lo correcto. */
  violaciones: string[];
  /** Peticiones observadas: si es cero, el test no ha probado nada. */
  peticiones: number;
  /** URLs que ha pedido el service worker, donde el navegador lo expone. */
  delServiceWorker: string[];
}

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
  const motivos: string[] = [];
  const parseada = new URL(url);
  if (!permitidosOrigenes.includes(parseada.origin)) {
    motivos.push(`Origen no permitido: ${metodo} ${parseada.origin}${parseada.pathname}`);
  }
  if (cuerpo !== null && cuerpo !== "") {
    for (const hallazgo of detect(cuerpo)) {
      motivos.push(`Posible ${hallazgo.kind} en el cuerpo de ${metodo} ${parseada.pathname}`);
    }
  }
  return motivos;
}

/**
 * Motivos por los que un WebSocket se considera violación.
 *
 * Playwright no emite el evento `request` de un WebSocket, solo `websocket`:
 * sin esto, una conexión abierta a un servidor ajeno pasaría desapercibida.
 */
export function motivosDeSocket(url: string, permitidosOrigenes: readonly string[]): string[] {
  const parseada = new URL(url);
  // Un WebSocket al mismo servidor habla ws o wss, no http: se compara el host.
  const equivalente =
    parseada.protocol === "ws:"
      ? `http://${parseada.host}`
      : parseada.protocol === "wss:"
        ? `https://${parseada.host}`
        : parseada.origin;
  if (permitidosOrigenes.includes(equivalente)) return [];
  return [`Origen no permitido: WebSocket ${parseada.origin}`];
}

/** Distingue un contexto de una página por su API, no por su forma. */
function esContexto(objetivo: ObjetivoDeRed): objetivo is BrowserContext {
  return typeof (objetivo as BrowserContext).pages === "function";
}

/**
 * Registra el guardián y devuelve lo que va viendo.
 *
 * @param objetivo Página o contexto a vigilar.
 * @param allowedOrigins Orígenes permitidos, normalmente de `origenesPermitidos`.
 * @returns Objeto vivo con violaciones, número de peticiones y peticiones del service worker.
 */
export function vigilarRed<T extends ObjetivoDeRed>(
  objetivo: T,
  allowedOrigins: string[],
): VigilanciaDeRed {
  const vigilancia: VigilanciaDeRed = { violaciones: [], peticiones: 0, delServiceWorker: [] };

  objetivo.on("request", (peticion: Request) => {
    const url = new URL(peticion.url());
    // data: y blob: no salen del navegador.
    if (url.protocol === "data:" || url.protocol === "blob:") return;

    vigilancia.peticiones += 1;
    if (peticion.serviceWorker() !== null) vigilancia.delServiceWorker.push(peticion.url());

    vigilancia.violaciones.push(
      ...motivosDePeticion(peticion.url(), peticion.method(), peticion.postData(), allowedOrigins),
    );
  });

  // El evento `websocket` es de la página, no del contexto: en un contexto se
  // engancha a cada pestaña, la que ya existe y las que se abran después.
  const alSocket = (socket: WebSocket) => {
    vigilancia.violaciones.push(...motivosDeSocket(socket.url(), allowedOrigins));
  };
  const vigilarSockets = (pagina: Page) => pagina.on("websocket", alSocket);

  if (esContexto(objetivo)) {
    for (const pagina of objetivo.pages()) vigilarSockets(pagina);
    objetivo.on("page", vigilarSockets);
  } else {
    vigilarSockets(objetivo);
  }

  return vigilancia;
}

/**
 * Registra el guardián y devuelve solo la lista viva de violaciones.
 *
 * @param objetivo Página o contexto a vigilar.
 * @param allowedOrigins Orígenes permitidos, normalmente de `origenesPermitidos`.
 * @returns Lista de violaciones; compruébala vacía al final del test.
 */
export function guardNetwork(objetivo: ObjetivoDeRed, allowedOrigins: string[]): string[] {
  return vigilarRed(objetivo, allowedOrigins).violaciones;
}

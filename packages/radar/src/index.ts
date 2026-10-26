/**
 * Motor del radar: cálculo de plazos, estado, orden y exportación a `.ics`.
 * Lógica pura, sin red y sin navegador. El reloj siempre llega por parámetro,
 * nunca con `Date.now()`, para que todo sea determinista y comprobable.
 *
 * Los días hábiles son una aproximación (solo se saltan sábados y domingos,
 * sin calendario laboral) y el resultado lo declara con `aproximado: true`.
 */
import type { RadarItem } from "@letra-grande/schema";

export type UnidadPlazo = "dias_naturales" | "dias_habiles" | "meses" | "anios";

/** Regla de un plazo, tal como la describe la ficha del trámite. */
export interface ReglaPlazo {
  amount: number;
  unit: UnidadPlazo;
}

/** Resultado de sumar un plazo: la fecha límite y si es orientativa. */
export interface PlazoCalculado {
  /** Fecha límite en formato AAAA-MM-DD. */
  dueDate: string;
  /** Verdadero cuando el cálculo no tiene en cuenta el calendario laboral real. */
  aproximado: boolean;
}

export type EstadoPlazo = "vencido" | "hoy" | "proximo" | "lejano" | "hecho" | "descartado";

/** Días de antelación que definen un plazo como próximo. */
const DIAS_PROXIMO = 7;

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Milisegundos en UTC de una fecha (solo el día). */
function aUtc(from: string | Date, origen: string): number {
  return aUtcDia(typeof from === "string" ? aFechaCompleta(from, origen) : from, origen);
}

/** Milisegundos en UTC de un Date, validado. */
function aUtcDia(from: Date, origen: string): number {
  if (Number.isNaN(from.getTime())) {
    throw new Error(`${origen}: la fecha no es válida`);
  }
  return Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
}

/** Convierte una cadena de fecha en Date UTC, rechazando fechas imposibles. */
function aFechaCompleta(from: string, origen: string): Date {
  if (!REGEX_FECHA.test(from)) {
    throw new Error(`${origen}: se esperaba una fecha AAAA-MM-DD`);
  }
  const [anios, meses, dias] = from.split("-").map(Number) as [number, number, number];
  const fecha = new Date(Date.UTC(anios, meses - 1, dias));
  // Comprobamos el viaje de ida y vuelta: rechaza 2026-13-01 o 2026-02-30.
  if (
    fecha.getUTCFullYear() !== anios ||
    fecha.getUTCMonth() !== meses - 1 ||
    fecha.getUTCDate() !== dias
  ) {
    throw new Error(`${origen}: la fecha ${from} no existe en el calendario`);
  }
  return fecha;
}

/** Milisegundos de un momento completo (con hora), para `DTSTAMP`. */
function aUtcMomento(from: string | Date, origen: string): number {
  if (from instanceof Date) {
    if (Number.isNaN(from.getTime())) {
      throw new Error(`${origen}: la fecha no es válida`);
    }
    return from.getTime();
  }
  const ms = Date.parse(from);
  if (Number.isNaN(ms)) {
    throw new Error(`${origen}: se esperaba una fecha y hora ISO`);
  }
  return ms;
}

/** Formatea unos milisegundos en UTC como AAAA-MM-DD. */
function aFechaIso(ms: number): string {
  const fecha = new Date(ms);
  const anios = String(fecha.getUTCFullYear()).padStart(4, "0");
  const meses = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const dias = String(fecha.getUTCDate()).padStart(2, "0");
  return `${anios}-${meses}-${dias}`;
}

/** Número de días de un mes (mes de 1 a 12), con bisiestos. */
function diasDelMes(anios: number, meses: number): number {
  return new Date(Date.UTC(anios, meses, 0)).getUTCDate();
}

/**
 * Suma un plazo a una fecha de origen.
 * - `dias_naturales`: días de calendario, `aproximado: false`.
 * - `dias_habiles`: salta sábados y domingos (sin festivos), `aproximado: true`.
 * - `meses` y `anios`: con clamp al último día del mes destino, `aproximado: false`.
 * Todo el cálculo se hace en UTC para que el horario de verano no desplace fechas.
 */
export function addDeadline(from: string | Date, rule: ReglaPlazo): PlazoCalculado {
  const { amount, unit } = rule;
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("amount: se esperaba un entero positivo");
  }
  if (unit !== "dias_naturales" && unit !== "dias_habiles" && unit !== "meses" && unit !== "anios") {
    throw new Error(`unit: unidad de plazo desconocida (${String(unit)})`);
  }

  const origen = aUtc(from, "from");
  const fecha = new Date(origen);

  if (unit === "dias_naturales") {
    return { dueDate: aFechaIso(origen + amount * 86_400_000), aproximado: false };
  }

  if (unit === "dias_habiles") {
    // Se cuenta desde el día siguiente; solo se saltan sábados y domingos,
    // así que el resultado es orientativo hasta que exista el calendario regional.
    let restantes = amount;
    let ms = origen;
    while (restantes > 0) {
      ms += 86_400_000;
      const dia = new Date(ms).getUTCDay();
      if (dia !== 0 && dia !== 6) restantes -= 1;
    }
    return { dueDate: aFechaIso(ms), aproximado: true };
  }

  // meses y anios: el día se clamp al último día del mes destino.
  const aniosDestino = fecha.getUTCFullYear() + (unit === "anios" ? amount : 0);
  const mesesDestino =
    fecha.getUTCMonth() + (unit === "meses" ? amount : 0);
  const aniosFinales = aniosDestino + Math.floor(mesesDestino / 12);
  const mesesFinales = ((mesesDestino % 12) + 12) % 12;
  const dia = Math.min(fecha.getUTCDate(), diasDelMes(aniosFinales, mesesFinales + 1));
  return {
    dueDate: aFechaIso(Date.UTC(aniosFinales, mesesFinales, dia)),
    aproximado: false,
  };
}

/** Días de diferencia entre dos fechas AAAA-MM-DD (destino menos origen). */
function diasEntre(destino: string, origen: string): number {
  return Math.round((aUtc(destino, "dueDate") - aUtc(origen, "today")) / 86_400_000);
}

/**
 * Estado de un elemento del radar respecto a una fecha de referencia.
 * `hecho` y `descartado` pasan tal cual; para los pendientes: `vencido`,
 * `hoy`, `proximo` (dentro de 7 días, borde incluido) o `lejano`.
 */
export function deadlineStatus(
  itemItem: Pick<RadarItem, "dueDate" | "status">,
  today: string | Date,
): EstadoPlazo {
  if (itemItem.status === "hecho") return "hecho";
  if (itemItem.status === "descartado") return "descartado";
  const dias = diasEntre(itemItem.dueDate, aFechaIso(aUtc(today, "today")));
  if (dias < 0) return "vencido";
  if (dias === 0) return "hoy";
  if (dias <= DIAS_PROXIMO) return "proximo";
  return "lejano";
}

/**
 * Devuelve una copia ordenada de la línea de tiempo: pendientes por fecha
 * ascendente y, a igual fecha, en el orden original (orden estable). Los
 * elementos `hecho` y `descartado` van al final. No muta el array recibido.
 */
export function sortRadarItems<T extends Pick<RadarItem, "dueDate" | "status">>(items: T[]): T[] {
  const pendientes = items.filter((i) => i.status === "pendiente" || i.status === undefined);
  const archivados = items.filter((i) => i.status !== "pendiente" && i.status !== undefined);
  // Array.prototype.sort es estable según la especificación de ECMAScript.
  pendientes.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
  return [...pendientes, ...archivados];
}

/**
 * Elementos pendientes dentro de la ventana de los próximos `days` días,
 * con los bordes incluidos (hoy y hoy más `days`). El vencido, el hecho
 * y el descartado quedan fuera.
 */
export function upcoming<T extends Pick<RadarItem, "dueDate" | "status">>(
  items: T[],
  days: number,
  today: string | Date,
): T[] {
  const hoy = aFechaIso(aUtc(today, "today"));
  const fin = aFechaIso(aUtc(hoy, "today") + days * 86_400_000);
  return items.filter(
    (i) =>
      (i.status === "pendiente" || i.status === undefined) && i.dueDate >= hoy && i.dueDate <= fin,
  );
}

/** Opciones de exportación a `.ics`. El reloj (`now`) llega inyectado. */
export interface IcsOptions {
  /** Momento de generación, para `DTSTAMP`. Obligatorio para ser determinista. */
  now: string | Date;
  /** Nombre del calendario, opcional. */
  calendarName?: string;
  /** Identificador del producto, opcional. */
  prodId?: string;
}

/** Escapa un valor de texto según RFC 5545 (contrabarra, punto y coma, coma y saltos). */
function escaparIcs(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Plega una línea a 75 octetos como máximo, sin partir caracteres
 * multibyte, con las líneas de continuación precedidas de un espacio.
 */
function plegarLinea(linea: string): string[] {
  const trozos: string[] = [];
  let actual = "";
  let octetos = 0;
  for (const caracter of linea) {
    const longitud = new TextEncoder().encode(caracter).length;
    if (octetos + longitud > 75) {
      trozos.push(actual);
      actual = "";
      octetos = 0;
    }
    actual += caracter;
    octetos += longitud;
  }
  trozos.push(actual);
  return trozos.flatMap((t, i) => (i === 0 ? [t] : [` ${t}`]));
}

/** Formatea un momento como fecha-hora UTC de iCalendar (YYYYMMDDTHHMMSSZ). */
function aIcsDateTime(ms: number): string {
  const fecha = new Date(ms);
  const rellenar = (n: number, largo = 2) => String(n).padStart(largo, "0");
  return (
    `${rellenar(fecha.getUTCFullYear(), 4)}${rellenar(fecha.getUTCMonth() + 1)}${rellenar(fecha.getUTCDate())}` +
    `T${rellenar(fecha.getUTCHours())}${rellenar(fecha.getUTCMinutes())}${rellenar(fecha.getUTCSeconds())}Z`
  );
}

/**
 * Genera un calendario iCalendar 2.0 con un evento de todo el día por cada
 * elemento pendiente. Sin `TZID`: los eventos de todo el día no llevan zona.
 * Las líneas se separan con CRLF, se escapan los valores de texto y las
 * líneas largas se plegan a 75 octetos según RFC 5545.
 */
export function toIcs(items: RadarItem[], options: IcsOptions): string {
  const msAhora = aUtcMomento(options.now, "options.now");
  const prodId = options.prodId ?? "-//Letra Grande//Radar//ES";
  const lineas: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:${escaparIcs(prodId)}`, "CALSCALE:GREGORIAN"];
  if (options.calendarName) {
    lineas.push(`X-WR-CALNAME:${escaparIcs(options.calendarName)}`);
  }

  for (const itemItem of items) {
    if (itemItem.status !== "pendiente") continue;
    const dtstamp = aIcsDateTime(msAhora);
    const dtstart = itemItem.dueDate.replaceAll("-", "");
    const fin = aFechaIso(aUtc(itemItem.dueDate, "dueDate") + 86_400_000).replaceAll("-", "");
    lineas.push(
      "BEGIN:VEVENT",
      `UID:${escaparIcs(`${itemItem.id}@letra-grande`)}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `DTEND;VALUE=DATE:${fin}`,
      `SUMMARY:${escaparIcs(itemItem.title)}`,
      `DESCRIPTION:${escaparIcs(`Origen: ${itemItem.origin}`)}`,
      "END:VEVENT",
    );
  }
  lineas.push("END:VCALENDAR");

  return lineas.flatMap(plegarLinea).join("\r\n") + "\r\n";
}

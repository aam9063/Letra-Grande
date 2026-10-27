/**
 * Extractor de facturas de la luz.
 *
 * Recibe el texto que ya se ha leído en local (DOCS-01a para PDF, DOCS-01b
 * para fotos) y devuelve los datos de la factura. Es lógica pura: sin red, sin
 * ficheros, sin estado global y determinista.
 *
 * Regla de oro: **no se inventa nada**. Un campo que no aparece, o que aparece
 * de forma ambigua o imposible (un 31 de febrero, un importe que no es un
 * número), queda a `null` y se declara en `noLeidos`. Es preferible un hueco
 * visible a un dato falso: de estos campos salen avisos y comparaciones.
 */

/** Campos que el extractor intenta leer. El orden es el de `noLeidos`. */
export const CAMPOS_FACTURA = [
  "comercializadora",
  "cups",
  "periodo",
  "tarifa",
  "potencia",
  "consumo",
  "importeTotalEur",
] as const;

/** Nombre de un campo de la factura. */
export type CampoFactura = (typeof CAMPOS_FACTURA)[number];

/** Periodo facturado, con las fechas en `AAAA-MM-DD`. */
export interface PeriodoFacturado {
  desde: string;
  hasta: string;
}

/** Consumo de un periodo tarifario, en kWh. */
export interface ConsumoPeriodo {
  periodo: string;
  kwh: number;
}

/** Potencia contratada de un periodo tarifario, en kW. */
export interface PotenciaPeriodo {
  periodo: string;
  kw: number;
}

/** Datos leídos de una factura de la luz. */
export interface FacturaLuz {
  /** Nombre de la comercializadora tal como aparece en la factura. */
  comercializadora: string | null;
  /** CUPS en mayúsculas y sin espacios. */
  cups: string | null;
  /** Periodo facturado. */
  periodo: PeriodoFacturado | null;
  /** Peaje o tarifa de acceso, por ejemplo `2.0TD`. */
  tarifa: string | null;
  /** Potencia contratada por periodo; vacío si no se ha leído. */
  potencia: PotenciaPeriodo[];
  /** Consumo por periodo; vacío si no se ha leído. */
  consumo: ConsumoPeriodo[];
  /** Importe total en euros, ya como número. */
  importeTotalEur: number | null;
  /** Campos que no se han podido leer, en el orden de `CAMPOS_FACTURA`. */
  noLeidos: CampoFactura[];
}

/** Etiquetas con las que las comercializadoras escriben la comercializadora. */
const ETIQUETA_COMERCIALIZADORA =
  /(?:comercializadora(?:\s+(?:eléctrica|de\s+energía))?|nombre\s+comercial)\s*:\s*(\S.*)$/i;

/** La línea del CUPS, con cualquiera de sus etiquetas habituales. */
const ETIQUETA_CUPS = /\bcups\b[^:]*:\s*([A-Za-z0-9][A-Za-z0-9\s-]*)$/i;

/** Formato de un CUPS español: ES, 16 dígitos y dos letras, con dos opcionales. */
const FORMATO_CUPS = /^ES\d{16}[A-Z]{2}[A-Z0-9]{0,2}$/;

/** La línea que empieza el periodo con la etiqueta, o con "Del ... al ...". */
const ETIQUETA_PERIODO = /(?:periodo(?:\s+de\s+facturaci[oó]n)?\s*:\s*|^\s*del\s+)(.+)$/i;

/** Separador entre las dos fechas del periodo: "a", "al", "hasta" o un guion suelto. */
const SEPARADOR_PERIODO = /\s+(?:a|al|hasta)\s+|\s+-\s+/i;

/** La tarifa de acceso o peaje. */
const ETIQUETA_TARIFA = /(?:tarifa(?:\s+de\s+acceso)?|peaje)\s*:\s*([0-9][0-9A-Z.]*)$/i;

/** Formato de una tarifa de acceso: 2.0TD, 3.0TD, 6.1TD... */
const FORMATO_TARIFA = /^\d\.\d[A-Z]{2}$/;

/** Potencia contratada de un periodo: "Potencia contratada P1: 4,600 kW". */
const ETIQUETA_POTENCIA = /potencia\s+contratada\s*:?\s*(P\d)\s*:?\s*([\d.,]+)\s*kW/i;

/** Consumo de un periodo: "Consumo P1: 12,5 kWh" o "Energía consumida P1: 12,5 kWh". */
const ETIQUETA_CONSUMO =
  /(?:consumo(?:\s+del\s+periodo)?|energ[ií]a\s+consumida)\s+(P\d)\s*:\s*([\d.,]+)\s*kWh/i;

/** Importe total, con las etiquetas y los símbolos que se ven en las facturas. */
const ETIQUETA_IMPORTE =
  /(?:importe\s+total(?:\s+de\s+la\s+factura)?|total\s+a\s+pagar|total\s+factura)\s*:\s*(?:€\s*)?([\d.,]+)/i;

/**
 * Convierte un número escrito a la española o a la inglesa en un número.
 *
 * Con dos separadores, el último es el decimal y el otro marca miles. Con uno
 * solo, tres dígitos detrás y un grupo de miles delante, es un separador de
 * miles; en cualquier otro caso, decimal.
 *
 * @param texto Número tal como aparece en la factura.
 * @returns El número, o `null` si no se puede leer.
 */
export function parsearNumero(texto: string): number | null {
  const limpio = texto.trim().replace(/\s/g, "");
  if (limpio === "") return null;

  const tieneComa = limpio.includes(",");
  const tienePunto = limpio.includes(".");
  let normalizado: string;

  if (tieneComa && tienePunto) {
    const decimal = limpio.lastIndexOf(",") > limpio.lastIndexOf(".") ? "," : ".";
    const miles = decimal === "," ? "." : ",";
    normalizado = limpio.split(miles).join("").replace(decimal, ".");
  } else if (tieneComa) {
    normalizado = limpio.replace(",", ".");
  } else if (tienePunto && /^\d{1,3}(\.\d{3})+$/.test(limpio)) {
    normalizado = limpio.split(".").join("");
  } else {
    normalizado = limpio;
  }

  if (!/^\d+(\.\d+)?$/.test(normalizado)) return null;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Convierte una fecha escrita a `AAAA-MM-DD`.
 *
 * Acepta `DD/MM/AAAA` y `AAAA-MM-DD`, y rechaza lo que no es una fecha real:
 * un 31 de febrero devuelve `null` en vez de convertirse en marzo.
 *
 * @param texto Fecha tal como aparece en la factura.
 * @returns La fecha en `AAAA-MM-DD`, o `null` si no es válida.
 */
export function parsearFecha(texto: string): string | null {
  const limpio = texto.trim();
  let anio: number;
  let mes: number;
  let dia: number;

  const espanola = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(limpio);
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(limpio);

  if (espanola !== null) {
    dia = Number(espanola[1]);
    mes = Number(espanola[2]);
    anio = Number(espanola[3]);
  } else if (iso !== null) {
    anio = Number(iso[1]);
    mes = Number(iso[2]);
    dia = Number(iso[3]);
  } else {
    return null;
  }

  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const valida =
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
  if (!valida) return null;

  const dosDigitos = (valor: number) => String(valor).padStart(2, "0");
  return `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}`;
}

/**
 * Valor único de un campo de una sola línea.
 *
 * Devuelve `null` si no hay ninguna línea que case o si dos líneas dicen cosas
 * distintas: un dato ambiguo no se elige a cara o cruz, se declara no leído.
 * Una línea que no se puede convertir (por ejemplo, un importe que no es un
 * número) se salta, así que no bloquea a la siguiente que sí valga.
 */
function buscarUnico<T>(
  lineas: string[],
  patron: RegExp,
  convertir: (crudo: string) => T | null,
): T | null {
  const valores = new Map<string, T>();
  for (const linea of lineas) {
    const coincidencia = patron.exec(linea);
    const crudo = coincidencia?.[1];
    if (crudo === undefined) continue;
    const valor = convertir(crudo.trim());
    if (valor === null) continue;
    valores.set(JSON.stringify(valor), valor);
  }
  if (valores.size !== 1) return null;
  return [...valores.values()][0] ?? null;
}

/**
 * Valores por periodo tarifario (potencia y consumo).
 *
 * Si un mismo periodo aparece con dos valores distintos, la lista entera queda
 * vacía y el campo se declara no leído: media lista con un valor dudoso dentro
 * sería peor que ninguna.
 */
function buscarPorPeriodo(lineas: string[], patron: RegExp): [string, number][] {
  const encontrados = new Map<string, Set<number>>();
  for (const linea of lineas) {
    const coincidencia = patron.exec(linea);
    if (coincidencia === null) continue;
    const periodo = coincidencia[1];
    if (periodo === undefined) continue;
    const valor = parsearNumero(coincidencia[2] ?? "");
    if (valor === null) continue;
    const valores = encontrados.get(periodo) ?? new Set<number>();
    valores.add(valor);
    encontrados.set(periodo, valores);
  }

  const ambiguo = [...encontrados.values()].some((valores) => valores.size > 1);
  if (ambiguo) return [];

  return [...encontrados.entries()].map(([periodo, valores]) => [
    periodo,
    [...valores][0] ?? 0,
  ]);
}

/** Convierte "01/01/2026 a 31/01/2026" en un periodo, o `null` si no lo es. */
function convertirPeriodo(crudo: string): PeriodoFacturado | null {
  const partes = crudo.split(SEPARADOR_PERIODO);
  if (partes.length !== 2) return null;

  const desde = parsearFecha(partes[0] ?? "");
  const hasta = parsearFecha(partes[1] ?? "");
  if (desde === null || hasta === null) return null;

  return { desde, hasta };
}

/** Lee el periodo facturado; con dos periodos distintos no elige ninguno. */
function leerPeriodo(lineas: string[]): PeriodoFacturado | null {
  return buscarUnico(lineas, ETIQUETA_PERIODO, convertirPeriodo);
}

/**
 * Extrae los datos de una factura de la luz.
 *
 * @param texto Texto de la factura tal como lo devuelven `extractPdfText` o `extractImageText`.
 * @returns Los campos leídos y la lista de los que no se han podido leer.
 */
export function extractInvoiceFields(texto: string): FacturaLuz {
  const lineas = texto.split(/\r\n?|\n/).map((linea) => linea.replace(/\s+$/, ""));

  const comercializadora = buscarUnico(lineas, ETIQUETA_COMERCIALIZADORA, (crudo) =>
    crudo === "" ? null : crudo,
  );
  const cups = buscarUnico(lineas, ETIQUETA_CUPS, (crudo) => {
    const normalizado = crudo.replace(/[\s-]/g, "").toUpperCase();
    return FORMATO_CUPS.test(normalizado) ? normalizado : null;
  });
  const tarifa = buscarUnico(lineas, ETIQUETA_TARIFA, (crudo) =>
    FORMATO_TARIFA.test(crudo) ? crudo.toUpperCase() : null,
  );
  const importeTotalEur = buscarUnico(lineas, ETIQUETA_IMPORTE, parsearNumero);

  const potencia = buscarPorPeriodo(lineas, ETIQUETA_POTENCIA).map(([periodo, kw]) => ({
    periodo,
    kw,
  }));
  const consumo = buscarPorPeriodo(lineas, ETIQUETA_CONSUMO).map(([periodo, kwh]) => ({
    periodo,
    kwh,
  }));

  const factura: FacturaLuz = {
    comercializadora,
    cups,
    periodo: leerPeriodo(lineas),
    tarifa,
    potencia,
    consumo,
    importeTotalEur,
    noLeidos: [],
  };

  factura.noLeidos = CAMPOS_FACTURA.filter((campo) => {
    const valor = factura[campo];
    return valor === null || (Array.isArray(valor) && valor.length === 0);
  });

  return factura;
}

/**
 * Aplana una factura a los campos primitivos que admite `VaultDocument.fields`.
 *
 * Solo aparecen los campos leídos: un campo ausente se nota porque no está, y
 * la lista de lo que no se ha leído viaja en `camposNoLeidos`.
 *
 * @param factura Resultado de `extractInvoiceFields`.
 * @returns Registro plano de cadenas y números, listo para el vault.
 */
export function camposParaVault(factura: FacturaLuz): Record<string, string | number | boolean> {
  const campos: Record<string, string | number | boolean> = {};

  if (factura.comercializadora !== null) campos.comercializadora = factura.comercializadora;
  if (factura.cups !== null) campos.cups = factura.cups;
  if (factura.periodo !== null) {
    campos.periodoDesde = factura.periodo.desde;
    campos.periodoHasta = factura.periodo.hasta;
  }
  if (factura.tarifa !== null) campos.tarifa = factura.tarifa;
  for (const { periodo, kw } of factura.potencia) {
    campos[`potencia${periodo}Kw`] = kw;
  }
  for (const { periodo, kwh } of factura.consumo) {
    campos[`consumo${periodo}Kwh`] = kwh;
  }
  if (factura.importeTotalEur !== null) campos.importeTotalEur = factura.importeTotalEur;
  campos.camposNoLeidos = factura.noLeidos.join(",");

  return campos;
}

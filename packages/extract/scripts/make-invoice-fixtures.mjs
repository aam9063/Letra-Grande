/**
 * Generador del corpus sintético de facturas de la luz.
 *
 * Escribe 20 facturas de texto con su verdad esperada en
 * fixtures/facturas/. El texto imita lo que devuelven extractPdfText y
 * extractImageText: una línea por línea, sin maquetación fiable. Todo es
 * ficticio (comercializadoras, NIF, personas, direcciones, CUPS e importes
 * inventados): nunca debe contener datos reales.
 *
 * La verdad esperada se escribe desde los mismos datos que el texto, así que
 * no puede desincronizarse: si un fixture cambia, cambia su verdad.
 *
 * Uso: node scripts/make-invoice-fixtures.mjs [directorio] (desde la raíz del paquete).
 * Sin directorio escribe en fixtures/facturas.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
// Un directorio opcional permite a los tests regenerar el corpus en un
// temporal y comprobar que lo versionado es exactamente lo que sale de aquí.
const destino =
  process.argv[2] === undefined ? join(raiz, "fixtures", "facturas") : resolve(process.argv[2]);

/** Separa los miles y usa coma decimal, como una factura española. */
function eurosEspanol(valor) {
  const [entera, decimal] = valor.toFixed(2).split(".");
  const conMiles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${conMiles},${decimal}`;
}

/** Punto decimal, como algunas comercializadoras exportan. */
function eurosPunto(valor) {
  return valor.toFixed(2);
}

/** Número con coma decimal y tres decimales, como las potencias. */
function numeroEspanol(valor, decimales = 2) {
  return valor.toFixed(decimales).replace(".", ",");
}

/** Convierte una fecha AAAA-MM-DD en DD/MM/AAAA. */
function fechaEspanola(iso) {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

/**
 * Plantillas de maquetación: cambian las etiquetas, el formato de fecha y el
 * de los importes, que es lo que de verdad varía entre comercializadoras.
 */
const PLANTILLAS = {
  A: {
    comercializadora: (v) => `Comercializadora: ${v}`,
    cups: (v) => `CUPS: ${v}`,
    periodo: (desde, hasta) => `Periodo de facturación: ${fechaEspanola(desde)} a ${fechaEspanola(hasta)}`,
    potencia: (p) => `Potencia contratada ${p.periodo}: ${numeroEspanol(p.kw, 3)} kW`,
    tarifa: (v) => `Tarifa: ${v}`,
    consumo: (c) => `Consumo ${c.periodo}: ${numeroEspanol(c.kwh)} kWh`,
    importe: (v) => `Importe total: ${eurosEspanol(v)} EUR`,
  },
  B: {
    comercializadora: (v) => `COMERCIALIZADORA: ${v}`,
    cups: (v) => `Codigo CUPS: ${v}`,
    periodo: (desde, hasta) => `Periodo: ${desde} - ${hasta}`,
    potencia: (p) => `Potencia contratada: ${p.periodo} ${numeroEspanol(p.kw, 3)} kW`,
    tarifa: (v) => `Peaje: ${v}`,
    consumo: (c) => `Energia consumida ${c.periodo}: ${numeroEspanol(c.kwh)} kWh`,
    importe: (v) => `TOTAL A PAGAR: ${eurosEspanol(v)} EUR`,
  },
  C: {
    comercializadora: (v) => `Nombre comercial: ${v}`,
    cups: (v) => `Punto de suministro (CUPS): ${v}`,
    periodo: (desde, hasta) => `Del ${fechaEspanola(desde)} al ${fechaEspanola(hasta)}`,
    potencia: (p) => `Potencia contratada ${p.periodo} ${numeroEspanol(p.kw, 3)} kW`,
    tarifa: (v) => `Tarifa de acceso: ${v}`,
    consumo: (c) => `Consumo del periodo ${c.periodo}: ${numeroEspanol(c.kwh)} kWh`,
    importe: (v) => `Importe total de la factura: ${eurosPunto(v)} EUR`,
  },
  D: {
    comercializadora: (v) => `Comercializadora eléctrica: ${v}`,
    cups: (v) => `CUPS (punto de suministro): ${v}`,
    periodo: (desde, hasta) => `Periodo de facturación: ${fechaEspanola(desde)} - ${fechaEspanola(hasta)}`,
    potencia: (p) => `Potencia contratada: ${p.periodo} ${numeroEspanol(p.kw, 3)} kW`,
    tarifa: (v) => `Tarifa de acceso: ${v}`,
    consumo: (c) => `Consumo ${c.periodo}: ${numeroEspanol(c.kwh)} kWh`,
    importe: (v) => `Total factura: ${eurosEspanol(v)} €`,
  },
  E: {
    comercializadora: (v) => `Comercializadora de energía: ${v}`,
    cups: (v) => `CUPS: ${v.replace(/(.{10})(?=.)/g, "$1 ")}`,
    periodo: (desde, hasta) => `Periodo de facturación: ${fechaEspanola(desde)} a ${fechaEspanola(hasta)}`,
    potencia: (p) => `Potencia contratada ${p.periodo}:  ${numeroEspanol(p.kw, 3)} kW`,
    tarifa: (v) => `Tarifa de acceso:   ${v}`,
    consumo: (c) => `Consumo   ${c.periodo}:  ${numeroEspanol(c.kwh)} kWh`,
    importe: (v) => `Importe total:  ${eurosEspanol(v)} EUR`,
  },
};

/** Personas y direcciones ficticias del titular, para que el texto se parezca a una factura. */
const TITULARES = [
  { nombre: "Persona de Ejemplo Uno", direccion: "Calle Falsa 12, 46001 Valencia" },
  { nombre: "Persona de Ejemplo Dos", direccion: "Avenida Inventada 3, 08001 Barcelona" },
  { nombre: "Persona de Ejemplo Tres", direccion: "Plaza Imaginaria 8, 28001 Madrid" },
];

const COMERCIALIZADORAS = [
  { nombre: "Luz Ficticia Energía S.L.", nif: "B11111111" },
  { nombre: "Electra de Ejemplo S.A.", nif: "A22222222" },
  { nombre: "Comercializadora Imaginaria Verde S.L.", nif: "B33333333" },
  { nombre: "Energía Inventada del Turia S.L.", nif: "B44444444" },
  { nombre: "Suministros Ficticios del Sur S.A.", nif: "A55555555" },
];

/** Periodos de consumo y potencia según el peaje, como los reparte una factura real. */
const PERIODOS = {
  "2.0TD": { consumo: ["P1", "P2", "P3"], potencia: ["P1", "P2"] },
  "3.0TD": { consumo: ["P1", "P2", "P3", "P4", "P5", "P6"], potencia: ["P1", "P2", "P3"] },
};

/**
 * Las 20 facturas del corpus. Cada una dice su plantilla, su comercializadora,
 * su peaje, sus consumos y lo que falta a propósito (cups, tarifa o potencia en
 * null) para probar los campos no leídos.
 */
const FACTURAS = [
  { id: "f01", plantilla: "A", comercio: 0, titular: 0, desde: "2026-01-01", hasta: "2026-01-31", peaje: "2.0TD", consumo: [128.4, 96.2, 71.8], potencias: [4.6, 4.6], importe: 62.35 },
  { id: "f02", plantilla: "A", comercio: 1, titular: 1, desde: "2026-02-01", hasta: "2026-02-28", peaje: "2.0TD", consumo: [110.2, 88.7, 64.1], potencias: [5.75, 5.75], importe: 58.9 },
  { id: "f03", plantilla: "B", comercio: 2, titular: 2, desde: "2026-03-01", hasta: "2026-03-31", peaje: "2.0TD", consumo: [142.6, 101.3, 77.5], potencias: [4.6, 5.75], importe: 68.4 },
  { id: "f04", plantilla: "B", comercio: 0, titular: 0, desde: "2026-04-01", hasta: "2026-04-30", peaje: "2.0TD", consumo: [96.0, 82.4, 61.2], potencias: [4.6, 4.6], importe: 54.1 },
  { id: "f05", plantilla: "C", comercio: 3, titular: 1, desde: "2026-05-01", hasta: "2026-05-31", peaje: "3.0TD", consumo: [210.5, 180.3, 150.8, 120.4, 90.2, 60.1], potencias: [15.0, 15.0, 15.0], importe: 245.7 },
  { id: "f06", plantilla: "C", comercio: 4, titular: 2, desde: "2026-06-01", hasta: "2026-06-30", peaje: "2.0TD", consumo: [88.3, 74.6, 58.9], potencias: [4.6, 4.6], importe: 49.85 },
  { id: "f07", plantilla: "D", comercio: 1, titular: 0, desde: "2026-07-01", hasta: "2026-07-31", peaje: "2.0TD", consumo: [154.7, 118.2, 89.4], potencias: [4.6, 5.75], importe: 74.2 },
  { id: "f08", plantilla: "D", comercio: 2, titular: 1, desde: "2026-08-01", hasta: "2026-08-31", peaje: "2.0TD", consumo: [101.5, 90.8, 70.3], potencias: [5.75, 5.75], importe: 57.6 },
  { id: "f09", plantilla: "E", comercio: 4, titular: 2, desde: "2026-09-01", hasta: "2026-09-30", peaje: "2.0TD", consumo: [92.4, 78.1, 60.7], potencias: [4.6, 4.6], importe: 51.3 },
  { id: "f10", plantilla: "A", comercio: 2, titular: 2, desde: "2026-10-01", hasta: "2026-10-31", peaje: "2.0TD", consumo: [84.6, 72.3, 55.8], potencias: [4.6, 4.6], importe: 47.9 },
  { id: "f11", plantilla: "B", comercio: 3, titular: 1, desde: "2026-11-01", hasta: "2026-11-30", peaje: "3.0TD", consumo: [195.8, 165.4, 140.2, 110.9, 85.6, 55.3], potencias: [15.0, 20.0, 20.0], importe: 238.4 },
  { id: "f12", plantilla: "C", comercio: 0, titular: 0, desde: "2026-12-01", hasta: "2026-12-31", peaje: "2.0TD", consumo: [160.2, 125.4, 95.7], potencias: [4.6, 4.6], importe: 78.65 },
  { id: "f13", plantilla: "D", comercio: 1, titular: 1, desde: "2027-01-01", hasta: "2027-01-31", peaje: "2.0TD", consumo: [135.8, 104.6, 80.2], potencias: [4.6, 5.75], importe: 66.95 },
  { id: "f14", plantilla: "E", comercio: 4, titular: 0, desde: "2027-02-01", hasta: "2027-02-28", peaje: "2.0TD", consumo: [118.7, 95.3, 73.1], potencias: [5.75, 5.75], importe: 59.75 },
  { id: "f15", plantilla: "A", comercio: 3, titular: 2, desde: "2027-03-01", hasta: "2027-03-31", peaje: "3.0TD", consumo: [220.1, 190.6, 160.2, 130.8, 95.4, 65.7], potencias: [15.0, 20.0, 20.0], encabezado: { cups: null }, importe: 262.3 },
  { id: "f16", plantilla: "C", comercio: 2, titular: 0, desde: "2027-04-01", hasta: "2027-04-30", peaje: "2.0TD", consumo: [99.2, 81.6, 63.4], potencias: [4.6, 4.6], encabezado: { tarifa: null }, importe: 53.45 },
  { id: "f17", plantilla: "D", comercio: 0, titular: 1, desde: "2027-05-01", hasta: "2027-05-31", peaje: "2.0TD", consumo: [104.3, 86.9, 67.2], potencias: [], encabezado: { potencia: null }, importe: 55.8 },
  { id: "f18", plantilla: "E", comercio: 1, titular: 2, desde: "2027-06-01", hasta: "2027-06-30", peaje: "2.0TD", consumo: [148.9, 112.5, 88.1], potencias: [4.6, 4.6], importe: 1234.56 },
  { id: "f19", plantilla: "B", comercio: 2, titular: 1, desde: "2027-07-01", hasta: "2027-07-31", peaje: "2.0TD", consumo: [131.6, 100.9, 76.3], potencias: [4.6, 5.75], importe: 64.2 },
  { id: "f20", plantilla: "A", comercio: 4, titular: 0, desde: "2027-08-01", hasta: "2027-08-31", peaje: "2.0TD", consumo: [126.5, 98.4, 74.6], potencias: [4.6, 4.6], importe: 61.1 },
];

const CUPS = [
  "ES0021000012345678AB",
  "ES0031400056789012CD",
  "ES0022000034567890EF",
  "ES0015000078901234GH",
  "ES0032000090123456IJ",
];

/** Monta las líneas de una factura según su plantilla. */
function lineas(factura) {
  const plantilla = PLANTILLAS[factura.plantilla];
  const comercio = COMERCIALIZADORAS[factura.comercio];
  const titular = TITULARES[factura.titular];
  const cups = factura.encabezado?.cups === null ? null : CUPS[factura.comercio];
  const tarifa = factura.encabezado?.tarifa === null ? null : factura.peaje;
  const periodos = PERIODOS[factura.peaje];

  const salida = [
    comercio.nombre,
    `NIF: ${comercio.nif}`,
    "Servicio de atención al cliente ficticio",
    "",
    "FACTURA DE LA LUZ",
    "",
    `Titular: ${titular.nombre}`,
    `Dirección de suministro: ${titular.direccion}`,
    "",
  ];

  salida.push(plantilla.comercializadora(comercio.nombre));
  if (cups !== null) salida.push(plantilla.cups(cups));
  salida.push(plantilla.periodo(factura.desde, factura.hasta));
  if (tarifa !== null) salida.push(plantilla.tarifa(tarifa));
  salida.push("");

  salida.push("DETALLE DEL SUMINISTRO");
  if (factura.encabezado?.potencia === null) {
    salida.push("Potencia contratada: consulta el contrato");
  } else {
    for (const [indice, kw] of factura.potencias.entries()) {
      salida.push(plantilla.potencia({ periodo: periodos.potencia[indice], kw }));
    }
  }
  for (const [indice, kwh] of factura.consumo.entries()) {
    salida.push(plantilla.consumo({ periodo: periodos.consumo[indice], kwh }));
  }
  salida.push("");
  salida.push("Término de energía y potencia según contrato.");
  salida.push("Impuestos incluidos.");
  salida.push("");
  salida.push(plantilla.importe(factura.importe));
  salida.push("");
  salida.push("Documento ficticio generado para las pruebas de Letra Grande.");

  return salida;
}

/** Verdad esperada de una factura, en la forma que devuelve el extractor. */
function verdad(factura) {
  const periodos = PERIODOS[factura.peaje];
  return {
    id: factura.id,
    comercializadora: COMERCIALIZADORAS[factura.comercio].nombre,
    cups: factura.encabezado?.cups === null ? null : CUPS[factura.comercio],
    periodo: { desde: factura.desde, hasta: factura.hasta },
    tarifa: factura.encabezado?.tarifa === null ? null : factura.peaje,
    potencia:
      factura.encabezado?.potencia === null
        ? []
        : factura.potencias.map((kw, indice) => ({ periodo: periodos.potencia[indice], kw })),
    consumo: factura.consumo.map((kwh, indice) => ({ periodo: periodos.consumo[indice], kwh })),
    importeTotalEur: factura.importe,
  };
}

mkdirSync(destino, { recursive: true });

const esperado = {};
for (const factura of FACTURAS) {
  writeFileSync(join(destino, `${factura.id}.txt`), `${lineas(factura).join("\n")}\n`, "utf8");
  esperado[factura.id] = verdad(factura);
}
writeFileSync(
  join(destino, "verdad.json"),
  `${JSON.stringify({ facturas: esperado }, null, 2)}\n`,
  "utf8",
);

console.log(`${FACTURAS.length} facturas sintéticas y su verdad en ${destino}`);

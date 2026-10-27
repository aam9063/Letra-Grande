import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  camposParaVault,
  extractInvoiceFields,
  parsearFecha,
  parsearNumero,
  type FacturaLuz,
} from "../src/invoice";

/** Texto mínimo con todos los campos, para probar cada normalización por separado. */
function facturaCompleta(extra = ""): string {
  return [
    "Comercializadora Ficticia S.L.",
    "FACTURA DE LA LUZ",
    "Titular: Persona de Ejemplo",
    "Comercializadora: Comercializadora Ficticia S.L.",
    "CUPS: ES0021000012345678AB",
    "Periodo de facturación: 01/01/2026 a 31/01/2026",
    "Tarifa: 2.0TD",
    "Potencia contratada P1: 4,600 kW",
    "Potencia contratada P2: 4,600 kW",
    "Consumo P1: 128,40 kWh",
    "Consumo P2: 96,20 kWh",
    "Consumo P3: 71,80 kWh",
    "Importe total: 62,35 EUR",
    extra,
  ].join("\n");
}

describe("extractInvoiceFields", () => {
  beforeEach(() => {
    // Cerrojo de red: si la extracción pidiera algo, esto lo haría fallar.
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("red prohibida"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extrae los siete campos de una factura bien formada", () => {
    const factura = extractInvoiceFields(facturaCompleta());

    expect(factura).toEqual({
      comercializadora: "Comercializadora Ficticia S.L.",
      cups: "ES0021000012345678AB",
      periodo: { desde: "2026-01-01", hasta: "2026-01-31" },
      tarifa: "2.0TD",
      potencia: [
        { periodo: "P1", kw: 4.6 },
        { periodo: "P2", kw: 4.6 },
      ],
      consumo: [
        { periodo: "P1", kwh: 128.4 },
        { periodo: "P2", kwh: 96.2 },
        { periodo: "P3", kwh: 71.8 },
      ],
      importeTotalEur: 62.35,
      noLeidos: [],
    });
  });

  it("no hace ninguna petición de red mientras lee la factura", () => {
    extractInvoiceFields(facturaCompleta());

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("reconoce las etiquetas que usan las comercializadoras para cada campo", () => {
    const variantes: [string, Partial<FacturaLuz>][] = [
      ["Comercializadora eléctrica: Otra Luz S.L.", { comercializadora: "Otra Luz S.L." }],
      ["Nombre comercial: Otra Luz S.L.", { comercializadora: "Otra Luz S.L." }],
      ["COMERCIALIZADORA: Otra Luz S.L.", { comercializadora: "Otra Luz S.L." }],
      ["Comercializadora de energía: Otra Luz S.L.", { comercializadora: "Otra Luz S.L." }],
      ["Código CUPS: ES0031400056789012CD", { cups: "ES0031400056789012CD" }],
      ["Punto de suministro (CUPS): ES0031400056789012CD", { cups: "ES0031400056789012CD" }],
      ["Peaje: 3.0TD", { tarifa: "3.0TD" }],
      ["Tarifa de acceso: 3.0TD", { tarifa: "3.0TD" }],
      ["Consumo del periodo P1: 10,50 kWh", { consumo: [{ periodo: "P1", kwh: 10.5 }] }],
      ["Energía consumida P1: 10,50 kWh", { consumo: [{ periodo: "P1", kwh: 10.5 }] }],
    ];

    for (const [texto, esperado] of variantes) {
      expect(extractInvoiceFields(texto), texto).toMatchObject(esperado);
    }
  });

  it("deja el CUPS en mayúsculas y sin espacios ni guiones", () => {
    const conEspacios = extractInvoiceFields("CUPS: es0021 0000 1234 5678 ab");
    const conGuiones = extractInvoiceFields("CUPS: ES-0021-0000-1234-5678-AB");

    expect(conEspacios.cups).toBe("ES0021000012345678AB");
    expect(conGuiones.cups).toBe("ES0021000012345678AB");
    expect(conEspacios.noLeidos).not.toContain("cups");
  });

  it("entiende las tres formas de escribir un importe y lo devuelve como número", () => {
    const casos: [string, number][] = [
      ["Importe total: 1.234,56 EUR", 1234.56],
      ["Importe total: 1234.56 EUR", 1234.56],
      ["Importe total: 62,35 €", 62.35],
      ["Total factura: € 62,35", 62.35],
      ["TOTAL A PAGAR: 62,35 EUR", 62.35],
      ["Importe total de la factura: 245.70 EUR", 245.7],
    ];

    for (const [texto, esperado] of casos) {
      expect(extractInvoiceFields(texto).importeTotalEur, texto).toBe(esperado);
    }
  });

  it("entiende las fechas en los dos formatos y devuelve AAAA-MM-DD", () => {
    const espanolas = extractInvoiceFields("Periodo de facturación: 01/01/2026 a 31/01/2026");
    const iso = extractInvoiceFields("Periodo: 2026-03-01 - 2026-03-31");
    const delAl = extractInvoiceFields("Del 01/05/2026 al 31/05/2026");

    expect(espanolas.periodo).toEqual({ desde: "2026-01-01", hasta: "2026-01-31" });
    expect(iso.periodo).toEqual({ desde: "2026-03-01", hasta: "2026-03-31" });
    expect(delAl.periodo).toEqual({ desde: "2026-05-01", hasta: "2026-05-31" });
  });

  it("no inventa un periodo con una fecha imposible", () => {
    const factura = extractInvoiceFields("Periodo de facturación: 31/02/2026 a 31/03/2026");

    expect(factura.periodo).toBeNull();
    expect(factura.noLeidos).toContain("periodo");
  });

  it("marca como no leído lo que falta y no lo que está", () => {
    const sinCupsNiTarifa = extractInvoiceFields(
      [
        "Comercializadora: Comercializadora Ficticia S.L.",
        "Periodo de facturación: 01/01/2026 a 31/01/2026",
        "Importe total: 62,35 EUR",
      ].join("\n"),
    );

    expect(sinCupsNiTarifa.cups).toBeNull();
    expect(sinCupsNiTarifa.tarifa).toBeNull();
    expect(sinCupsNiTarifa.consumo).toEqual([]);
    expect(sinCupsNiTarifa.potencia).toEqual([]);
    expect([...sinCupsNiTarifa.noLeidos].sort()).toEqual(["consumo", "cups", "potencia", "tarifa"]);
    expect(sinCupsNiTarifa.noLeidos).not.toContain("comercializadora");
    expect(sinCupsNiTarifa.noLeidos).not.toContain("importeTotalEur");
    expect(sinCupsNiTarifa.noLeidos).not.toContain("periodo");
  });

  it("no confunde una línea de potencia sin número con una potencia leída", () => {
    const factura = extractInvoiceFields("Potencia contratada: consulta el contrato");

    expect(factura.potencia).toEqual([]);
    expect(factura.noLeidos).toContain("potencia");
  });

  it("devuelve todo a null y a la lista de no leídos con un texto vacío", () => {
    const factura = extractInvoiceFields("");

    expect(factura.comercializadora).toBeNull();
    expect(factura.cups).toBeNull();
    expect(factura.periodo).toBeNull();
    expect(factura.tarifa).toBeNull();
    expect(factura.potencia).toEqual([]);
    expect(factura.consumo).toEqual([]);
    expect(factura.importeTotalEur).toBeNull();
    expect([...factura.noLeidos].sort()).toEqual([
      "comercializadora",
      "consumo",
      "cups",
      "importeTotalEur",
      "periodo",
      "potencia",
      "tarifa",
    ]);
  });

  it("no inventa campos en un texto que no es una factura", () => {
    const factura = extractInvoiceFields(
      [
        "Estimada persona usuaria:",
        "Le informamos de que su reclamación ha sido registrada con el número 2026/1234.",
        "Recibirá respuesta en el plazo legal.",
        "Atentamente, el servicio de atención.",
      ].join("\n"),
    );

    expect(factura.comercializadora).toBeNull();
    expect(factura.cups).toBeNull();
    expect(factura.periodo).toBeNull();
    expect(factura.tarifa).toBeNull();
    expect(factura.potencia).toEqual([]);
    expect(factura.consumo).toEqual([]);
    expect(factura.importeTotalEur).toBeNull();
    expect(factura.noLeidos).toHaveLength(7);
  });

  it("aguanta un texto muy largo sin romperse", () => {
    const relleno = "Linea de relleno sin datos utiles.\n".repeat(5000);
    const factura = extractInvoiceFields(`${relleno}Importe total: 10,00 EUR\n${relleno}`);

    expect(factura.importeTotalEur).toBe(10);
  });
});

describe("camposParaVault", () => {
  it("aplana una factura completa a valores primitivos con nombres estables", () => {
    const campos = camposParaVault(extractInvoiceFields(facturaCompleta()));

    expect(campos).toEqual({
      comercializadora: "Comercializadora Ficticia S.L.",
      cups: "ES0021000012345678AB",
      periodoDesde: "2026-01-01",
      periodoHasta: "2026-01-31",
      tarifa: "2.0TD",
      potenciaP1Kw: 4.6,
      potenciaP2Kw: 4.6,
      consumoP1Kwh: 128.4,
      consumoP2Kwh: 96.2,
      consumoP3Kwh: 71.8,
      importeTotalEur: 62.35,
      camposNoLeidos: "",
    });
  });

  it("solo incluye lo leído y deja los nombres de lo que falta en camposNoLeidos", () => {
    const campos = camposParaVault(extractInvoiceFields("Importe total: 12,30 EUR"));

    expect(campos.importeTotalEur).toBe(12.3);
    expect(campos).not.toHaveProperty("cups");
    expect(campos).not.toHaveProperty("consumoP1Kwh");
    expect(campos.camposNoLeidos).toBe("comercializadora,cups,periodo,tarifa,potencia,consumo");
  });

  it("solo devuelve tipos que el esquema del vault admite", () => {
    const campos = camposParaVault(extractInvoiceFields(facturaCompleta()));

    for (const [nombre, valor] of Object.entries(campos)) {
      expect(["string", "number", "boolean"], nombre).toContain(typeof valor);
    }
  });
});

describe("parsearNumero", () => {
  it("distingue el separador decimal del de miles", () => {
    expect(parsearNumero("1.234,56")).toBe(1234.56);
    expect(parsearNumero("1,234.56")).toBe(1234.56);
    expect(parsearNumero("1.234")).toBe(1234);
    expect(parsearNumero("4,600")).toBe(4.6);
    expect(parsearNumero("62,35")).toBe(62.35);
    expect(parsearNumero("245.70")).toBe(245.7);
    expect(parsearNumero("10")).toBe(10);
  });

  it("devuelve null cuando no hay un número que leer", () => {
    expect(parsearNumero("")).toBeNull();
    expect(parsearNumero("consulta el contrato")).toBeNull();
    expect(parsearNumero("1,2,3")).toBeNull();
  });
});

describe("parsearFecha", () => {
  it("acepta los dos formatos y devuelve AAAA-MM-DD con dos dígitos", () => {
    expect(parsearFecha("01/01/2026")).toBe("2026-01-01");
    expect(parsearFecha("1/1/2026")).toBe("2026-01-01");
    expect(parsearFecha("2026-2-3")).toBe("2026-02-03");
  });

  it("rechaza una fecha que no existe en vez de desplazarla", () => {
    expect(parsearFecha("31/02/2026")).toBeNull();
    expect(parsearFecha("2026-13-01")).toBeNull();
    expect(parsearFecha("31/02/2026 a 31/03/2026")).toBeNull();
  });
});

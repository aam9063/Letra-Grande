import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { classifyDocument } from "../src/classify";

describe("classifyDocument", () => {
  beforeEach(() => {
    // Cerrojo de red: clasificar no pide nada a nadie.
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("red prohibida"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reconoce los seis tipos del esquema con la evidencia mínima", () => {
    const casos: [string, string][] = [
      ["CUPS: ES0021000012345678AB\nPotencia contratada P1: 4,600 kW", "factura"],
      ["Contrato de alquiler de vivienda.\nDuración: doce meses.", "contrato"],
      ["Ayuntamiento de Villaejemplo\nLe informamos de que su escrito ha sido registrado.", "carta_oficial"],
      ["Boletín de denuncia.\nImporte a ingresar: 90,00 EUR.", "multa"],
      ["Ticket de compra.\nIVA incluido.", "ticket"],
      ["Póliza de hogar.\nPrima anual: 210,00 EUR.", "poliza"],
    ];

    for (const [texto, esperado] of casos) {
      const resultado = classifyDocument(texto);
      expect(resultado.kind, texto).toBe(esperado);
      expect(resultado.signals.length, texto).toBeGreaterThan(0);
    }
  });

  it("no hace ninguna petición de red mientras clasifica", () => {
    classifyDocument("Ticket de compra.\nIVA incluido.");

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("responde otro cuando no hay evidencia suficiente, y sin confianza", () => {
    const resultado = classifyDocument("Atentamente, la dirección.");

    expect(resultado.kind).toBe("otro");
    expect(resultado.confidence).toBe(0);
    expect(resultado.signals).toEqual([]);
  });

  it("responde otro con un texto vacío", () => {
    expect(classifyDocument("")).toEqual({ kind: "otro", confidence: 0, signals: [] });
  });

  it("responde otro cuando dos tipos empatan, en vez de elegir uno", () => {
    const texto = [
      "Ticket de compra.",
      "IVA incluido.",
      "Contrato de servicio.",
      "Cláusulas y condiciones.",
      "Duración: doce meses.",
    ].join("\n");

    expect(classifyDocument(texto).kind).toBe("otro");
  });

  it("no clasifica una multa como carta oficial aunque la firme un ayuntamiento", () => {
    const texto = [
      "Ayuntamiento de Villaejemplo",
      "Boletín de denuncia",
      "Expediente sancionador: SAN-2026-101",
      "Importe a ingresar: 90,00 EUR",
      "Con pago voluntario en 20 días, descuento del 50 %.",
    ].join("\n");

    expect(classifyDocument(texto).kind).toBe("multa");
  });

  it("no clasifica un ticket como factura aunque diga total y esté de una empresa", () => {
    const texto = [
      "Supermercado de Ejemplo S.L.",
      "Ticket de compra",
      "Artículos: 12 unidades",
      "IVA incluido",
      "Total: 24,70 EUR",
      "Pago en efectivo.",
    ].join("\n");

    expect(classifyDocument(texto).kind).toBe("ticket");
  });

  it("da más confianza cuanta más evidencia hay", () => {
    const escasa = classifyDocument("CUPS: ES0021000012345678AB\nPotencia contratada P1: 4,600 kW");
    const completa = classifyDocument(
      [
        "Comercializadora Ficticia de Luz S.L.",
        "FACTURA DE LA LUZ",
        "CUPS: ES0021000012345678AB",
        "Periodo de facturación: 01/01/2026 a 31/01/2026",
        "Potencia contratada P1: 4,600 kW",
        "Consumo P1: 128,40 kWh",
        "Importe total: 62,35 EUR",
      ].join("\n"),
    );

    expect(escasa.kind).toBe("factura");
    expect(completa.kind).toBe("factura");
    expect(completa.confidence).toBeGreaterThan(escasa.confidence);
    expect(escasa.confidence).toBeGreaterThan(0);
    expect(completa.confidence).toBeLessThanOrEqual(100);
  });

  it("devuelve señales legibles como texto, no patrones ni códigos", () => {
    const resultado = classifyDocument(
      "Póliza de mascota.\nPrima anual: 96,00 EUR.\nCoberturas: veterinario.",
    );

    expect(resultado.signals.length).toBeGreaterThan(1);
    for (const senal of resultado.signals) {
      // Texto para leer, no un patrón: nada de barras, pipes ni anclas.
      expect(senal.length).toBeGreaterThan(3);
      expect(senal).not.toMatch(/[\\|/^$]/);
    }
  });

  it("usa señales con paréntesis y texto normal, sin escapar nada", () => {
    const resultado = classifyDocument("CUPS: ES0021000012345678AB\nPotencia contratada P1: 4,600 kW");

    expect(resultado.signals).toContain("punto de suministro (CUPS)");
  });

  it("aguanta un documento muy largo sin romperse", () => {
    const relleno = "Linea de relleno sin datos utiles.\n".repeat(5000);
    const resultado = classifyDocument(`${relleno}Ticket de compra\nTotal: 4,00 EUR\n${relleno}`);

    expect(resultado.kind).toBe("ticket");
  });
});

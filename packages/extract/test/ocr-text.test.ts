import { describe, expect, it } from "vitest";
import { construirResultadoOcr, normalizarTextoOcr } from "../src/ocr-text";

describe("normalizarTextoOcr", () => {
  it("deja una línea por línea, sin espacios sobrantes en los extremos", () => {
    const crudo = "  Factura de luz  \n  Periodo: enero  \n";

    expect(normalizarTextoOcr(crudo)).toBe("Factura de luz\nPeriodo: enero");
  });

  it("junta los espacios de dentro de una línea en uno solo", () => {
    expect(normalizarTextoOcr("Importe    total:\t42,50 EUR")).toBe("Importe total: 42,50 EUR");
  });

  it("descarta las líneas vacías que deja el OCR entre bloques", () => {
    const crudo = "\n\nPrimera\n\n\n\nSegunda\n   \nTercera\n\n";

    expect(normalizarTextoOcr(crudo)).toBe("Primera\nSegunda\nTercera");
  });

  it("entiende los saltos de línea de Windows y los de Mac antiguo", () => {
    expect(normalizarTextoOcr("uno\r\ndos\rtres")).toBe("uno\ndos\ntres");
  });

  it("devuelve cadena vacía cuando no hay nada que leer", () => {
    expect(normalizarTextoOcr("")).toBe("");
    expect(normalizarTextoOcr("   \n\t\n \r\n")).toBe("");
  });
});

describe("construirResultadoOcr", () => {
  it("devuelve el texto normalizado y la confianza redondeada", () => {
    const resultado = construirResultadoOcr("  Hola   mundo \n\n", 87.6);

    expect(resultado).toEqual({ text: "Hola mundo", confidence: 88, hasText: true });
  });

  it("declara que no ha leído nada cuando el texto queda vacío", () => {
    const resultado = construirResultadoOcr(" \n\n\t ", 0);

    expect(resultado).toEqual({ text: "", confidence: 0, hasText: false });
  });

  it("acota la confianza al rango de 0 a 100 y aguanta una confianza imposible", () => {
    expect(construirResultadoOcr("algo", 140).confidence).toBe(100);
    expect(construirResultadoOcr("algo", -3).confidence).toBe(0);
    expect(construirResultadoOcr("algo", Number.NaN).confidence).toBe(0);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractPdfText } from "../src/index";

const dirFixtures = join(import.meta.dirname, "..", "fixtures");

/** Lee un fixture como bytes, igual que haría quien sube el documento. */
function fixture(nombre: string): Uint8Array {
  return new Uint8Array(readFileSync(join(dirFixtures, nombre)));
}

describe("extractPdfText", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extrae el texto conocido de la factura sintética, página a página", async () => {
    const resultado = await extractPdfText(fixture("factura-sintetica.pdf"));

    expect(resultado.hasTextLayer).toBe(true);
    expect(resultado.pageCount).toBe(3);
    expect(resultado.pages).toHaveLength(3);
    expect(resultado.pages[0]).toContain("Comercializadora Ficticia S.L.");
    expect(resultado.pages[0]).toContain("Importe total: 42,50 EUR");
    expect(resultado.pages[0]).toContain("Periodo de consumo: enero de 2026");
    expect(resultado.text).toContain("Consumo estimado: 100 kWh");
    expect(resultado.text).toContain("Pagina 3: condiciones de ejemplo");
  });

  it("declara hasTextLayer false y texto vacío en un PDF sin capa de texto", async () => {
    const resultado = await extractPdfText(fixture("escaneado-sintetico.pdf"));

    expect(resultado.hasTextLayer).toBe(false);
    expect(resultado.text).toBe("");
    expect(resultado.pages).toEqual([""]);
    expect(resultado.pageCount).toBe(1);
  });

  it("rechaza con un error claro en español ante un buffer corrupto", async () => {
    const basura = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 1, 2, 3, 4, 5]);

    await expect(extractPdfText(basura)).rejects.toThrow(
      /No se ha podido leer el PDF: el archivo parece corrupto o no es un PDF válido\./,
    );
  });

  it("no hace ninguna llamada de red durante la extracción", async () => {
    await extractPdfText(fixture("factura-sintetica.pdf"));
    await extractPdfText(fixture("escaneado-sintetico.pdf"));

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("maxPages trunca la lectura de paginas", async () => {
    const resultado = await extractPdfText(fixture("factura-sintetica.pdf"), { maxPages: 2 });

    expect(resultado.pages).toHaveLength(2);
    expect(resultado.pageCount).toBe(3);
    expect(resultado.text).not.toContain("Pagina 3");
    expect(resultado.text).toContain("Importe total: 42,50 EUR");
  });

  it("rechaza un maxPages que no sea un entero mayor que cero", async () => {
    await expect(extractPdfText(fixture("factura-sintetica.pdf"), { maxPages: 0 })).rejects.toThrow(
      /maxPages/,
    );
  });
});

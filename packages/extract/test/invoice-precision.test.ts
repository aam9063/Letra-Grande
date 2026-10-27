import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractInvoiceFields } from "../src/invoice";

const dirFacturas = join(import.meta.dirname, "..", "fixtures", "facturas");

/** Campos que el extractor tiene que sacar (S1). */
const CAMPOS = [
  "comercializadora",
  "cups",
  "periodo",
  "tarifa",
  "potencia",
  "consumo",
  "importeTotalEur",
] as const;

interface VerdadFactura {
  id: string;
  comercializadora: string | null;
  cups: string | null;
  periodo: { desde: string; hasta: string } | null;
  tarifa: string | null;
  potencia: { periodo: string; kw: number }[];
  consumo: { periodo: string; kwh: number }[];
  importeTotalEur: number | null;
}

const verdad = JSON.parse(readFileSync(join(dirFacturas, "verdad.json"), "utf8")) as {
  facturas: Record<string, VerdadFactura>;
};

/** Compara valores del extractor con la verdad: objetos y listas, sin ordenar. */
function igual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function texto(id: string): string {
  return readFileSync(join(dirFacturas, `${id}.txt`), "utf8");
}

interface Resultado {
  id: string;
  campo: (typeof CAMPOS)[number];
  esperado: unknown;
  obtenido: unknown;
  acierto: boolean;
}

const resultados: Resultado[] = Object.values(verdad.facturas).flatMap((esperada) => {
  const obtenida = extractInvoiceFields(texto(esperada.id));
  return CAMPOS.map((campo) => ({
    id: esperada.id,
    campo,
    esperado: esperada[campo],
    obtenido: obtenida[campo],
    acierto: igual(esperada[campo], obtenida[campo]),
  }));
});

function resumenDeFallos(fallos: Resultado[]): string {
  return fallos
    .map(
      (fallo) =>
        `${fallo.id} ${fallo.campo}: esperado ${JSON.stringify(fallo.esperado)}, obtenido ${JSON.stringify(fallo.obtenido)}`,
    )
    .join("\n");
}

describe("corpus sintético de facturas", () => {
  beforeEach(() => {
    // Cerrojo de red: la extracción sobre el corpus entero no pide nada.
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("red prohibida"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("es exactamente el que genera el script, sin ediciones a mano", () => {
    const destino = mkdtempSync(join(tmpdir(), "letra-grande-facturas-"));
    try {
      execFileSync(
        process.execPath,
        [join(import.meta.dirname, "..", "scripts", "make-invoice-fixtures.mjs"), destino],
        { stdio: "pipe" },
      );

      const generados = readdirSync(destino).sort();
      const versionados = readdirSync(dirFacturas).sort();
      expect(generados).toEqual(versionados);
      for (const nombre of versionados) {
        expect(readFileSync(join(destino, nombre), "utf8"), nombre).toBe(
          readFileSync(join(dirFacturas, nombre), "utf8"),
        );
      }
    } finally {
      rmSync(destino, { recursive: true, force: true });
    }
  });

  it("tiene 20 facturas con su verdad esperada", () => {
    const ficheros = readdirSync(dirFacturas).filter((nombre) => nombre.endsWith(".txt"));
    const ids = Object.keys(verdad.facturas);

    expect(ficheros).toHaveLength(20);
    expect(ids).toHaveLength(20);
    for (const id of ids) {
      expect(ficheros, id).toContain(`${id}.txt`);
    }
  });

  it("ninguna factura del corpus contiene datos personales reales ni orígenes de red", () => {
    for (const id of Object.keys(verdad.facturas)) {
      const contenido = texto(id);
      expect(contenido, id).not.toMatch(/https?:\/\//);
      // Los CUPS del corpus son inventados: el prefijo ES0021 y compañía son
      // sintaxis válida, no un punto de suministro real.
      expect(contenido, id).toContain("Persona de Ejemplo");
    }
  });
});

describe("precisión del extractor sobre el corpus", () => {
  it("acierta más del 90 % de los campos de las 20 facturas (S2)", () => {
    const fallos = resultados.filter((resultado) => !resultado.acierto);
    const precision = (resultados.length - fallos.length) / resultados.length;

    expect(
      precision,
      `${fallos.length} de ${resultados.length} campos mal:\n${resumenDeFallos(fallos)}`,
    ).toBeGreaterThan(0.9);
  });

  it("no inventa ningún valor donde la factura no lo trae (S4, S6)", () => {
    const inventados = resultados.filter(
      (resultado) =>
        (resultado.esperado === null || igual(resultado.esperado, [])) &&
        !(resultado.obtenido === null || igual(resultado.obtenido, [])),
    );

    expect(inventados, resumenDeFallos(inventados)).toEqual([]);
  });

  it("declara como no leído exactamente lo que no ha podido leer (S4)", () => {
    const incoherencias: string[] = [];

    for (const esperada of Object.values(verdad.facturas)) {
      const factura = extractInvoiceFields(texto(esperada.id));
      const sinLeer = CAMPOS.filter((campo) => {
        const valor = esperada[campo];
        return valor === null || igual(valor, []);
      });

      for (const campo of CAMPOS) {
        const declarado = factura.noLeidos.includes(campo);
        const deberiaEstarlo = sinLeer.includes(campo);
        if (declarado !== deberiaEstarlo) {
          incoherencias.push(
            `${esperada.id} ${campo}: noLeidos ${declarado ? "sí" : "no"} lo declara, y ${deberiaEstarlo ? "debería" : "no debería"}`,
          );
        }
      }
    }

    expect(incoherencias, incoherencias.join("\n")).toEqual([]);
  });
});

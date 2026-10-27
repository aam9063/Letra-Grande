import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyDocument } from "../src/classify";

const dirDocumentos = join(import.meta.dirname, "..", "fixtures", "documentos");

const verdad = JSON.parse(readFileSync(join(dirDocumentos, "verdad.json"), "utf8")) as {
  documentos: Record<string, string>;
};

function texto(id: string): string {
  return readFileSync(join(dirDocumentos, `${id}.txt`), "utf8");
}

interface Resultado {
  id: string;
  esperado: string;
  obtenido: string;
  confianza: number;
}

const resultados: Resultado[] = Object.entries(verdad.documentos).map(([id, esperado]) => {
  const clasificacion = classifyDocument(texto(id));
  return { id, esperado, obtenido: clasificacion.kind, confianza: clasificacion.confidence };
});

describe("conjunto sintético de documentos", () => {
  it("tiene seis documentos de cada tipo y su verdad esperada", () => {
    const ficheros = readdirSync(dirDocumentos).filter((nombre) => nombre.endsWith(".txt"));
    const porTipo = new Map<string, number>();
    for (const tipo of Object.values(verdad.documentos)) {
      porTipo.set(tipo, (porTipo.get(tipo) ?? 0) + 1);
    }

    expect(ficheros).toHaveLength(36);
    expect(Object.keys(verdad.documentos)).toHaveLength(36);
    expect([...porTipo.keys()].sort()).toEqual([
      "carta_oficial",
      "contrato",
      "factura",
      "multa",
      "poliza",
      "ticket",
    ]);
    for (const [tipo, cuantos] of porTipo) {
      expect(cuantos, tipo).toBe(6);
    }
  });

  it("es exactamente el que genera el script, sin ediciones a mano", () => {
    const destino = mkdtempSync(join(tmpdir(), "letra-grande-documentos-"));
    try {
      execFileSync(
        process.execPath,
        [join(import.meta.dirname, "..", "scripts", "make-document-fixtures.mjs"), destino],
        { stdio: "pipe" },
      );

      const generados = readdirSync(destino).sort();
      const versionados = readdirSync(dirDocumentos).sort();
      expect(generados).toEqual(versionados);
      for (const nombre of versionados) {
        expect(readFileSync(join(destino, nombre), "utf8"), nombre).toBe(
          readFileSync(join(dirDocumentos, nombre), "utf8"),
        );
      }
    } finally {
      rmSync(destino, { recursive: true, force: true });
    }
  });

  it("no contiene direcciones web ni datos personales reales", () => {
    for (const id of Object.keys(verdad.documentos)) {
      expect(texto(id), id).not.toMatch(/https?:\/\//);
      expect(texto(id), id).toMatch(/ejemplo|fictici|imagin|invent/i);
    }
  });
});

describe("precisión del clasificador sobre el conjunto", () => {
  it("acierta más del 85 % de los documentos (S2)", () => {
    const fallos = resultados.filter((resultado) => resultado.esperado !== resultado.obtenido);
    const precision = (resultados.length - fallos.length) / resultados.length;
    const detalle = fallos
      .map((fallo) => `${fallo.id}: esperado ${fallo.esperado}, obtenido ${fallo.obtenido}`)
      .join("\n");

    expect(
      precision,
      `${fallos.length} de ${resultados.length} documentos mal:\n${detalle}`,
    ).toBeGreaterThan(0.85);
  });

  it("cuando acierta, lo hace con confianza y sin quedarse en otro (S5)", () => {
    const acertados = resultados.filter((resultado) => resultado.esperado === resultado.obtenido);

    expect(acertados.length).toBeGreaterThan(0);
    for (const acertado of acertados) {
      expect(acertado.obtenido, acertado.id).not.toBe("otro");
      expect(acertado.confianza, acertado.id).toBeGreaterThan(0);
      expect(acertado.confianza, acertado.id).toBeLessThanOrEqual(100);
    }
  });
});

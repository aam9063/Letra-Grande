import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OCR_ASSETS,
  OCR_ASSET_DIR,
  OCR_BASE_PATH,
  LANG_POR_DEFECTO,
  resolveOcrAssets,
} from "../src/ocr-assets";

const dirActivos = join(import.meta.dirname, "..", OCR_ASSET_DIR);

function rutaDe(nombre: string): string {
  return join(dirActivos, nombre);
}

function tamanoDe(nombre: string): number {
  return statSync(rutaDe(nombre)).size;
}

describe("resolveOcrAssets", () => {
  it("sirve el worker, el núcleo y el modelo desde la base propia, con barra final en las carpetas", () => {
    const activos = resolveOcrAssets();

    expect(OCR_BASE_PATH).toBe("/ocr");
    expect(activos.workerPath).toBe(`/ocr/${OCR_ASSETS.worker}`);
    expect(activos.corePath).toBe("/ocr/");
    expect(activos.langPath).toBe("/ocr/");
  });

  it("no devuelve ninguna ruta con origen ajeno", () => {
    const activos = resolveOcrAssets("/ocr");

    for (const ruta of Object.values(activos)) {
      expect(ruta).not.toMatch(/^[a-z]+:/i);
      expect(ruta.startsWith("/")).toBe(true);
    }
  });

  it("normaliza una base con barras de más y sin barra inicial", () => {
    expect(resolveOcrAssets("/recursos/ocr/")).toMatchObject({
      workerPath: "/recursos/ocr/worker.min.js",
      corePath: "/recursos/ocr/",
      langPath: "/recursos/ocr/",
    });
    expect(resolveOcrAssets("recursos/ocr")).toMatchObject({
      workerPath: "/recursos/ocr/worker.min.js",
    });
  });

  it("rechaza una base con origen, que reintroduciría un CDN", () => {
    expect(() => resolveOcrAssets("https://cdn.jsdelivr.net/npm/tesseract.js")).toThrow(
      /propio origen/,
    );
    expect(() => resolveOcrAssets("//cdn.jsdelivr.net/npm/tesseract.js")).toThrow(/propio origen/);
  });

  it("rechaza una base vacía o que solo tiene barras", () => {
    expect(() => resolveOcrAssets("")).toThrow(/base/);
    expect(() => resolveOcrAssets("///")).toThrow(/base/);
  });
});

describe("activos versionados", () => {
  it("están los ficheros que el código pide, con el modelo de español por defecto", () => {
    const esperados = [
      OCR_ASSETS.worker,
      ...OCR_ASSETS.cores,
      OCR_ASSETS.languageData(LANG_POR_DEFECTO),
    ];

    expect(LANG_POR_DEFECTO).toBe("spa");
    for (const nombre of esperados) {
      expect(() => tamanoDe(nombre)).not.toThrow();
    }
  });

  it("el núcleo incluye las tres variantes que el worker puede pedir, para no depender de un CDN", () => {
    expect([...OCR_ASSETS.cores].sort()).toEqual([
      "tesseract-core-lstm.wasm.js",
      "tesseract-core-relaxedsimd-lstm.wasm.js",
      "tesseract-core-simd-lstm.wasm.js",
    ]);
  });

  it("el modelo de español es el de verdad y no un fichero vacío ni una página de error", () => {
    // El modelo `best` de español ronda los 13 MB: si baja de 5 MB es que la
    // descarga trajo otra cosa (un 404 en HTML, por ejemplo).
    expect(tamanoDe(OCR_ASSETS.languageData(LANG_POR_DEFECTO))).toBeGreaterThan(5 * 1024 * 1024);
  });

  it("el worker y los núcleos tienen el peso de un script wasm real", () => {
    expect(tamanoDe(OCR_ASSETS.worker)).toBeGreaterThan(10 * 1024);
    for (const core of OCR_ASSETS.cores) {
      expect(tamanoDe(core)).toBeGreaterThan(1 * 1024 * 1024);
    }
  });

  it("cada activo binario tiene su licencia al lado", () => {
    const ficheros = readdirSync(dirActivos);

    expect(ficheros).toContain("LICENSE-tesseract.js.txt");
    expect(ficheros).toContain("LICENSE-tesseract.js-core.txt");
    expect(ficheros).toContain("LICENSE-tessdata.txt");
  });
});

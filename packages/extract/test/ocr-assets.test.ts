import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LANG_POR_DEFECTO,
  OCR_ASSETS,
  OCR_ASSET_DIR,
  OCR_BASE_PATH,
  resolveOcrAssets,
} from "../src/ocr-assets";

const dirActivos = join(import.meta.dirname, "..", OCR_ASSET_DIR);

interface FichaActivo {
  name: string;
  bytes: number;
  sha256: string;
  origin: string;
  license: string;
}

const manifiesto = JSON.parse(
  readFileSync(join(dirActivos, "manifest.json"), "utf8"),
) as { files: FichaActivo[] };

function tamanoDe(nombre: string): number {
  return statSync(join(dirActivos, nombre)).size;
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
  it("cada fichero coincide byte a byte con el manifiesto", () => {
    for (const ficha of manifiesto.files) {
      const datos = readFileSync(join(dirActivos, ficha.name));

      expect(datos.length, ficha.name).toBe(ficha.bytes);
      expect(createHash("sha256").update(datos).digest("hex"), ficha.name).toBe(ficha.sha256);
    }
  });

  it("el código pide ficheros que el manifiesto versiona", () => {
    const versionados = new Set(manifiesto.files.map((ficha) => ficha.name));
    const quePideElCodigo = [
      OCR_ASSETS.worker,
      ...OCR_ASSETS.cores,
      OCR_ASSETS.languageData(LANG_POR_DEFECTO),
    ];

    expect(LANG_POR_DEFECTO).toBe("spa");
    for (const nombre of quePideElCodigo) {
      expect(versionados.has(nombre), nombre).toBe(true);
    }
  });

  it("el núcleo incluye las tres variantes que el worker puede pedir, para no depender de un CDN", () => {
    expect([...OCR_ASSETS.cores].sort()).toEqual([
      "tesseract-core-lstm.wasm.js",
      "tesseract-core-relaxedsimd-lstm.wasm.js",
      "tesseract-core-simd-lstm.wasm.js",
    ]);
  });

  it("cada activo declara su origen y su licencia Apache-2.0, y las licencias están al lado", () => {
    for (const ficha of manifiesto.files) {
      expect(ficha.license, ficha.name).toBe("Apache-2.0");
      expect(ficha.origin.length, ficha.name).toBeGreaterThan(10);
    }

    const ficheros = readdirSync(dirActivos);
    expect(ficheros).toContain("LICENSE-tesseract.js.txt");
    expect(ficheros).toContain("LICENSE-tesseract.js-core.txt");
    expect(ficheros).toContain("LICENSE-tessdata.txt");
  });

  it("el modelo de español es el modelo, no una página de error con otro nombre", () => {
    // El sha256 ya lo fija, pero este umbral explica el fallo si algún día se
    // sustituye: el `best` de español ronda los 13 MB y el `fast`, 2 MB.
    expect(tamanoDe(OCR_ASSETS.languageData(LANG_POR_DEFECTO))).toBeGreaterThan(5 * 1024 * 1024);
  });
});

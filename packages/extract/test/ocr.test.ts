import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cargarTesseractPorDefecto,
  crearSesionOcr,
  type OcrWorkerLike,
  type TesseractLike,
} from "../src/ocr";

interface Reconocimiento {
  text: string;
  confidence: number;
}

/** Worker falso: apunta lo que le piden y devuelve lo que diga la prueba. */
function workerFalso(reconocer: (imagen: unknown) => Reconocimiento) {
  return {
    recognize: vi.fn(async (imagen: unknown) => ({ data: reconocer(imagen) })),
    terminate: vi.fn(async () => undefined),
  } satisfies OcrWorkerLike;
}

/** Cargador falso de tesseract.js: cuenta llamadas y devuelve el worker que toque. */
function cargadorFalso(worker: OcrWorkerLike) {
  const createWorker = vi.fn(async () => worker);
  const cargar = vi.fn(async (): Promise<TesseractLike> => ({ createWorker }));
  return { cargar, createWorker };
}

describe("extractImageText", () => {
  beforeEach(() => {
    // Cerrojo de red: si el OCR intentara bajar algo, aquí fallaría en vez de salir.
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("red prohibida"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("no carga tesseract hasta que hay una foto que leer", async () => {
    const worker = workerFalso(() => ({ text: "Factura", confidence: 90 }));
    const { cargar } = cargadorFalso(worker);
    const sesion = crearSesionOcr(cargar);

    expect(cargar).not.toHaveBeenCalled();

    await sesion.extract(new Blob(["foto"]));

    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it("reutiliza el worker y su modelo entre fotos: la descarga y la caché ocurren una sola vez", async () => {
    const worker = workerFalso(() => ({ text: "Linea", confidence: 80 }));
    const { cargar, createWorker } = cargadorFalso(worker);
    const sesion = crearSesionOcr(cargar);

    await sesion.extract(new Blob(["uno"]));
    await sesion.extract(new Blob(["dos"]));
    await sesion.extract(new Blob(["tres"]));

    expect(cargar).toHaveBeenCalledTimes(1);
    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(worker.recognize).toHaveBeenCalledTimes(3);
  });

  it("configura las tres rutas en nuestro propio origen y no desactiva la caché del modelo", async () => {
    const worker = workerFalso(() => ({ text: "Factura", confidence: 90 }));
    const { cargar, createWorker } = cargadorFalso(worker);
    const sesion = crearSesionOcr(cargar);

    await sesion.extract(new Blob(["foto"]));

    expect(createWorker).toHaveBeenCalledTimes(1);
    const [lang, , opciones] = createWorker.mock.calls[0] as unknown as [
      string,
      number | undefined,
      Record<string, unknown>,
    ];

    expect(lang).toBe("spa");
    expect(opciones).toMatchObject({
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr/",
      langPath: "/ocr/",
      // Sin blob: el worker se carga desde una ruta propia y la CSP no necesita blob:.
      workerBlobURL: false,
      gzip: false,
    });
    expect(opciones.cacheMethod).not.toBe("none");
    expect(opciones.cacheMethod).not.toBe("refresh");
    for (const clave of ["workerPath", "corePath", "langPath"] as const) {
      expect(String(opciones[clave])).not.toMatch(/^[a-z]+:/i);
    }
  });

  it("devuelve el texto normalizado, la confianza y la marca de que sí ha leído", async () => {
    const worker = workerFalso(() => ({ text: "  Importe   total \n\n 42,50 EUR ", confidence: 91.4 }));
    const sesion = crearSesionOcr(cargadorFalso(worker).cargar);

    const resultado = await sesion.extract(new Blob(["foto"]));

    expect(resultado).toEqual({
      text: "Importe total\n42,50 EUR",
      confidence: 91,
      hasText: true,
    });
  });

  it("declara que no ha leído nada cuando el OCR no encuentra texto", async () => {
    const worker = workerFalso(() => ({ text: "   \n\n ", confidence: 0 }));
    const sesion = crearSesionOcr(cargadorFalso(worker).cargar);

    const resultado = await sesion.extract(new Blob(["foto"]));

    expect(resultado.hasText).toBe(false);
    expect(resultado.text).toBe("");
    expect(resultado.confidence).toBe(0);
  });

  it("no hace ninguna petición de red mientras orquesta el OCR", async () => {
    const worker = workerFalso(() => ({ text: "Factura", confidence: 90 }));
    const sesion = crearSesionOcr(cargadorFalso(worker).cargar);

    await sesion.extract(new Blob(["foto"]));

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rechaza una petición con un idioma o una base distintos: cambia de worker y no mezcla modelos", async () => {
    const primero = workerFalso(() => ({ text: "uno", confidence: 70 }));
    const segundo = workerFalso(() => ({ text: "dos", confidence: 70 }));
    const createWorker = vi
      .fn<() => Promise<OcrWorkerLike>>()
      .mockResolvedValueOnce(primero)
      .mockResolvedValueOnce(segundo);
    const sesion = crearSesionOcr(async () => ({ createWorker }));

    await sesion.extract(new Blob(["foto"]), { lang: "spa" });
    await sesion.extract(new Blob(["foto"]), { lang: "eng" });

    expect(primero.terminate).toHaveBeenCalledTimes(1);
    expect(createWorker).toHaveBeenCalledTimes(2);
    expect(segundo.recognize).toHaveBeenCalledTimes(1);
  });

  it("acepta una base propia distinta, para servir los activos donde decida la app", async () => {
    const worker = workerFalso(() => ({ text: "Factura", confidence: 90 }));
    const { cargar, createWorker } = cargadorFalso(worker);
    const sesion = crearSesionOcr(cargar);

    await sesion.extract(new Blob(["foto"]), { basePath: "/recursos/ocr/" });

    const [, , opciones] = createWorker.mock.calls[0] as unknown as [
      string,
      number | undefined,
      Record<string, unknown>,
    ];
    expect(opciones.workerPath).toBe("/recursos/ocr/worker.min.js");
    expect(opciones.langPath).toBe("/recursos/ocr/");
  });

  it("ante un fallo al arrancar el OCR, lo dice en español con la causa y no se queda roto", async () => {
    const causa = new Error("importScripts falló");
    const worker = workerFalso(() => ({ text: "Factura", confidence: 90 }));
    const createWorker = vi
      .fn<() => Promise<OcrWorkerLike>>()
      .mockRejectedValueOnce(causa)
      .mockResolvedValueOnce(worker);
    const sesion = crearSesionOcr(async () => ({ createWorker }));

    await expect(sesion.extract(new Blob(["foto"]))).rejects.toThrow(/OCR/);

    // El fallo no se queda cacheado: la foto siguiente reintenta y arranca.
    const resultado = await sesion.extract(new Blob(["foto"]));

    expect(resultado.hasText).toBe(true);
    expect(createWorker).toHaveBeenCalledTimes(2);
  });

  it("ante un fallo al leer la foto, lo dice en español y conserva la causa", async () => {
    const causa = new Error("imagen ilegible");
    const worker = {
      recognize: vi.fn(async () => {
        throw causa;
      }),
      terminate: vi.fn(async () => undefined),
    } satisfies OcrWorkerLike;
    const sesion = crearSesionOcr(cargadorFalso(worker).cargar);

    await expect(sesion.extract(new Blob(["foto"]))).rejects.toThrow(
      /No se ha podido leer el texto de la imagen\./,
    );
    await expect(sesion.extract(new Blob(["foto"]))).rejects.toMatchObject({ cause: causa });
  });

  it("release termina el worker y la siguiente foto arranca uno nuevo", async () => {
    const primero = workerFalso(() => ({ text: "uno", confidence: 70 }));
    const segundo = workerFalso(() => ({ text: "dos", confidence: 70 }));
    const createWorker = vi
      .fn<() => Promise<OcrWorkerLike>>()
      .mockResolvedValueOnce(primero)
      .mockResolvedValueOnce(segundo);
    const sesion = crearSesionOcr(async () => ({ createWorker }));

    await sesion.extract(new Blob(["foto"]));
    await sesion.release();

    expect(primero.terminate).toHaveBeenCalledTimes(1);

    await sesion.extract(new Blob(["foto"]));
    expect(createWorker).toHaveBeenCalledTimes(2);
  });

  it("release sin worker no hace nada y no revienta", async () => {
    const { cargar } = cargadorFalso(workerFalso(() => ({ text: "", confidence: 0 })));
    const sesion = crearSesionOcr(cargar);

    await expect(sesion.release()).resolves.toBeUndefined();
    expect(cargar).not.toHaveBeenCalled();
  });
});

describe("cargarTesseractPorDefecto", () => {
  it("trae createWorker de tesseract.js sin que se rompa el envoltorio CommonJS", async () => {
    const modulo = await cargarTesseractPorDefecto();

    expect(typeof modulo.createWorker).toBe("function");
  });
});

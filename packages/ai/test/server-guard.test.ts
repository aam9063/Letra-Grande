// Guarda de contexto de servidor: el paquete nunca debe cargar en el navegador (R1).
import { describe, expect, it } from "vitest";
import { assertServerContext, esContextoNavegador } from "../src/server-guard.js";

describe("assertServerContext", () => {
  it("lanza un error claro en un contexto de navegador simulado", () => {
    expect(() => assertServerContext(() => true)).toThrow(/solo de servidor/);
    expect(() => assertServerContext(() => true)).toThrow(/navegador/);
  });

  it("no lanza en un contexto de servidor", () => {
    expect(() => assertServerContext(() => false)).not.toThrow();
  });

  it("detecta navegador por la presencia de window en globalThis", () => {
    // En Node no hay window: la detección por defecto da false.
    expect(esContextoNavegador()).toBe(false);
    expect(() => assertServerContext()).not.toThrow();
  });

  it("el punto de entrada del paquete se carga en un contexto de servidor", async () => {
    await expect(import("../src/index.js")).resolves.toBeTruthy();
  });
});

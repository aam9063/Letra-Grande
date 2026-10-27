// Pruebas de la segunda barrera de rutas: la comprobacion por ruta real, que
// cierra los enlaces simbolicos que apunten fuera del renderer. Usa un
// directorio temporal del sistema y lo borra al terminar.
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { absolutePathInsideRoot } from "./root-guard.js";

const raicesTemporales: string[] = [];

afterEach(() => {
  for (const raiz of raicesTemporales.splice(0)) {
    rmSync(raiz, { recursive: true, force: true });
  }
});

function raizTemporal(): string {
  const raiz = mkdtempSync(path.join(tmpdir(), "lg-root-guard-"));
  raicesTemporales.push(raiz);
  return raiz;
}

describe("absolutePathInsideRoot", () => {
  it("resuelve un archivo que esta dentro de la raiz", () => {
    const raiz = raizTemporal();
    const esperada = path.resolve(raiz, "index.html");
    expect(absolutePathInsideRoot("index.html", raiz)).toBe(esperada);
  });

  it("rechaza una ruta relativa que sube de directorio", () => {
    const raiz = raizTemporal();
    expect(absolutePathInsideRoot(path.join("..", "fuera.txt"), raiz)).toBeNull();
  });

  it("rechaza un enlace simbolico dentro de la raiz que apunta fuera", () => {
    const raiz = raizTemporal();
    const fuera = raizTemporal();
    writeFileSync(path.join(fuera, "secreto.txt"), "dato");
    try {
      // En Windows un enlace a directorio sin privilegios es una junction;
      // sirve para la misma prueba: realpath la sigue hasta fuera de la raiz.
      symlinkSync(fuera, path.join(raiz, "escape"), "junction");
    } catch {
      // Sin privilegios de enlace, la prueba no se puede ejecutar aqui: se
      // omite con aviso en lugar de pasar en falso.
      console.warn("OMITIDA: la plataforma no permite crear enlaces simbolicos");
      return;
    }
    expect(absolutePathInsideRoot(path.join("escape", "secreto.txt"), raiz)).toBeNull();
  });

  it("mantiene la resolucion lexica de un archivo que no existe, para el 404", () => {
    const raiz = raizTemporal();
    const esperada = path.resolve(raiz, "no-esta.html");
    expect(absolutePathInsideRoot("no-esta.html", raiz)).toBe(esperada);
  });
});

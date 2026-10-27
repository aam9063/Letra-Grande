// Pruebas de la resolucion de la raiz del renderer estatico (DESK-03). La
// logica es pura: en desarrollo apunta a la exportacion del repositorio y en
// la app instalada a los recursos que produce electron-builder.
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PACKAGED_RENDERER_DIRNAME,
  rendererRootError,
  resolveRendererRoot,
} from "./renderer-root.js";

describe("resolveRendererRoot", () => {
  it("en desarrollo apunta a apps/web/dist-desktop del repositorio", () => {
    const appPath = path.resolve("repo", "apps", "desktop");
    const raiz = resolveRendererRoot({
      isPackaged: false,
      resourcesPath: path.resolve(appPath, "no-debe-usarse"),
      appPath,
    });
    expect(raiz).toBe(path.resolve(appPath, "..", "web", "dist-desktop"));
  });

  it("en la app instalada apunta al directorio fijo de extraResources", () => {
    const resourcesPath = path.resolve("instalacion", "resources");
    const raiz = resolveRendererRoot({
      isPackaged: true,
      resourcesPath,
      appPath: path.resolve(resourcesPath, "app"),
    });
    expect(raiz).toBe(path.resolve(resourcesPath, PACKAGED_RENDERER_DIRNAME));
  });

  it("usa la misma carpeta fija sea cual sea la ruta de instalacion", () => {
    const primera = resolveRendererRoot({
      isPackaged: true,
      resourcesPath: path.resolve("C:", "App", "Letra Grande", "resources"),
      appPath: "irrelevante",
    });
    const segunda = resolveRendererRoot({
      isPackaged: true,
      resourcesPath: path.resolve("D:", "otro", "sitio", "resources"),
      appPath: "irrelevante",
    });
    expect(path.basename(primera)).toBe(path.basename(segunda));
  });
});

describe("rendererRootError", () => {
  it("devuelve null cuando el directorio del renderer existe", () => {
    const raiz = path.resolve("con", "renderer");
    expect(rendererRootError(raiz, true)).toBeNull();
  });

  it("con el directorio ausente devuelve un mensaje claro con la ruta", () => {
    const raiz = path.resolve("sin", "renderer");
    const mensaje = rendererRootError(raiz, false);
    expect(mensaje).not.toBeNull();
    expect(mensaje).toContain(raiz);
    expect(mensaje).toContain("build:desktop");
  });
});

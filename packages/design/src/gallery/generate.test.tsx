import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGalleryHtml } from "./generate";

// Vitest ejecuta el paquete con cwd en packages/design.
const dirPaquete = process.cwd();
const rutaGaleria = join(dirPaquete, "gallery.html");

describe("generación de la galería estática", () => {
  const html = buildGalleryHtml();

  it("genera un documento HTML autónomo en español", () => {
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<html lang="es">');
    expect(html).toContain("<style>");
  });

  it("incrusta los tokens, el foco visible y el objetivo de 44 px", () => {
    expect(html).toContain("--lg-tinta");
    expect(html).toContain(":focus-visible");
    expect(html).toContain("--lg-objetivo: 44px");
    expect(html).toContain("prefers-reduced-motion");
  });

  it("escribe gallery.html en el paquete y queda fuera del control de versiones", () => {
    writeFileSync(rutaGaleria, html, "utf8");
    expect(existsSync(rutaGaleria)).toBe(true);
    const gitignore = readFileSync(join(dirPaquete, ".gitignore"), "utf8");
    expect(gitignore).toContain("gallery.html");
  });

  it("no carga scripts ni recursos remotos", () => {
    expect(html).not.toContain("<script");
    expect(html).not.toContain("https://");
    expect(html).not.toContain("http://");
  });

  it("contiene los cuatro tonos de Callout y los seis kinds de bloque", () => {
    for (const marca of ["lg-callout-info", "lg-callout-aviso", "lg-callout-peligro", "lg-callout-exito"]) {
      expect(html).toContain(marca);
    }
    for (const marca of ["lg-bloque-step", "lg-bloque-document", "lg-bloque-cost", "lg-bloque-deadline", "lg-bloque-warning", "lg-bloque-fact"]) {
      expect(html).toContain(marca);
    }
  });
});

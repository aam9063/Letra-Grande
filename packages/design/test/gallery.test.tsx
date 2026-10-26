import { render } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { Gallery } from "../src/gallery/Gallery";

// Vitest ejecuta el paquete con cwd en packages/design.
const dirSrc = join(process.cwd(), "src");

function archivosSrc(): string[] {
  return readdirSync(dirSrc, { recursive: true, encoding: "utf8" })
    .filter((f) => /\.(ts|tsx|css)$/.test(f))
    .map((f) => join(dirSrc, f));
}

describe("galería y accesibilidad", () => {
  it("axe no encuentra violaciones en la galería", async () => {
    const { container } = render(<Gallery />);
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it("ninguna fuente de la galería usa HTML peligros ni marcado del modelo", () => {
    for (const archivo of archivosSrc()) {
      const contenido = readFileSync(archivo, "utf8");
      expect(contenido, archivo).not.toContain("dangerouslySetInnerHTML");
    }
  });
});

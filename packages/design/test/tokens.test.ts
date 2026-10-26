import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tonos, tokens, type ParTono } from "../src/tokens";

// Vitest ejecuta el paquete con cwd en packages/design.
const dirPaquete = process.cwd();
const hojaBase = readFileSync(join(dirPaquete, "src", "base.css"), "utf8");

describe("hoja base y tokens de la seccion 14", () => {
  it("declara las custom properties de los tokens", () => {
    expect(hojaBase).toContain(`--lg-tinta: ${tokens.colorTinta}`);
    expect(hojaBase).toContain(`--lg-lienzo: ${tokens.colorLienzo}`);
    expect(hojaBase).toContain(`--lg-superficie: ${tokens.colorSuperficie}`);
    expect(hojaBase).toContain(`--lg-acento: ${tokens.colorAcento}`);
  });

  it("declara las ocho custom properties de los tonos igual que el objeto tonos", () => {
    const pares: Array<[string, ParTono]> = [
      ["info", tonos.info],
      ["aviso", tonos.aviso],
      ["peligro", tonos.peligro],
      ["exito", tonos.exito],
    ];
    for (const [nombre, tono] of pares) {
      expect(hojaBase).toContain(`--lg-${nombre}-fondo: ${tono.fondo}`);
      expect(hojaBase).toContain(`--lg-${nombre}-texto: ${tono.texto}`);
    }
  });

  it("usa una base de 16 px y tipografia del sistema, sin fuentes remotas", () => {
    expect(hojaBase).toContain("font-size: 16px");
    expect(hojaBase).toContain("font-family: system-ui");
    expect(hojaBase).not.toMatch(/url\(/);
    expect(hojaBase).not.toMatch(/@import/);
    expect(hojaBase).not.toMatch(/@font-face/);
  });

  it("el foco es visible para todos los controles", () => {
    expect(hojaBase).toContain(":focus-visible");
    expect(hojaBase).toMatch(/outline: 3px solid var\(--lg-acento\)/);
  });

  it("define el objetivo tactil de 44 px", () => {
    expect(hojaBase).toContain("--lg-objetivo: 44px");
    expect(hojaBase).toContain("min-height: var(--lg-objetivo)");
  });

  it("respeta prefers-reduced-motion", () => {
    expect(hojaBase).toContain("@media (prefers-reduced-motion: reduce)");
  });
});

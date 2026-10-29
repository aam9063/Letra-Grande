import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tonos, tokens, type ParTono } from "../src/tokens";

// Vitest ejecuta el paquete con cwd en packages/design.
const dirPaquete = process.cwd();
const hojaBase = readFileSync(join(dirPaquete, "src", "base.css"), "utf8");

describe("hoja base y tokens de la seccion 14", () => {
  it("el acento es el teal de la marca UI-03 y su texto va en tinta", () => {
    // #3E9B94 da 3.3:1 con blanco (insuficiente para texto normal) y 5.5:1 con
    // tinta #141414: el texto sobre acento es tinta, como el onAccent del mockup.
    expect(tokens.colorAcento).toBe("#3E9B94");
    expect(tokens.colorAcentoTexto).toBe("#141414");
    expect(hojaBase).toContain("--lg-acento: #3E9B94");
    expect(hojaBase).toContain("--lg-acento-texto: #141414");
  });

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

  it("declara exactamente las custom properties de los tokens, sin faltar ni sobrar (REF-QA-08-01)", () => {
    // tokens.ts es la fuente de verdad: base.css tiene que declarar una
    // custom property por token de color y por par de tono y etiqueta, y
    // nada más salvo las tres medidas que no son color.
    const kebabDeColor = (clave: string) =>
      clave
        .replace(/^color/, "")
        .replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
        .slice(1);

    const esperadas = new Set<string>([
      // Tokens de color: un `--lg-<token>` por clave color*.
      ...Object.keys(tokens)
        .filter((clave) => clave.startsWith("color"))
        .map((clave) => `--lg-${kebabDeColor(clave)}`),
      // Pares de tono y etiqueta: fondo y texto.
      ...Object.keys(tonos).flatMap((nombre) => [`--lg-${nombre}-fondo`, `--lg-${nombre}-texto`]),
      ...Object.keys(tokens.etiquetas).flatMap((nombre) => [
        `--lg-etiqueta-${nombre}-fondo`,
        `--lg-etiqueta-${nombre}-texto`,
      ]),
      // Medidas declaradas en la hoja que no son tokens de color.
      "--lg-radio",
      "--lg-espacio",
      "--lg-objetivo",
    ]);

    const bloqueRaiz = hojaBase.match(/:root\s*\{[^}]*\}/)?.[0] ?? "";
    const declaradas = [...bloqueRaiz.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]!);

    expect(declaradas.sort()).toEqual([...esperadas].sort());
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

// REF-QA-08-01, hallazgo del review: el test de nombres comprueba que no falte
// ni sobre, pero no que los VALORES coincidan. Un desvío de valor en base.css
// dejaría la fuente de verdad sin vigilancia justo donde la tarea dice que vive.
describe("base.css declara el valor exacto de cada token de color", () => {
  /** colorAcentoSuaveTexto -> acento-suave-texto */
  function kebab(clave: string): string {
    return clave
      .replace(/^color/, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .toLowerCase();
  }

  it("cada token color* tiene su custom property con el mismo valor", () => {
    const colores = Object.entries(tokens).filter(
      ([clave, valor]) => clave.startsWith("color") && typeof valor === "string",
    );

    expect(colores.length).toBeGreaterThanOrEqual(10);
    for (const [clave, valor] of colores) {
      expect(hojaBase, `${clave} debe estar en base.css con su valor`).toContain(
        `--lg-${kebab(clave)}: ${valor}`,
      );
    }
  });

  it("cada etiqueta tiene sus dos custom properties con el mismo valor", () => {
    for (const [nombre, etiqueta] of Object.entries(tokens.etiquetas)) {
      expect(hojaBase).toContain(`--lg-etiqueta-${kebab(nombre)}-fondo: ${etiqueta.fondo}`);
      expect(hojaBase).toContain(`--lg-etiqueta-${kebab(nombre)}-texto: ${etiqueta.texto}`);
    }
  });
});

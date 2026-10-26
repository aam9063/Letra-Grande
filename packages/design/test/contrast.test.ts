import { describe, expect, it } from "vitest";
import { contraste, tonos, tokens } from "../src/tokens";

// Umbral AA de WCAG 2.2: 4.5:1 para texto normal, 3:1 para texto grande
// y para elementos no textuales (borde de foco, iconos).
const AA_TEXTO = 4.5;
const AA_NO_TEXTUAL = 3;

describe("contraste AA de los tokens (seccion 14)", () => {
  it("el texto principal pasa AA sobre el lienzo y sobre la superficie", () => {
    expect(contraste(tokens.colorTinta, tokens.colorLienzo)).toBeGreaterThanOrEqual(AA_TEXTO);
    expect(contraste(tokens.colorTinta, tokens.colorSuperficie)).toBeGreaterThanOrEqual(AA_TEXTO);
  });

  it("la accion primaria pasa AA con su texto encima", () => {
    expect(contraste(tokens.colorAcentoTexto, tokens.colorAcento)).toBeGreaterThanOrEqual(AA_TEXTO);
  });

  it("el acento sirve de foco visible sobre lienzo y superficie (3:1 no textual)", () => {
    expect(contraste(tokens.colorAcento, tokens.colorLienzo)).toBeGreaterThanOrEqual(AA_NO_TEXTUAL);
    expect(contraste(tokens.colorAcento, tokens.colorSuperficie)).toBeGreaterThanOrEqual(AA_NO_TEXTUAL);
  });

  it("cada tono de Callout pasa AA entre su texto y su fondo", () => {
    for (const tono of Object.values(tonos)) {
      const ratio = contraste(tono.texto, tono.fondo);
      expect(ratio, `tono ${tono.nombre}`).toBeGreaterThanOrEqual(AA_TEXTO);
    }
  });
});

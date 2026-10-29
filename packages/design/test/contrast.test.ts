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

  // REF-QA-08-01: pares de texto y fondo que antes solo existían como
  // literales en las hojas de la app y el test no veía.
  it("el texto tenue pasa AA sobre lienzo, superficie y superficie alterna", () => {
    for (const fondo of [tokens.colorLienzo, tokens.colorSuperficie, tokens.colorSuperficieAlterna]) {
      expect(contraste(tokens.colorTextoTenue, fondo), `texto tenue sobre ${fondo}`).toBeGreaterThanOrEqual(
        AA_TEXTO,
      );
    }
  });

  it("el texto medio pasa AA sobre lienzo, superficie y superficie alterna", () => {
    for (const fondo of [tokens.colorLienzo, tokens.colorSuperficie, tokens.colorSuperficieAlterna]) {
      expect(contraste(tokens.colorTextoMedio, fondo), `texto medio sobre ${fondo}`).toBeGreaterThanOrEqual(
        AA_TEXTO,
      );
    }
  });

  it("el texto sobre el fondo con acento suave pasa AA", () => {
    expect(contraste(tokens.colorAcentoSuaveTexto, tokens.colorAcentoSuave)).toBeGreaterThanOrEqual(AA_TEXTO);
  });

  it("cada etiqueta del registro etiquetas pasa AA entre su texto y su fondo", () => {
    for (const etiqueta of Object.values(tokens.etiquetas)) {
      const ratio = contraste(etiqueta.texto, etiqueta.fondo);
      expect(ratio, `etiqueta ${etiqueta.nombre}`).toBeGreaterThanOrEqual(AA_TEXTO);
    }
  });
});

// REF-QA-08-01, hallazgo del review: estos pares se usan de verdad como texto
// sobre un fondo en las hojas de la app, y ninguno tenía test. Hoy pasan AA;
// la prueba existe para que sigan pasando.
describe("pares en uso que no estaban cubiertos", () => {
  it("el texto del acento suave pasa AA sobre lienzo y superficie", () => {
    for (const fondo of [tokens.colorLienzo, tokens.colorSuperficie]) {
      expect(
        contraste(tokens.colorAcentoSuaveTexto, fondo),
        `acento suave texto sobre ${fondo}`,
      ).toBeGreaterThanOrEqual(AA_TEXTO);
    }
  });

  it("el texto de la etiqueta ok pasa AA sobre acento suave y superficie", () => {
    for (const fondo of [tokens.colorAcentoSuave, tokens.colorSuperficie]) {
      expect(
        contraste(tokens.etiquetas.ok.texto, fondo),
        `etiqueta ok sobre ${fondo}`,
      ).toBeGreaterThanOrEqual(AA_TEXTO);
    }
  });

  it("los grises claros usados como texto sobre tinta pasan AA", () => {
    for (const claro of [tokens.colorBordeSuave, tokens.colorBorde, tokens.colorTextoApoyo]) {
      expect(contraste(claro, tokens.colorTinta), `${claro} sobre tinta`).toBeGreaterThanOrEqual(
        AA_TEXTO,
      );
    }
  });
});

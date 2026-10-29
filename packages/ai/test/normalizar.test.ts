// Tests de la normalización compartida (REF-QA-08-04): tono, caducidad y
// tokenize deben tratar igual las tildes, diéresis, eñes y el resto de
// diacríticos descomponibles, sin copias que diverjan en silencio.
//
// Cada sonda mete el diacrítico en lugar de su letra base dentro de una frase
// que la normalización NFD reconstruye: así se observa qué hace cada
// normalizador con caracteres que el mapa de tokenize no cubre ("ç", "à",
// "ö") y con los que sí ("á é í ó ú ü ñ").
import { describe, expect, it } from "vitest";
import type { AssistantAnswer } from "@letra-grande/schema";
import { validateTone } from "../src/guardrails/tone.js";
import { validateStaleness, type StalenessSource } from "../src/guardrails/staleness.js";
import { normalizarSinTildes } from "../src/normalizar.js";
import { tokenize } from "../src/retrieval/tokenize.js";

/** Par de diacrítico y su base según NFD: cubiertos y no cubiertos por el mapa de tokenize. */
const PROBAS: readonly (readonly [string, string])[] = [
  ["á", "a"],
  ["é", "e"],
  ["í", "i"],
  ["ó", "o"],
  ["ú", "u"],
  ["ü", "u"],
  ["ñ", "n"],
  ["ç", "c"],
  ["à", "a"],
  ["ö", "o"],
];

function respuestaConClaims(claims: string[]): AssistantAnswer {
  return {
    question: "¿Pregunta de prueba?",
    outOfScope: false,
    blocks: claims.map((claim) => ({
      kind: "fact" as const,
      claim,
      citations: [{ sourceId: "fuente-caducada" }],
    })),
  };
}

const HOY = new Date("2026-06-15T12:00:00Z");
const FUENTES: StalenessSource[] = [
  { id: "fuente-caducada", verifiedAt: new Date(HOY.getTime() - 200 * 86_400_000).toISOString() },
  { id: "fuente-fresca", verifiedAt: new Date(HOY.getTime() - 10 * 86_400_000).toISOString() },
];

/** Frase prohibida que contiene la letra base, y claim con el diacrítico en su sitio. */
function fraseProhibida(base: string): string {
  return base === "a" ? "hay que" : base === "u" ? "usted debe" : "te conviene";
}

function claimDeTono(char: string, base: string): string {
  return `${fraseProhibida(base)} hacerlo`.replace(base, char);
}

describe("normalizarSinTildes (REF-QA-08-04)", () => {
  it("quita tildes, diéresis y eñes y pasa a minúsculas", () => {
    expect(normalizarSinTildes("Reclamación por laÑA y ÜLTIMA averiguación")).toBe(
      "reclamacion por lana y ultima averiguacion",
    );
  });

  it("resuelve a su base los diacríticos fuera del set del español", () => {
    expect(normalizarSinTildes("Façade àlea öpera")).toBe("facade alea opera");
  });

  it("deja igual lo que no lleva diacrítico descomponible", () => {
    expect(normalizarSinTildes("1.500 euros ¿y esto?")).toBe("1.500 euros ¿y esto?");
  });
});

describe("las tres normalizaciones coinciden (REF-QA-08-04)", () => {
  it("el tono trata cada diacrítico como su base NFD", () => {
    for (const [char, base] of PROBAS) {
      const issues = validateTone(respuestaConClaims([claimDeTono(char, base)]));
      expect(issues, `tono con "${char}" (esperado "${base}")`).toHaveLength(1);
      expect(issues[0]?.phrase).toBe(fraseProhibida(base));
    }
  });

  // La ñ no es observable en la caducidad: ninguna de sus frases cerradas
  // contiene una "n" que la ñ pueda sustituir. Se fija por tono y tokenize,
  // que en verde comparten la misma función con staleness.
  it("la caducidad trata cada diacrítico como su base NFD", () => {
    for (const [char, base] of PROBAS) {
      if (base === "n") continue;
      const frase =
        base === "e" || base === "i" || base === "o"
          ? "puede haber cambiado"
          : "caducado el plazo";
      const claim = frase.replace(base, char);
      const answer: AssistantAnswer = {
        question: "¿Pregunta de prueba?",
        outOfScope: false,
        blocks: [
          {
            kind: "fact",
            claim: "El plazo es de 30 días.",
            citations: [{ sourceId: "fuente-caducada" }],
          },
          {
            kind: "warning",
            claim,
            citations: [{ sourceId: "fuente-fresca" }],
          },
        ],
      };
      const issues = validateStaleness(answer, FUENTES, HOY);
      expect(issues, `caducidad con "${char}" en "${claim}" (esperado "${base}")`).toHaveLength(0);
    }
  });

  it("tokenize trata cada diacrítico como su base NFD", () => {
    for (const [char, base] of PROBAS) {
      expect(tokenize(`fa${char}de`), `tokenize con "${char}" (esperado "${base}")`).toEqual([
        `fa${base}de`,
      ]);
    }
  });
});

// Tests de la decisión de atribución (AI-05).
// Decisión: la atribución ya la cubre el contrato común y no se duplica en
// packages/ai. Todo bloque (fact, cost, deadline incluidos) necesita al menos
// una cita (schema) y toda cifra del claim debe aparecer en el texto de las
// fuentes citadas (validateAnswerAgainstSources). Estos tests fijan ese pacto.
import { describe, expect, it } from "vitest";
import { AssistantAnswer, validateAnswerAgainstSources } from "@letra-grande/schema";

const FUENTES = new Map([["fuente-1", "El plazo de reclamación es de 30 días."]]);

describe("atribución: cubierta por el contrato y la validación contra fuentes", () => {
  it("un bloque fact sin cita no supera el catálogo cerrado del schema", () => {
    const resultado = AssistantAnswer.safeParse({
      question: "¿Cuántos días tengo?",
      outOfScope: false,
      blocks: [{ kind: "fact", claim: "El plazo de reclamación es de 30 días.", citations: [] }],
    });
    expect(resultado.success).toBe(false);
  });

  it("un claim con una cifra que no está en la fuente citada no supera la validación", () => {
    const issues = validateAnswerAgainstSources(
      {
        question: "¿Cuántos días tengo?",
        outOfScope: false,
        blocks: [
          {
            kind: "fact",
            claim: "El plazo de reclamación es de 45 días.",
            citations: [{ sourceId: "fuente-1" }],
          },
        ],
      },
      FUENTES,
    );
    expect(issues).toEqual([
      { blockIndex: 0, kind: "unsupported_figure", detail: "45" },
    ]);
  });
});

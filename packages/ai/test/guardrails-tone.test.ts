// Tests del guardarraíl de tono (AI-05): el asistente informa, no prescribe ni
// promete resultados. Rechazo insensible a mayúsculas y tildes; las formas con
// matiz ("puede corresponderte", "según la web oficial", "la ficha indica") pasan.
import { describe, expect, it } from "vitest";
import type { AssistantAnswer } from "@letra-grande/schema";
import { PROHIBITED_PHRASES, validateTone } from "../src/guardrails/tone.js";

function respuestaConClaims(claims: string[]): AssistantAnswer {
  return {
    question: "¿Pregunta de prueba?",
    outOfScope: false,
    blocks: claims.map((claim) => ({
      kind: "fact" as const,
      claim,
      citations: [{ sourceId: "fuente-1" }],
    })),
  };
}

describe("validateTone (AI-05)", () => {
  it.each([
    "Debes recurrir la multa.",
    "Deberías pagar antes del plazo.",
    "Tienes que presentar el escrito en el registro.",
    "Tienes derecho a una reducción de la factura.",
    "Te corresponde una compensación por los daños.",
    "Te corresponden dos compensaciones por los retrasos.",
    "Te devolverán el importe íntegro.",
    "Con este escrito ganarás la reclamación.",
    "Reclamarás con éxito si sigues estos pasos.",
    "Usted debe recurrir la multa.",
    "Hay que recurrir antes del plazo.",
    "Lo mejor es recurrir cuanto antes.",
    "Reclama ya para no perder el plazo.",
    "Te recomiendo presentar el escrito.",
    "Te conviene pedir la baja por escrito.",
    "Le conviene reclamar a la vez que la compañía.",
    "Es obligatorio que presentes el escrito en el registro.",
  ])("rechaza la forma prescriptiva o que promete resultado: %s", (claim) => {
    const issues = validateTone(respuestaConClaims([claim]));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.blockIndex).toBe(0);
    expect(issues[0]?.message).toContain(issues[0]?.phrase ?? "");
  });

  it("es insensible a mayúsculas y tildes", () => {
    const issues = validateTone(
      respuestaConClaims(["DEBES recurrir", "Te devolveran el importe.", "GANARÁS la reclamación."]),
    );
    expect(issues).toHaveLength(3);
  });

  it("las formas con matiz pasan la validación", () => {
    const issues = validateTone(
      respuestaConClaims([
        "Según la web oficial, puede corresponderte una reducción.",
        "La ficha indica que la reclamación es gratuita.",
        "Puede corresponderte presentar el escrito en un mes, según la fuente citada.",
      ]),
    );
    expect(issues).toEqual([]);
  });

  it("un uso descriptivo de debe, sin segunda persona, pasa la validación", () => {
    const issues = validateTone(
      respuestaConClaims(["El plazo debe aparecer en la carta, según la fuente citada."]),
    );
    expect(issues).toEqual([]);
  });

  it("cada bloque problemático se señala con su índice, sin repetir frases en el mismo bloque", () => {
    const issues = validateTone(
      respuestaConClaims(["Todo en orden, según la fuente.", "Debes recurrir y te devolverán el importe."]),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.blockIndex).toBe(1);
  });

  it("lista completa de formas prohibidas, para las evaluaciones de AI-04", () => {
    expect(PROHIBITED_PHRASES).toEqual([
      "debes",
      "deberías",
      "tienes que",
      "tienes derecho a",
      "te corresponde",
      "te corresponden",
      "te devolverán",
      "ganarás",
      "reclamarás con éxito",
      "usted debe",
      "hay que",
      "lo mejor es",
      "te recomiendo",
      "te conviene",
      "le conviene",
      "reclama ya",
      "es obligatorio que",
    ]);
  });
});

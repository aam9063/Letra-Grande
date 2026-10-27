// Tests del guardarraíl de caducidad (AI-05): si una fuente citada se verificó
// hace más de 180 días, la respuesta debe incluir un bloque warning. Una fuente
// sin fecha de verificación cuenta como caducada.
import { describe, expect, it } from "vitest";
import type { AssistantAnswer } from "@letra-grande/schema";
import {
  STALENESS_LIMIT_DAYS,
  daysSinceVerification,
  validateStaleness,
  type StalenessSource,
} from "../src/guardrails/staleness.js";

const HOY = new Date("2026-06-15T12:00:00Z");

function haceDias(dias: number): string {
  return new Date(HOY.getTime() - dias * 86_400_000).toISOString();
}

function respuesta(bloques: AssistantAnswer["blocks"]): AssistantAnswer {
  return { question: "¿Pregunta de prueba?", outOfScope: false, blocks: bloques };
}

const BLOQUE_FACT = {
  kind: "fact" as const,
  claim: "El plazo de reclamación es de 30 días.",
  citations: [{ sourceId: "fuente-1" }],
};

const BLOQUE_AVISO = {
  kind: "warning" as const,
  claim: "Esta información puede estar desactualizada.",
  citations: [{ sourceId: "fuente-1" }],
};

const FUENTES: StalenessSource[] = [
  { id: "fuente-1", verifiedAt: haceDias(10) },
  { id: "fuente-caducada", verifiedAt: haceDias(200) },
  { id: "fuente-sin-fecha" },
];

describe("validateStaleness (AI-05)", () => {
  it("el límite son 180 días", () => {
    expect(STALENESS_LIMIT_DAYS).toBe(180);
  });

  it("en el límite exacto, 180 días, la fuente no está caducada", () => {
    expect(daysSinceVerification(haceDias(180), HOY)).toBe(180);
    const issues = validateStaleness(
      respuesta([BLOQUE_FACT]),
      [{ id: "fuente-1", verifiedAt: haceDias(180) }],
      HOY,
    );
    expect(issues).toEqual([]);
  });

  it("con 181 días la fuente está caducada y la respuesta sin warning es una incidencia", () => {
    expect(daysSinceVerification(haceDias(181), HOY)).toBe(181);
    const issues = validateStaleness(
      respuesta([BLOQUE_FACT]),
      [{ id: "fuente-1", verifiedAt: haceDias(181) }],
      HOY,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sourceIds).toEqual(["fuente-1"]);
    expect(issues[0]?.message).toContain("warning");
  });

  it("la incidencia desaparece cuando la respuesta incluye el bloque de aviso", () => {
    const issues = validateStaleness(
      respuesta([BLOQUE_AVISO, BLOQUE_FACT]),
      [{ id: "fuente-1", verifiedAt: haceDias(181) }],
      HOY,
    );
    expect(issues).toEqual([]);
  });

  it("un warning que cita la fuente caducada satisface la regla aunque su claim no hable de caducidad", () => {
    const issues = validateStaleness(
      respuesta([
        { ...BLOQUE_AVISO, claim: "Atención: revisa los datos.", citations: [{ sourceId: "fuente-1" }] },
        BLOQUE_FACT,
      ]),
      [{ id: "fuente-1", verifiedAt: haceDias(181) }],
      HOY,
    );
    expect(issues).toEqual([]);
  });

  it("un warning que no habla de caducidad y cita fuentes frescas no satisface la regla", () => {
    const issues = validateStaleness(
      respuesta([
        {
          kind: "warning",
          claim: "La reclamación es gratuita.",
          citations: [{ sourceId: "fuente-fresca" }],
        },
        BLOQUE_FACT,
      ]),
      [
        { id: "fuente-1", verifiedAt: haceDias(181) },
        { id: "fuente-fresca", verifiedAt: haceDias(5) },
      ],
      HOY,
    );
    expect(issues).toHaveLength(1);
  });

  it("una fuente citada sin fecha de verificación cuenta como caducada", () => {
    const issues = validateStaleness(respuesta([BLOQUE_FACT]), [{ id: "fuente-1" }], HOY);
    expect(issues).toHaveLength(1);
  });

  it("una fecha de verificación no válida cuenta como caducada", () => {
    const issues = validateStaleness(
      respuesta([BLOQUE_FACT]),
      [{ id: "fuente-1", verifiedAt: "no-es-una-fecha" }],
      HOY,
    );
    expect(issues).toHaveLength(1);
  });

  it("solo cuentan las fuentes citadas: una caducada sin citar no es incidencia", () => {
    const issues = validateStaleness(respuesta([BLOQUE_FACT]), FUENTES, HOY);
    expect(issues).toEqual([]);
  });

  it("varias fuentes citadas caducadas entran en una sola incidencia", () => {
    const bloques: AssistantAnswer["blocks"] = [
      { ...BLOQUE_FACT, citations: [{ sourceId: "fuente-caducada" }, { sourceId: "fuente-sin-fecha" }] },
    ];
    const issues = validateStaleness(respuesta(bloques), FUENTES, HOY);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sourceIds).toEqual(["fuente-caducada", "fuente-sin-fecha"]);
  });

  it("una respuesta fuera de alcance no cita fuentes y no genera incidencia", () => {
    const issues = validateStaleness(
      { question: "¿Pregunta de prueba?", outOfScope: true, blocks: [] },
      FUENTES,
      HOY,
    );
    expect(issues).toEqual([]);
  });
});

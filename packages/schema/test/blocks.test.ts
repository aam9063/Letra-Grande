import { describe, expect, it } from "vitest";
import { AssistantAnswer, Block, StepBlock, validateAnswerAgainstSources } from "../src";
import type { z } from "zod";

type StepBlockData = z.infer<typeof StepBlock>;

function step(n: number, claim = "La fuente indica que hay que enviar la solicitud."): StepBlockData {
  return {
    kind: "step",
    n,
    claim,
    citations: [{ sourceId: "fuente-oficial" }],
  };
}

describe("AssistantAnswer", () => {
  it("una respuesta con un paso y una cita valida", () => {
    const answer = {
      question: "¿Cómo reclamo?",
      outOfScope: false,
      blocks: [step(1)],
    };
    expect(AssistantAnswer.safeParse(answer).success).toBe(true);
  });

  it("dos bloques de aviso fallan", () => {
    const warning = {
      kind: "warning",
      claim: "La fuente avisa de un plazo.",
      citations: [{ sourceId: "fuente-oficial" }],
    } satisfies Block;
    const answer = { question: "¿Cómo reclamo?", outOfScope: false, blocks: [warning, warning] };
    const result = AssistantAnswer.safeParse(answer);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("aviso"))).toBe(true);
    }
  });

  it("pasos numerados 1 y 3 fallan", () => {
    const answer = {
      question: "¿Cómo reclamo?",
      outOfScope: false,
      blocks: [step(1), step(3)],
    };
    const result = AssistantAnswer.safeParse(answer);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("numerarse"))).toBe(true);
    }
  });

  it("un bloque sin citas falla", () => {
    const answer = {
      question: "¿Cómo reclamo?",
      outOfScope: false,
      blocks: [{ kind: "fact", claim: "Algo.", citations: [] }],
    };
    const result = AssistantAnswer.safeParse(answer);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("cita"))).toBe(true);
    }
  });

  it("una respuesta fuera de alcance puede ir sin bloques", () => {
    const answer = { question: "¿Cómo reclamo?", outOfScope: true, blocks: [] };
    expect(AssistantAnswer.safeParse(answer).success).toBe(true);
  });
});

describe("validateAnswerAgainstSources", () => {
  it("una cifra que no está en la fuente se reporta como unsupported_figure", () => {
    const answer = AssistantAnswer.parse({
      question: "¿Cuánto cuesta?",
      outOfScope: false,
      blocks: [
        {
          kind: "cost",
          claim: "La cuota es de 14,99 € al mes.",
          citations: [{ sourceId: "fuente-oficial" }],
        },
      ],
    });
    const issues = validateAnswerAgainstSources(
      answer,
      new Map([["fuente-oficial", "La cuota es de 9,99 € al mes según la tarifa."]]),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ blockIndex: 0, kind: "unsupported_figure", detail: "14.99" });
  });

  it("una cita a una fuente desconocida se reporta como unknown_source", () => {
    const answer = AssistantAnswer.parse({
      question: "¿Cómo reclamo?",
      outOfScope: false,
      blocks: [step(1)],
    });
    const issues = validateAnswerAgainstSources(answer, new Map());
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ blockIndex: 0, kind: "unknown_source", detail: "fuente-oficial" });
  });

  it("una cifra con separador de miles cuenta si la fuente la trae", () => {
    const answer = AssistantAnswer.parse({
      question: "¿Cuánto es la compensación?",
      outOfScope: false,
      blocks: [
        {
          kind: "fact",
          claim: "La compensación puede llegar a 1.500 €.",
          citations: [{ sourceId: "fuente-oficial" }],
        },
      ],
    });
    const issues = validateAnswerAgainstSources(
      answer,
      new Map([["fuente-oficial", "se fija en 1500 euros"]]),
    );
    expect(issues).toHaveLength(0);
  });

  it("la cifra 30 no valida contra una fuente que dice 300", () => {
    const answer = AssistantAnswer.parse({
      question: "¿Cuánto tarda?",
      outOfScope: false,
      blocks: [
        {
          kind: "deadline",
          claim: "El plazo es de 30 días.",
          citations: [{ sourceId: "fuente-oficial" }],
        },
      ],
    });
    const issues = validateAnswerAgainstSources(
      answer,
      new Map([["fuente-oficial", "el plazo es de 300 días"]]),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ blockIndex: 0, kind: "unsupported_figure", detail: "30" });
  });

  it("la cifra 500 no valida contra una fuente que dice 1.500", () => {
    const answer = AssistantAnswer.parse({
      question: "¿Cuánto cuesta?",
      outOfScope: false,
      blocks: [
        {
          kind: "cost",
          claim: "La compensación es de 500 €.",
          citations: [{ sourceId: "fuente-oficial" }],
        },
      ],
    });
    const issues = validateAnswerAgainstSources(
      answer,
      new Map([["fuente-oficial", "la compensación es de 1.500 €"]]),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ blockIndex: 0, kind: "unsupported_figure", detail: "500" });
  });

  it("la cifra 14,99 sigue validando contra una fuente que dice 14,99", () => {
    const answer = AssistantAnswer.parse({
      question: "¿Cuánto cuesta la cuota?",
      outOfScope: false,
      blocks: [
        {
          kind: "cost",
          claim: "La cuota es de 14,99 € al mes.",
          citations: [{ sourceId: "fuente-oficial" }],
        },
      ],
    });
    const issues = validateAnswerAgainstSources(
      answer,
      new Map([["fuente-oficial", "la cuota es de 14,99 € al mes"]]),
    );
    expect(issues).toHaveLength(0);
  });

  it("el número de orden de un paso no cuenta como cifra de la afirmación", () => {
    const answer = AssistantAnswer.parse({
      question: "¿Cómo reclamo?",
      outOfScope: false,
      blocks: [
        {
          kind: "step",
          n: 1,
          claim: "La fuente dice que hay que enviar la solicitud.",
          citations: [{ sourceId: "fuente-oficial" }],
        },
        {
          kind: "step",
          n: 2,
          claim: "La fuente dice que hay que esperar la respuesta.",
          citations: [{ sourceId: "fuente-oficial" }],
        },
      ],
    });
    const issues = validateAnswerAgainstSources(
      answer,
      new Map([
        ["fuente-oficial", "hay que enviar la solicitud, después hay que esperar la respuesta"],
      ]),
    );
    expect(issues).toHaveLength(0);
  });
});

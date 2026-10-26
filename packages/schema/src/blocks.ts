import { z } from "zod";

/**
 * Catálogo CERRADO de bloques de respuesta del asistente.
 * El modelo elige el `kind` y rellena campos; nunca escribe marcado ni HTML.
 * La interfaz decide cómo se pinta cada bloque.
 */

export const Citation = z.object({
  /** Id de una fuente de las fichas recuperadas para esta respuesta. */
  sourceId: z.string().min(1),
  /** Fragmento literal de la fuente que respalda la afirmación. */
  quote: z.string().max(240).optional(),
});
export type Citation = z.infer<typeof Citation>;

const base = {
  claim: z.string().min(1).max(600),
  citations: z.array(Citation).min(1, "Toda afirmación necesita al menos una cita"),
};

export const StepBlock = z.object({ kind: z.literal("step"), n: z.number().int().positive(), ...base });
export const DocumentBlock = z.object({ kind: z.literal("document"), ...base });
export const CostBlock = z.object({ kind: z.literal("cost"), ...base });
export const DeadlineBlock = z.object({ kind: z.literal("deadline"), deadlineId: z.string().optional(), ...base });
export const WarningBlock = z.object({ kind: z.literal("warning"), ...base });
export const FactBlock = z.object({ kind: z.literal("fact"), ...base });

export const Block = z.discriminatedUnion("kind", [
  StepBlock, DocumentBlock, CostBlock, DeadlineBlock, WarningBlock, FactBlock,
]);
export type Block = z.infer<typeof Block>;

export const AssistantAnswer = z
  .object({
    question: z.string().min(1),
    /** Verdadero si la pregunta cae fuera de lo que la herramienta cubre. */
    outOfScope: z.boolean().default(false),
    blocks: z.array(Block).max(12),
  })
  .superRefine((data, ctx) => {
    if (!data.outOfScope && data.blocks.length === 0) {
      ctx.addIssue({ code: "custom", path: ["blocks"], message: "Una respuesta dentro de alcance necesita al menos un bloque" });
    }
    if (data.blocks.filter((b) => b.kind === "warning").length > 1) {
      ctx.addIssue({ code: "custom", path: ["blocks"], message: "Como máximo un bloque de aviso por respuesta" });
    }
    const steps = data.blocks.filter((b): b is z.infer<typeof StepBlock> => b.kind === "step");
    steps.forEach((s, i) => {
      if (s.n !== i + 1) {
        ctx.addIssue({ code: "custom", path: ["blocks"], message: `Los pasos deben numerarse 1, 2, 3... (se esperaba ${i + 1} y llegó ${s.n})` });
      }
    });
  });
export type AssistantAnswer = z.infer<typeof AssistantAnswer>;

/** Texto normalizado para comparar cifras: sin separadores de miles. */
function normalizeForFigures(text: string): string {
  return text.replace(/(?<=\d)[.\s](?=\d{3}\b)/g, "").replace(/\s+/g, " ");
}

/** Extrae cifras de un texto: "30 días", "14,99 €", "2 meses". */
export function extractFigures(text: string): string[] {
  const matches = normalizeForFigures(text).match(/\d+(?:[.,]\d+)?/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(",", ".")))];
}

export interface AnswerIssue {
  blockIndex: number;
  kind: "unknown_source" | "unsupported_figure";
  detail: string;
}

/**
 * Validación de servidor contra las fuentes realmente recuperadas:
 * - toda cita apunta a una fuente conocida;
 * - toda cifra de una afirmación aparece en el texto de alguna fuente citada.
 * `sourceTexts`: id de fuente -> texto recuperado.
 */
export function validateAnswerAgainstSources(
  answer: AssistantAnswer,
  sourceTexts: ReadonlyMap<string, string>,
): AnswerIssue[] {
  const issues: AnswerIssue[] = [];
  answer.blocks.forEach((block, blockIndex) => {
    const cited: string[] = [];
    for (const c of block.citations) {
      const text = sourceTexts.get(c.sourceId);
      if (text === undefined) issues.push({ blockIndex, kind: "unknown_source", detail: c.sourceId });
      else cited.push(text);
    }
    const haystack = extractFigures(cited.join(" "));
    for (const fig of extractFigures(block.claim)) {
      if (!haystack.includes(fig)) issues.push({ blockIndex, kind: "unsupported_figure", detail: fig });
    }
  });
  return issues;
}

import { z } from "zod";
import { Sector, Source, Verification, checkSourceRefs, checkVerification, slug } from "./common";

export const Deadline = z.object({
  id: slug,
  label: z.string().min(1),
  kind: z.enum(["plazo_legal", "permanencia", "caducidad", "renovacion", "otro"]),
  amount: z.number().int().positive(),
  unit: z.enum(["dias_naturales", "dias_habiles", "meses", "anios"]),
  /** Evento que hace correr el plazo, tal como lo dice la fuente: "recepción de la notificación". */
  from: z.string().min(1),
  sourceId: z.string().min(1),
});
export type Deadline = z.infer<typeof Deadline>;

const SourcedText = z.object({ text: z.string().min(1), sourceId: z.string().min(1) });

/** Trámite: qué hacer, en qué orden, con qué documentos, cuánto cuesta y qué plazos hay. */
export const Procedure = z
  .object({
    id: slug,
    title: z.string().min(1),
    audience: z.enum(["consumidor", "inquilino", "autonomo", "familia", "extranjero", "general"]),
    sector: Sector.optional(),
    region: z.string().optional(),
    summary: z.string().min(1),
    steps: z
      .array(z.object({ n: z.number().int().positive(), text: z.string().min(1), sourceId: z.string().min(1) }))
      .min(1),
    documents: z.array(SourcedText).default([]),
    cost: z
      .object({ text: z.string().min(1), amountEur: z.number().nonnegative().optional(), sourceId: z.string().min(1) })
      .optional(),
    deadlines: z.array(Deadline).default([]),
    warnings: z.array(SourcedText).default([]),
    legalBasis: z.array(z.object({ name: z.string().min(1), url: z.string().url() })).default([]),
    sources: z.array(Source).min(1),
    verification: Verification,
  })
  .superRefine((data, ctx) => {
    checkVerification(data, ctx);

    data.steps.forEach((s, i) => {
      if (s.n !== i + 1) {
        ctx.addIssue({ code: "custom", path: ["steps", i, "n"], message: `Los pasos deben numerarse 1, 2, 3... (aquí se esperaba ${i + 1})` });
      }
    });

    const refs: { path: (string | number)[]; id: string }[] = [];
    data.steps.forEach((s, i) => refs.push({ path: ["steps", i, "sourceId"], id: s.sourceId }));
    data.documents.forEach((d, i) => refs.push({ path: ["documents", i, "sourceId"], id: d.sourceId }));
    data.deadlines.forEach((d, i) => refs.push({ path: ["deadlines", i, "sourceId"], id: d.sourceId }));
    data.warnings.forEach((w, i) => refs.push({ path: ["warnings", i, "sourceId"], id: w.sourceId }));
    if (data.cost) refs.push({ path: ["cost", "sourceId"], id: data.cost.sourceId });
    checkSourceRefs(data.sources, refs, ctx);
  });
export type Procedure = z.infer<typeof Procedure>;

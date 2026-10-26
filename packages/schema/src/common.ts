import { z } from "zod";

/** Identificador estable en minúsculas y guiones: `mi-empresa`, `oficina-consumo-valencia`. */
export const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Debe ser un slug en minúsculas y guiones");

/** Fecha AAAA-MM-DD. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha con formato AAAA-MM-DD")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida");

export const Sector = z.enum([
  "energia", "telefonia", "banca", "seguros", "transporte", "suscripciones", "vivienda", "otros",
]);
export type Sector = z.infer<typeof Sector>;

/**
 * - oficial: BOE, organismos públicos, reguladores.
 * - empresa: web o documentos de la propia empresa.
 * - tercero: pista, nunca basta para marcar una ficha como verificada.
 */
export const SourceKind = z.enum(["oficial", "empresa", "tercero"]);

export const Source = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  kind: SourceKind,
  retrievedOn: isoDate,
});
export type Source = z.infer<typeof Source>;

export const Verification = z.object({
  verified: z.boolean(),
  verifiedOn: isoDate.optional(),
  verifiedBy: z.string().min(1).optional(),
  note: z.string().optional(),
});
export type Verification = z.infer<typeof Verification>;

type IssueSink = {
  addIssue: (issue: { code: "custom"; path: (string | number)[]; message: string }) => void;
};

/**
 * Regla central: una ficha solo puede declararse verificada si dice quién,
 * cuándo y contra qué fuente (oficial o de la propia empresa).
 */
export function checkVerification(
  data: { verification: Verification; sources: Source[] },
  ctx: IssueSink,
): void {
  const ids = new Set<string>();
  data.sources.forEach((s, i) => {
    if (ids.has(s.id)) {
      ctx.addIssue({ code: "custom", path: ["sources", i, "id"], message: `Id de fuente repetido: ${s.id}` });
    }
    ids.add(s.id);
  });

  const v = data.verification;
  if (!v.verified) return;

  if (!v.verifiedOn) {
    ctx.addIssue({ code: "custom", path: ["verification", "verifiedOn"], message: "Una ficha verificada necesita la fecha de verificación" });
  }
  if (!v.verifiedBy) {
    ctx.addIssue({ code: "custom", path: ["verification", "verifiedBy"], message: "Una ficha verificada necesita saber quién la verificó" });
  }
  if (!data.sources.some((s) => s.kind !== "tercero")) {
    ctx.addIssue({ code: "custom", path: ["sources"], message: "Una ficha verificada necesita al menos una fuente oficial o de la propia empresa" });
  }
}

/** Cada referencia `sourceId` debe apuntar a una fuente que exista en la ficha. */
export function checkSourceRefs(
  sources: Source[],
  refs: { path: (string | number)[]; id: string }[],
  ctx: IssueSink,
): void {
  const known = new Set(sources.map((s) => s.id));
  for (const ref of refs) {
    if (!known.has(ref.id)) {
      ctx.addIssue({ code: "custom", path: ref.path, message: `La fuente "${ref.id}" no existe en la lista de fuentes de esta ficha` });
    }
  }
}

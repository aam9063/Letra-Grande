import { z } from "zod";

export const DocumentKind = z.enum(["factura", "contrato", "carta_oficial", "multa", "ticket", "poliza", "otro"]);
export type DocumentKind = z.infer<typeof DocumentKind>;

export const VaultDocument = z.object({
  id: z.string().min(1),
  profileId: z.string().min(1),
  kind: DocumentKind,
  title: z.string().min(1),
  addedAt: z.string().datetime(),
  /** Campos extraídos en local (importe, periodo, potencia, empresa...). */
  fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  tags: z.array(z.string()).default([]),
  /** Referencia al blob cifrado del archivo original. */
  blobId: z.string().optional(),
});
export type VaultDocument = z.infer<typeof VaultDocument>;

export const RadarItem = z.object({
  id: z.string().min(1),
  profileId: z.string().min(1),
  title: z.string().min(1),
  /** Fecha límite o de aviso, AAAA-MM-DD. */
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  origin: z.enum(["documento", "procedimiento", "manual"]),
  documentId: z.string().optional(),
  procedureId: z.string().optional(),
  deadlineId: z.string().optional(),
  severity: z.enum(["info", "aviso", "urgente"]).default("info"),
  status: z.enum(["pendiente", "hecho", "descartado"]).default("pendiente"),
  createdAt: z.string().datetime(),
});
export type RadarItem = z.infer<typeof RadarItem>;

export const Profile = z.object({
  id: z.string().min(1),
  /** Alias que ve el usuario, p. ej. "Yo" o "Mamá". */
  label: z.string().min(1),
  /**
   * Valores que el enmascarador debe ocultar siempre porque no se detectan por patrón:
   * nombre completo, dirección, apellidos. Solo en local.
   */
  knownTerms: z
    .array(z.object({ kind: z.enum(["nombre", "direccion", "otro"]), value: z.string().min(2) }))
    .default([]),
  /** Comunidad autónoma, para elegir el organismo de consumo correcto. */
  region: z.string().optional(),
  plainLanguage: z.boolean().default(false),
});
export type Profile = z.infer<typeof Profile>;

import { z } from "zod";
import { Sector, Source, Verification, checkSourceRefs, checkVerification, slug } from "./common";

export const ChannelKind = z.enum(["web", "telefono", "email", "app", "oficina", "burofax", "postal"]);

export const Channel = z.object({
  kind: ChannelKind,
  value: z.string().min(1),
  notes: z.string().optional(),
  sourceId: z.string().min(1),
});
export type Channel = z.infer<typeof Channel>;

/** Ficha de empresa: cómo contactar, reclamar y darse de baja, y a qué organismos escalar. */
export const Company = z
  .object({
    id: slug,
    name: z.string().min(1),
    sector: Sector,
    group: z.string().optional(),
    channels: z.object({
      atencionCliente: z.array(Channel).default([]),
      reclamacion: z.array(Channel).default([]),
      baja: z.array(Channel).default([]),
    }),
    /** Ids de fichas de `authorities`, en orden de escalado. */
    escalation: z.array(slug).default([]),
    permanencia: z.object({ text: z.string().min(1), sourceId: z.string().min(1) }).optional(),
    bajaNotes: z.string().optional(),
    sources: z.array(Source).min(1),
    verification: Verification,
  })
  .superRefine((data, ctx) => {
    checkVerification(data, ctx);
    const refs: { path: (string | number)[]; id: string }[] = [];
    (["atencionCliente", "reclamacion", "baja"] as const).forEach((group) => {
      data.channels[group].forEach((c, i) =>
        refs.push({ path: ["channels", group, i, "sourceId"], id: c.sourceId }),
      );
    });
    if (data.permanencia) refs.push({ path: ["permanencia", "sourceId"], id: data.permanencia.sourceId });
    checkSourceRefs(data.sources, refs, ctx);
  });
export type Company = z.infer<typeof Company>;

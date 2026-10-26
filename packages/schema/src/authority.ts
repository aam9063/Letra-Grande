import { z } from "zod";
import { Sector, Source, Verification, checkVerification, slug } from "./common";

/**
 * Organismo al que acudir: oficina de consumo, regulador, arbitraje, defensor del cliente.
 * El consumo es en gran parte competencia autonómica y local, así que `scope` y `region` importan.
 */
export const Authority = z
  .object({
    id: slug,
    name: z.string().min(1),
    scope: z.enum(["estatal", "autonomico", "local"]),
    region: z.string().optional(),
    sectors: z.array(Sector).default([]),
    url: z.string().url(),
    howToFile: z.string().min(1),
    sources: z.array(Source).min(1),
    verification: Verification,
  })
  .superRefine((data, ctx) => {
    checkVerification(data, ctx);
    if (data.scope !== "estatal" && !data.region) {
      ctx.addIssue({ code: "custom", path: ["region"], message: "Los organismos autonómicos y locales necesitan `region`" });
    }
  });
export type Authority = z.infer<typeof Authority>;

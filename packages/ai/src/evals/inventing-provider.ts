// Proveedor de control para las evaluaciones (AI-04): un proveedor que
// inventa. Devuelve siempre la misma respuesta plausible pero falsa: cita una
// fuente que no existe, cifra importes que no están en ninguna fuente,
// promete un resultado y añade un documento con forma de DNI. Es el caso de
// control del documento de la tarea: si el ejecutor deja pasar este proveedor
// sin que bajen las métricas, las evaluaciones no miden nada.
import type { LlmProvider } from "../provider.js";

const RESPUESTA_INVENTADA = JSON.stringify({
  question: "pregunta",
  outOfScope: false,
  blocks: [
    {
      kind: "cost",
      claim:
        "El trámite cuesta 999 euros y te devolverán todo el importe si reclamas con el expediente 12345678Z.",
      citations: [{ sourceId: "fuente-inventada", quote: "texto inventado" }],
    },
    {
      kind: "warning",
      claim: "Esta información puede estar desactualizada.",
      citations: [{ sourceId: "fuente-inventada" }],
    },
  ],
});

export function createInventingProvider(): LlmProvider {
  return {
    name: "inventa",
    complete: async () => ({ text: RESPUESTA_INVENTADA }),
  };
}

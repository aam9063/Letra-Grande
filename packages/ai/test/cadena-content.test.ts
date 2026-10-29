// Integración de la cadena del asistente (AI-03) sobre el content/ real del
// repositorio: una pregunta sobre una ficha que existe, recuperación BM25 real
// y una respuesta del catálogo cerrado cuyas citas resuelven contra el texto
// recuperado y superan los guardarraíles de tono y caducidad. Sin red y sin
// clave: el contenido es el público y versionado de content/.
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { AssistantAnswer } from "@letra-grande/schema";
import { validateAnswerAgainstSources } from "@letra-grande/schema";
import { createContentRetriever } from "../src/retrieval/retriever.js";
import { validateTone } from "../src/guardrails/tone.js";
import { validateStaleness } from "../src/guardrails/staleness.js";
import type { RetrievedSourceData } from "../src/retrieval/retriever.js";

// Raíz de content/ del repositorio: este fichero vive en packages/ai/test/.
const RAIZ_CONTENIDO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "content");

// Pregunta sobre la ficha real "Reclamar por el suministro de electricidad".
const PREGUNTA = "¿En cuántos días debe contestar la empresa a una reclamación?";

// La respuesta que un modelo bien llevado daría: afirmación con la cifra tal
// como aparece en la fuente (sin inventar números) y aviso de caducidad, que
// toca porque la ficha aún no está verificada (sin fecha de verificación).
function respuestaConCitas(fuentes: readonly RetrievedSourceData[]): AssistantAnswer {
  const fuente = fuentes.find((f) => f.texto.includes("quince días hábiles"));
  if (fuente === undefined) throw new Error("la recuperación no trajo la fuente esperada");
  return {
    question: PREGUNTA,
    outOfScope: false,
    blocks: [
      {
        kind: "warning",
        claim: "La ficha aún no está verificada: confirma el plazo en la fuente citada.",
        citations: [{ sourceId: fuente.id }],
      },
      {
        kind: "fact",
        claim: "La empresa tiene que contestar en un máximo de quince días hábiles.",
        citations: [{ sourceId: fuente.id, quote: "quince días hábiles" }],
      },
    ],
  };
}

// OJO: esto NO es la cadena completa. Prueba la recuperacion real sobre
// content/ y los tres guardarrailes sobre una respuesta escrita a mano; no pasa
// por handleAssistant. La combinacion handler + content/ real queda como
// REF-AI-03b en docs/backlog.md.
describe("recuperacion y guardarrailes sobre content/ real (AI-03)", () => {
  const recuperador = createContentRetriever({ contentRoot: RAIZ_CONTENIDO });

  it("la pregunta recupera fuentes reales de la ficha de suministro eléctrico", async () => {
    const fuentes = await recuperador(PREGUNTA);
    expect(fuentes.length).toBeGreaterThan(0);
    // La ficha existe en content/ con su fuente de la CNMC.
    const deLaFicha = fuentes.find((f) => f.id === "reclamar-suministro-electrico");
    const deCnmc = fuentes.find((f) => f.id === "cnmc-electrico");
    expect(deLaFicha ?? deCnmc).toBeDefined();
    for (const fuente of fuentes) {
      expect(fuente.titulo.length).toBeGreaterThan(0);
      expect(fuente.url.startsWith("https://")).toBe(true);
      expect(fuente.texto.length).toBeGreaterThan(0);
      expect(typeof fuente.verified).toBe("boolean");
    }
  });

  it("la respuesta cita una fuente recuperada y sus citas resuelven contra el texto", async () => {
    const fuentes = await recuperador(PREGUNTA);
    const respuesta = respuestaConCitas(fuentes);

    const textos = new Map(fuentes.map((f) => [f.id, f.texto]));
    // Sin problemas de fuentes ni cifras: la cita existe y el texto citado está.
    expect(validateAnswerAgainstSources(respuesta, textos)).toEqual([]);
  });

  it("la respuesta honesta supera también los guardarraíles de tono y caducidad", async () => {
    const fuentes = await recuperador(PREGUNTA);
    const respuesta = respuestaConCitas(fuentes);

    expect(validateTone(respuesta)).toEqual([]);
    // La ficha no está verificada: sin fecha, el guardarraíl la cuenta como
    // caducada y el aviso del primer bloque es lo que la hace aceptable.
    expect(validateStaleness(respuesta, fuentes, new Date())).toEqual([]);
  });

  it("una cita a una fuente que no se recuperó no resuelve: la cadena la rechaza", async () => {
    const fuentes = await recuperador(PREGUNTA);
    const textos = new Map(fuentes.map((f) => [f.id, f.texto]));
    const respuesta: AssistantAnswer = {
      question: PREGUNTA,
      outOfScope: false,
      blocks: [
        {
          kind: "fact",
          claim: "La empresa tiene que contestar en un máximo de quince días hábiles.",
          citations: [{ sourceId: "fuente-que-no-existe", quote: "quince días hábiles" }],
        },
      ],
    };
    expect(validateAnswerAgainstSources(respuesta, textos).length).toBeGreaterThan(0);
  });
});

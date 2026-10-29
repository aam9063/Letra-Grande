/**
 * Guardarraíl de tono (AI-05): el asistente informa y orienta, no prescribe
 * decisiones ni promete resultados. Rechaza en los claims las formas
 * prescriptivas o que prometen un resultado (segunda persona o impersonal:
 * nunca un "debe" descriptivo de tercera persona, que es un hecho legítimo
 * sobre la fuente), y acepta las formas con matiz ("puede corresponderte",
 * "según la web oficial", "la ficha indica"). Solo español, insensible a
 * mayúsculas y tildes.
 */
import type { AssistantAnswer } from "@letra-grande/schema";
import { normalizarSinTildes } from "../normalizar.js";

/** Formas prohibidas en un claim: lista cerrada, para código y para AI-04. */
export const PROHIBITED_PHRASES: readonly string[] = [
  "debes",
  "deberías",
  "tienes que",
  "tienes derecho a",
  "te corresponde",
  "te corresponden",
  "te devolverán",
  "ganarás",
  "reclamarás con éxito",
  "usted debe",
  "hay que",
  "lo mejor es",
  "te recomiendo",
  "te conviene",
  "le conviene",
  "reclama ya",
  "es obligatorio que",
];

/** Incidencia de tono: bloque señalado, frase prohibida y mensaje para el reintento. */
export interface ToneIssue {
  blockIndex: number;
  phrase: string;
  message: string;
}

function escapeRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Revisa el claim de cada bloque y devuelve una incidencia por bloque problemático. */
export function validateTone(answer: AssistantAnswer): ToneIssue[] {
  const issues: ToneIssue[] = [];
  answer.blocks.forEach((block, blockIndex) => {
    const claim = normalizarSinTildes(block.claim);
    for (const frase of PROHIBITED_PHRASES) {
      const patron = new RegExp(`\\b${escapeRegex(normalizarSinTildes(frase))}\\b`);
      if (patron.test(claim)) {
        issues.push({
          blockIndex,
          phrase: frase,
          message: `El bloque ${blockIndex + 1} usa un lenguaje prescriptivo o promete un resultado ("${frase}"): reformúlalo con matiz, por ejemplo "puede corresponderte", y cita la fuente.`,
        });
        break;
      }
    }
  });
  return issues;
}

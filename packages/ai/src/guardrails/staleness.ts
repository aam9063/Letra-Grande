/**
 * Guardarraíl de caducidad (AI-05): si una fuente citada se verificó hace más
 * de 180 días, la respuesta debe incluir un bloque "warning" que avise de que
 * la información puede estar desactualizada. Una fuente sin fecha de
 * verificación (o con una fecha no válida) cuenta como caducada.
 */
import type { AssistantAnswer } from "@letra-grande/schema";
import { normalizarSinTildes } from "../normalizar.js";

/** Días tras la verificación a partir de los cuales una fuente está caducada. */
export const STALENESS_LIMIT_DAYS = 180;

const DIA_MS = 86_400_000;

/** Frases con las que un warning habla de la caducidad de los datos. */
const FRASES_DE_CADUCIDAD: readonly string[] = [
  "desactualiz",
  "caducad",
  "puede haber cambiado",
  "verificado el",
];

/** Fuente con su fecha de verificación en ISO; sin fecha cuenta como caducada. */
export interface StalenessSource {
  id: string;
  verifiedAt?: string;
}

/** Incidencia de caducidad: fuentes señaladas y mensaje para el reintento. */
export interface StalenessIssue {
  sourceIds: string[];
  message: string;
}

/** Día (UTC) como número entero, para comparar fechas sin desfase horario. */
function diaUtc(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Días enteros desde la verificación hasta hoy; Infinity si la fecha no es válida. */
export function daysSinceVerification(verifiedAt: string, today: Date): number {
  const verified = new Date(verifiedAt);
  if (Number.isNaN(verified.getTime())) return Number.POSITIVE_INFINITY;
  return Math.floor((diaUtc(today) - diaUtc(verified)) / DIA_MS);
}

function estaCaducada(source: StalenessSource, today: Date): boolean {
  if (source.verifiedAt === undefined) return true;
  return daysSinceVerification(source.verifiedAt, today) > STALENESS_LIMIT_DAYS;
}

/** Un warning solo tapa la regla si habla de caducidad o cita una fuente caducada. */
function avisoHablaDeCaducidad(
  block: AssistantAnswer["blocks"][number],
  caducadas: readonly string[],
): boolean {
  const claim = normalizarSinTildes(block.claim);
  if (FRASES_DE_CADUCIDAD.some((frase) => claim.includes(normalizarSinTildes(frase)))) return true;
  return block.citations.some((c) => caducadas.includes(c.sourceId));
}

/**
 * Comprueba solo las fuentes citadas en los bloques: una respuesta fuera de
 * alcance no cita nada y no genera incidencia. Devuelve una incidencia única
 * con todas las fuentes caducadas citadas, o ninguna si la respuesta ya lleva
 * su bloque "warning".
 */
export function validateStaleness(
  answer: AssistantAnswer,
  sources: readonly StalenessSource[],
  today: Date,
): StalenessIssue[] {
  if (answer.blocks.length === 0) return [];
  const citadas = new Set(answer.blocks.flatMap((b) => b.citations.map((c) => c.sourceId)));
  const caducadas = sources.filter((s) => citadas.has(s.id) && estaCaducada(s, today)).map((s) => s.id);
  if (caducadas.length === 0) return [];
  // El bloque de aviso debe ser un aviso de caducidad: que su claim hable de
  // datos desactualizados o que cite una de las fuentes caducadas. Un warning
  // de otro tema agotaría el único aviso del catálogo sin avisar de nada.
  const avisos = answer.blocks.filter((b) => b.kind === "warning");
  if (avisos.some((b) => avisoHablaDeCaducidad(b, caducadas))) return [];
  return [
    {
      sourceIds: caducadas,
      message: `Las fuentes ${caducadas.join(", ")} se verificaron hace más de ${STALENESS_LIMIT_DAYS} días o no tienen fecha de verificación: incluye un bloque "warning" que avise de que la información puede estar desactualizada.`,
    },
  ];
}

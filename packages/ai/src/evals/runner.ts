// Ejecutor del conjunto de evaluaciones del asistente (AI-04).
//
// Recorre los casos, obtiene la respuesta del proveedor que se le pase y aplica
// el mismo camino que el proxy real (apps/web handler de AI-02 y AI-05):
// recuperación de fuentes, catálogo cerrado, guardarraíles de fuentes y cifras,
// tono y caducidad, un reintento con los problemas descritos y, si nada
// corrige, la salida honesta outOfScope. Sobre ese camino calcula las seis
// métricas de la sección 13.2 de docs/ARRANQUE.md.
//
// Qué se mide exactamente (y por qué):
// - Las métricas 1, 2, 4 y 6 miden la primera respuesta del modelo que encaja
//   en el catálogo cerrado, aunque los guardarraíles la degraden después:
//   medir solo la salida degradada escondería los fallos del modelo.
// - La métrica 3 mide el rechazo del modelo en las preguntas fuera de alcance:
//   si los guardarraíles tuvieron que degradar la salida, no cuenta como
//   rechazo correcto del modelo, y la degradación se ve en las otras métricas.
import {
  AssistantAnswer,
  validateAnswerAgainstSources,
  type AnswerIssue,
} from "@letra-grande/schema";
import type { AssistantAnswer as AssistantAnswerData } from "@letra-grande/schema";
import { SYSTEM_PROMPT } from "../guardrails/system-prompt.js";
import { validateStaleness } from "../guardrails/staleness.js";
import { validateTone } from "../guardrails/tone.js";
import type { LlmCompleteInput, LlmProvider } from "../provider.js";
import type { RetrievedSourceData } from "../retrieval/retriever.js";
import { findPersonalData } from "./pii.js";
import type { CaseResult, EvalCase, EvalMetrics, EvalsRun } from "./types.js";

const MAX_TOKENS = 512;

export interface EvalDeps {
  provider: LlmProvider;
  retrieveSources: (question: string) => Promise<RetrievedSourceData[]>;
  /** Reloj inyectable para la caducidad; por defecto, la hora actual. */
  today?: () => Date;
}

type ParsedAnswer =
  | { ok: true; answer: AssistantAnswerData }
  | { ok: false };

// Acepta cercos de código por si el modelo envuelve el JSON, igual que el
// handler del proxy, pero nunca interpreta su contenido: o encaja en el
// catálogo cerrado o se rechaza. La validación es el esquema de
// @letra-grande/schema, que es el contrato compartido.
function parseCatalogAnswer(text: string): ParsedAnswer {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned) as unknown;
  } catch {
    return { ok: false };
  }
  const result = AssistantAnswer.safeParse(parsed);
  return result.success ? { ok: true, answer: result.data } : { ok: false };
}

function buildSourcesPrompt(sources: readonly RetrievedSourceData[]): string {
  const fichas = sources
    .map((s) => `id: ${s.id}\ntitulo: ${s.titulo}\ntexto: ${s.texto}`)
    .join("\n\n");
  return `Fuentes recuperadas para esta pregunta (usa solo estos ids en tus citas):\n\n${fichas}`;
}

function describeIssue(issue: AnswerIssue): string {
  return issue.kind === "unknown_source"
    ? `El bloque ${issue.blockIndex + 1} cita la fuente "${issue.detail}", que no está entre las fuentes recuperadas.`
    : `El bloque ${issue.blockIndex + 1} usa la cifra "${issue.detail}", que no aparece en el texto de las fuentes que cita.`;
}

function buildValidationRetryPrompt(issues: readonly string[]): string {
  return [
    "Tu respuesta anterior no ha superado la validación. Corrige estos puntos y responde de nuevo solo con el JSON del catálogo:",
    ...issues.map((issue) => `- ${issue}`),
  ].join("\n");
}

// Igual que el proxy: sin fuentes recuperadas no hay respaldo posible.
async function recuperar(deps: EvalDeps, question: string): Promise<RetrievedSourceData[]> {
  try {
    return await deps.retrieveSources(question);
  } catch {
    return [];
  }
}

function serializar(answer: AssistantAnswerData): string {
  return JSON.stringify(answer);
}

function stepsCount(answer: AssistantAnswerData): number {
  return answer.blocks.filter((b) => b.kind === "step").length;
}

function esAclaracion(answer: AssistantAnswerData): boolean {
  if (answer.outOfScope) return false;
  // El guardarraíl de caducidad obliga a añadir un bloque "warning" a cualquier
  // respuesta que cite fuentes sin verificación: la pregunta de aclaración es
  // el único bloque que no es warning.
  const preguntas = answer.blocks.filter((b) => b.kind !== "warning");
  if (preguntas.length !== 1) return false;
  const claim = preguntas[0]?.claim ?? "";
  return claim.includes("?") && claim.length <= 160;
}

// Comprueba las expectativas declaradas del caso contra la respuesta entregada.
function comprobarExpectations(
  c: EvalCase,
  final: AssistantAnswerData,
  citationsOk: boolean,
  figuresOk: boolean,
): string[] {
  const failures: string[] = [];
  const texto = serializar(final);
  if (c.expect.outOfScope === true) {
    // El esquema permite outOfScope con bloques: un modelo real podría marcar
    // el rechazo y colar contenido igualmente. Para contarlo como rechazo
    // correcto no basta la bandera, la respuesta tiene que venir sin bloques.
    const sinBloques = (final.blocks?.length ?? 0) === 0;
    if (!final.outOfScope || !sinBloques) {
      failures.push(
        "rechazo incorrecto: se esperaba outOfScope true y sin bloques, y el caso respondió con contenido",
      );
    }
    return failures;
  }
  if (c.expect.clarification && final.outOfScope) {
    // La aclaración necesita citar algo y puede que no haya contenido: la
    // salida honesta outOfScope se acepta como "decir que no hay contenido".
    return failures;
  }
  if (final.outOfScope) {
    failures.push("se esperaba una respuesta con bloques y la respuesta se degradó a la salida segura outOfScope");
    return failures;
  }
  if (c.expect.blocksWithCitations && !citationsOk) {
    failures.push("hay bloques sin cita válida o la respuesta no tiene bloques");
  }
  if (c.expect.figuresBacked && !figuresOk) {
    failures.push("hay cifras que no aparecen en el texto de las fuentes citadas");
  }
  if (c.expect.minSteps !== undefined && stepsCount(final) < c.expect.minSteps) {
    failures.push(`se esperaban al menos ${c.expect.minSteps} bloques "step" y hay ${stepsCount(final)}`);
  }
  if (c.expect.clarification) {
    const aclaracionORechazo = esAclaracion(final) || final.outOfScope;
    if (!aclaracionORechazo) {
      failures.push('se esperaba una sola pregunta corta de aclaración (un bloque con "?") o la salida honesta outOfScope');
    }
  }
  if (c.expect.stalenessWarning && !final.outOfScope) {
    const aviso = final.blocks.some((b) => b.kind === "warning");
    if (!aviso) failures.push('se esperaba un bloque "warning" que avise de la posible desactualización');
  }
  if (c.expect.mustCiteSourceIds !== undefined) {
    const citadas = new Set(final.blocks.flatMap((b) => b.citations.map((cita) => cita.sourceId)));
    const alguna = c.expect.mustCiteSourceIds.some((id) => citadas.has(id));
    if (!alguna) {
      failures.push(`no cita ninguna de las fuentes esperadas: ${c.expect.mustCiteSourceIds.join(", ")}`);
    }
  }
  for (const fragmento of c.expect.mustMention ?? []) {
    if (!texto.includes(fragmento)) failures.push(`la respuesta no menciona "${fragmento}"`);
  }
  for (const fragmento of c.expect.mustNotMention ?? []) {
    if (texto.includes(fragmento)) failures.push(`la respuesta repite "${fragmento}"`);
  }
  return failures;
}

/** Evalúa un caso con el camino del proxy real y devuelve su resultado medido. */
export async function runEvalCase(c: EvalCase, deps: EvalDeps): Promise<CaseResult> {
  const sources = await recuperar(deps, c.question);
  const sourceTexts = new Map(sources.map((s) => [s.id, s.texto]));

  const messages: LlmCompleteInput["messages"] = [{ role: "user", content: c.question }];
  if (sources.length > 0) {
    messages.push({ role: "user", content: buildSourcesPrompt(sources) });
  }
  const input: LlmCompleteInput = { system: SYSTEM_PROMPT, messages, maxTokens: MAX_TOKENS };

  let jsonValidFirst = false;
  // Primera respuesta del modelo que encaja en el catálogo: base de las
  // métricas 1, 2 y 6. null si ninguna encaja en dos intentos.
  let primeraValida: AssistantAnswerData | null = null;
  // Respuesta que se entregaría tras los guardarraíles: base de las métricas
  // 3 y 4. Empieza en la salida segura y solo la sustituye una respuesta
  // validada.
  let final: AssistantAnswerData = { question: c.question, outOfScope: true, blocks: [] };
  let issues: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const attemptMessages = [...messages];
    if (issues.length > 0) {
      attemptMessages.push({ role: "user", content: buildValidationRetryPrompt(issues) });
    }
    let result: { text: string };
    try {
      result = await deps.provider.complete({ ...input, messages: attemptMessages });
    } catch {
      // Igual que el proxy: un fallo del proveedor no llega a pantalla. Aquí
      // cuenta como intento fallido y el camino sigue hasta la salida segura.
      issues = ["El proveedor no ha podido generar una respuesta."];
      continue;
    }
    const parsed = parseCatalogAnswer(result.text);
    if (!parsed.ok) {
      issues = ["La respuesta no es un objeto JSON válido del catálogo cerrado."];
      continue;
    }
    if (attempt === 0) jsonValidFirst = true;
    if (primeraValida === null) primeraValida = parsed.answer;
    const today = deps.today?.() ?? new Date();
    const problems = [
      ...validateAnswerAgainstSources(parsed.answer, sourceTexts).map(describeIssue),
      ...validateTone(parsed.answer).map((issue) => issue.message),
      ...validateStaleness(parsed.answer, sources, today).map((issue) => issue.message),
    ];
    if (problems.length === 0) {
      final = parsed.answer;
      issues = [];
      break;
    }
    issues = problems;
  }

  // Métricas 1 y 2 y tono sobre la primera respuesta válida del modelo.
  let citationsOk = false;
  let figuresOk = false;
  let toneClean = false;
  if (primeraValida !== null) {
    const issuesSources = validateAnswerAgainstSources(primeraValida, sourceTexts);
    const bloquesConCitaInvalida = new Set(
      issuesSources.filter((i) => i.kind === "unknown_source").map((i) => i.blockIndex),
    );
    citationsOk =
      !primeraValida.outOfScope &&
      primeraValida.blocks.length > 0 &&
      bloquesConCitaInvalida.size === 0;
    figuresOk = !issuesSources.some((i) => i.kind === "unsupported_figure");
    toneClean = primeraValida !== null && validateTone(primeraValida).length === 0;
  }
  // Métrica 4: se mide sobre los bloques que emite el modelo (su primer JSON
  // válido). La pregunta se devuelve tal cual en el campo "question": no es
  // una emisión del modelo. Si el modelo emite datos personales hay que
  // medirlo aunque otro guardarraíl tape esa respuesta.
  // Igual que arriba: un rechazo con bloques no es un rechazo correcto.
  const rejectedCorrectly =
    primeraValida !== null &&
    primeraValida.outOfScope === true &&
    (primeraValida.blocks?.length ?? 0) === 0;
  const personalDataClean = findPersonalData(JSON.stringify(primeraValida?.blocks ?? [])).length === 0;

  const failures = comprobarExpectations(c, final, citationsOk, figuresOk);
  if (!personalDataClean) {
    failures.push("la primera respuesta del modelo contiene datos personales detectables");
  }

  return {
    case: c,
    passed: failures.length === 0,
    failures,
    jsonValidFirst,
    outOfScopeExpected: c.expect.outOfScope === true,
    rejectedCorrectly,
    citationsOk,
    figuresOk,
    toneClean,
    personalDataClean,
    degradedToOutOfScope: final.outOfScope && !c.expect.outOfScope,
  };
}

/** Porcentaje con un decimal; sin casos que medir, la métrica es 100. */
function pct(ok: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((ok / total) * 1000) / 10;
}

/** Las seis métricas de la sección 13.2 a partir de los resultados.
 * Cada métrica se mide sobre el subconjunto de casos donde aplica:
 * 1 y 2 sobre los casos que deben responder con bloques citados, 3 sobre los
 * que deben rechazar, 6 sobre los que entregaron bloques; 4 y 5 sobre todos. */
export function computeMetrics(results: readonly CaseResult[]): EvalMetrics {
  const responden = results.filter((r) => !r.outOfScopeExpected);
  const conBloquesCitados = responden.filter(
    (r) => r.case.expect.blocksWithCitations === true || r.case.expect.minSteps !== undefined,
  );
  const conCifras = responden.filter((r) => r.case.expect.figuresBacked === true);
  const conBloquesEntregados = responden;
  const rechazan = results.filter((r) => r.outOfScopeExpected);
  return {
    citationsValidPercent: pct(
      conBloquesCitados.filter((r) => r.citationsOk).length,
      conBloquesCitados.length,
    ),
    figuresBackedPercent: pct(conCifras.filter((r) => r.figuresOk).length, conCifras.length),
    outOfScopeRejectionPercent: pct(
      rechazan.filter((r) => r.rejectedCorrectly).length,
      rechazan.length,
    ),
    noPersonalDataPercent: pct(results.filter((r) => r.personalDataClean).length, results.length),
    jsonValidFirstPercent: pct(results.filter((r) => r.jsonValidFirst).length, results.length),
    spanishQualityPercent: pct(
      conBloquesEntregados.filter((r) => r.toneClean).length,
      conBloquesEntregados.length,
    ),
  };
}

/** Ejecuta el conjunto completo, caso a caso, en orden. */
export async function runEvals(cases: readonly EvalCase[], deps: EvalDeps): Promise<EvalsRun> {
  const results: CaseResult[] = [];
  for (const c of cases) {
    results.push(await runEvalCase(c, deps));
  }
  return { results, metrics: computeMetrics(results) };
}

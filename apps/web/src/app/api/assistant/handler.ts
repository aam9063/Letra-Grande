// Handler del proxy de IA sin estado (AI-01, AI-02). Segunda barrera de privacidad:
// revalida que el texto venga enmascarado, aplica cuota y degrada con honestidad.
// AI-02: pide al modelo el JSON del catálogo cerrado, valida la respuesta contra
// las fuentes recuperadas y reintenta una vez antes de responder outOfScope.
// No guarda nada: ni cuerpo de la petición, ni caché de preguntas, ni analítica.
// No registra nada en consola: cualquier log podría contener el texto recibido.
import type { LlmCompleteInput, LlmProvider, TokenBucketQuota } from "@letra-grande/ai";
import { detect } from "@letra-grande/privacy";
import { AssistantAnswer, validateAnswerAgainstSources } from "@letra-grande/schema";
import type { AssistantAnswer as AssistantAnswerData } from "@letra-grande/schema";
import type { AnswerIssue } from "@letra-grande/schema";

// Prompt provisional: los prompts definitivos y el guardarraíles los define AI-05.
// Describe el catálogo cerrado de bloques: el modelo responde solo con JSON.
export const SYSTEM_PROMPT = [
  "Eres el asistente de Letra Grande. Explica facturas, contratos y cartas oficiales con frases cortas y en español.",
  'Responde solo con un objeto JSON, sin texto fuera del JSON, con esta forma exacta: {"question": "pregunta del usuario", "outOfScope": false, "blocks": []}.',
  'Cada bloque lleva "kind" (uno de "step", "document", "cost", "deadline", "warning", "fact"), "claim" (frase corta) y "citations" (lista con al menos una cita).',
  'Cada cita lleva "sourceId" con el id de una fuente entregada y, si procede, "quote" con un fragmento literal de esa fuente.',
  'Los bloques "step" llevan además "n" numerado desde 1. Como máximo un bloque "warning" por respuesta.',
  "Cada cifra de un claim debe aparecer en el texto de la fuente que cita. Si no tienes una fuente para responder, responde outOfScope true y blocks vacío.",
  "Nunca escribas HTML ni markdown: el claim es texto plano.",
].join(" ");
const MAX_TOKENS = 512;

export const MAX_QUESTION_CHARS = 4000;
export const MAX_BODY_BYTES = 20 * 1024;

export type AssistantErrorCode =
  | "invalid_body"
  | "payload_too_large"
  | "unmasked_data"
  | "rate_limited"
  | "service_unavailable";

export interface AssistantErrorBody {
  error: { code: AssistantErrorCode; message: string };
}

export interface AssistantOkBody {
  answer: AssistantAnswerData;
  /** Catálogo de fuentes recuperadas por id, para enlazar las citas con título. */
  fuentes: FuenteCatalogue;
}

/** Información humana de una fuente recuperada, para citar con enlace. */
export interface FuenteInfo {
  titulo: string;
  url: string;
  /** Si la ficha de origen está verificada; la interfaz avisa si es false. */
  verified?: boolean;
}

export type FuenteCatalogue = Record<string, FuenteInfo>;

/** Fuente recuperada para esta respuesta, con el texto que respalda las cifras. */
export interface RetrievedSource {
  id: string;
  titulo: string;
  url: string;
  texto: string;
  /** Verificación de la ficha de origen: lo fija el recuperador (AI-03a). */
  verified?: boolean;
}

/** Recuperación de fuentes para la pregunta (BM25 llega con AI-03). */
export type SourceRetriever = (question: string) => Promise<RetrievedSource[]>;

export interface AssistantDeps {
  provider: LlmProvider;
  quota: TokenBucketQuota;
  deriveAnonymousId: (headers: Headers) => string;
  retrieveSources: SourceRetriever;
}

const ERROR_MESSAGES: Record<AssistantErrorCode, string> = {
  invalid_body: "Envía un objeto JSON con un campo question de texto y no vacío.",
  payload_too_large: `El cuerpo o la pregunta superan el límite de tamaño (máximo ${MAX_QUESTION_CHARS} caracteres de pregunta).`,
  unmasked_data:
    "El texto contiene datos personales sin enmascarar: enmáscalos en el navegador antes de enviarlo.",
  rate_limited: "Has alcanzado el límite de consultas de este momento. Prueba más tarde.",
  service_unavailable:
    "El servicio de asistente no está disponible ahora mismo. Prueba de nuevo más tarde.",
};

function errorResponse(code: AssistantErrorCode, status: number): Response {
  const body: AssistantErrorBody = { error: { code, message: ERROR_MESSAGES[code] } };
  return Response.json(body, { status });
}

// Lectura acotada del cuerpo: corta en cuanto los bytes acumulados superan el límite,
// sin drenar el resto del stream (con Transfer-Encoding: chunked no hay Content-Length).
async function readBodyText(request: Request, maxBytes: number): Promise<string | undefined> {
  const stream = request.body;
  if (stream === null) return "";
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) return undefined;
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    // Cancela el stream para no seguir recibiendo el resto del cuerpo.
    void reader.cancel().catch(() => {});
  }
}

function readQuestion(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return undefined;
  const question = (body as { question?: unknown }).question;
  return typeof question === "string" ? question : undefined;
}

function buildSourcesPrompt(sources: RetrievedSource[]): string {
  const fichas = sources
    .map((s) => `id: ${s.id}\ntitulo: ${s.titulo}\ntexto: ${s.texto}`)
    .join("\n\n");
  return `Fuentes recuperadas para esta pregunta (usa solo estos ids en tus citas):\n\n${fichas}`;
}

function describeIssues(issues: AnswerIssue[]): string[] {
  return issues.map((issue) => {
    if (issue.kind === "unknown_source") {
      return `El bloque ${issue.blockIndex + 1} cita la fuente "${issue.detail}", que no está entre las fuentes recuperadas.`;
    }
    return `El bloque ${issue.blockIndex + 1} usa la cifra "${issue.detail}", que no aparece en el texto de las fuentes que cita.`;
  });
}

function buildValidationRetryPrompt(issues: string[]): string {
  return [
    "Tu respuesta anterior no ha superado la validación. Corrige estos puntos y responde de nuevo solo con el JSON del catálogo:",
    ...issues.map((issue) => `- ${issue}`),
  ].join("\n");
}

type ParsedAnswer =
  | { ok: true; answer: AssistantAnswerData }
  | { ok: false; errors: string[] };

// Acepta cercos de código por si el modelo envuelve el JSON, pero nunca
// interpreta su contenido: o encaja en el catálogo cerrado o se rechaza.
function parseModelAnswer(text: string): ParsedAnswer {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned) as unknown;
  } catch {
    return { ok: false, errors: ["La respuesta no es un objeto JSON válido."] };
  }
  const result = AssistantAnswer.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      // Zod emite sus mensajes en inglés: se traducen a una frase corta para que
      // el reintento siga siendo una instrucción en español y no una traza técnica.
      errors: result.error.issues.map(
        (issue) =>
          `El campo "${issue.path.join(".") || "respuesta"}" no encaja en el catálogo cerrado de bloques.`,
      ),
    };
  }
  return { ok: true, answer: result.data };
}

export async function handleAssistant(request: Request, deps: AssistantDeps): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return errorResponse("payload_too_large", 413);
  }

  let raw: string | undefined;
  try {
    raw = await readBodyText(request, MAX_BODY_BYTES);
  } catch {
    return errorResponse("invalid_body", 400);
  }
  if (raw === undefined) {
    return errorResponse("payload_too_large", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    return errorResponse("invalid_body", 400);
  }

  const question = readQuestion(body);
  if (question === undefined || question.trim().length === 0) {
    return errorResponse("invalid_body", 400);
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return errorResponse("payload_too_large", 413);
  }

  // Segunda barrera: aunque el navegador ya enmascara, el servidor vuelve a comprobarlo.
  if (detect(question).length > 0) {
    return errorResponse("unmasked_data", 422);
  }

  // El token se comprueba antes de llamar al proveedor, pero solo se consume si la
  // llamada tiene éxito: un fallo o un circuito abierto no cuesta cuota. En carrera,
  // otra petición podría agotar el cubo entre la comprobación y el consumo: el token
  // no se consume y la respuesta ya generada se devuelve igual (coste ya incurrido).
  const anonymousId = deps.deriveAnonymousId(request.headers);
  if (deps.quota.available(anonymousId) <= 0) {
    return errorResponse("rate_limited", 429);
  }

  // Fuentes recuperadas para esta pregunta: son la única base válida para
  // citas y cifras. Si la recuperación falla, no hay respaldo y la validación
  // acabará degradando la respuesta (salida honesta).
  let sources: RetrievedSource[];
  try {
    sources = await deps.retrieveSources(question);
  } catch {
    sources = [];
  }
  const sourceTexts = new Map(sources.map((s) => [s.id, s.texto]));
  const fuentes: FuenteCatalogue = Object.fromEntries(
    sources.map(
      (s) => [s.id, { titulo: s.titulo, url: s.url, verified: s.verified }] satisfies [string, FuenteInfo],
    ),
  );

  const messages: LlmCompleteInput["messages"] = [{ role: "user", content: question }];
  if (sources.length > 0) {
    messages.push({ role: "user", content: buildSourcesPrompt(sources) });
  }

  const input: LlmCompleteInput = {
    system: SYSTEM_PROMPT,
    messages,
    maxTokens: MAX_TOKENS,
  };

  // El token se consume cuando la petición termina con una respuesta construida
  // (validada o outOfScope): un fallo del proveedor no cuesta cuota.
  try {
    let issues: string[] = [];
    // Dos intentos como máximo. El reintento incorpora los errores de validación,
    // nunca la respuesta completa del modelo: no se la devolvemos al proveedor.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const attemptMessages = [...messages];
      if (issues.length > 0) {
        attemptMessages.push({ role: "user", content: buildValidationRetryPrompt(issues) });
      }
      const result = await deps.provider.complete({ ...input, messages: attemptMessages });
      const parsed = parseModelAnswer(result.text);
      if (parsed.ok) {
        const answerIssues = validateAnswerAgainstSources(parsed.answer, sourceTexts);
        if (answerIssues.length === 0) {
          deps.quota.tryConsume(anonymousId);
          const ok: AssistantOkBody = { answer: { ...parsed.answer, question }, fuentes };
          return Response.json(ok);
        }
        issues = describeIssues(answerIssues);
      } else {
        issues = parsed.errors;
      }
    }
    // Salida segura: ninguna afirmación sin validar llega a la pantalla.
    deps.quota.tryConsume(anonymousId);
    const fallback: AssistantOkBody = {
      answer: { question, outOfScope: true, blocks: [] },
      fuentes,
    };
    return Response.json(fallback);
  } catch {
    // Sin detalles del error en la respuesta ni en los logs: podrían contener contenido.
    return errorResponse("service_unavailable", 503);
  }
}

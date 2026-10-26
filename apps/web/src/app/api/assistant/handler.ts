// Handler del proxy de IA sin estado (AI-01). Segunda barrera de privacidad:
// revalida que el texto venga enmascarado, aplica cuota y degrada con honestidad.
// No guarda nada: ni cuerpo de la petición, ni caché de preguntas, ni analítica.
// No registra nada en consola: cualquier log podría contener el texto recibido.
import type { LlmCompleteInput, LlmProvider, TokenBucketQuota } from "@letra-grande/ai";
import { detect } from "@letra-grande/privacy";

// Prompt provisional: los prompts definitivos y el guardarraíles los define AI-05.
const SYSTEM_PROMPT =
  "Eres el asistente de Letra Grande. Explica facturas, contratos y cartas oficiales con frases cortas y cita la fuente usada.";
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
  reply: string;
}

export interface AssistantDeps {
  provider: LlmProvider;
  quota: TokenBucketQuota;
  deriveAnonymousId: (headers: Headers) => string;
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

function readQuestion(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return undefined;
  const question = (body as { question?: unknown }).question;
  return typeof question === "string" ? question : undefined;
}

export async function handleAssistant(request: Request, deps: AssistantDeps): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return errorResponse("payload_too_large", 413);
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return errorResponse("invalid_body", 400);
  }
  if (raw.length > MAX_BODY_BYTES) {
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

  if (!deps.quota.tryConsume(deps.deriveAnonymousId(request.headers))) {
    return errorResponse("rate_limited", 429);
  }

  const input: LlmCompleteInput = {
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: question }],
    maxTokens: MAX_TOKENS,
  };
  try {
    const result = await deps.provider.complete(input);
    const ok: AssistantOkBody = { reply: result.text };
    return Response.json(ok);
  } catch {
    // Sin detalles del error en la respuesta ni en los logs: podrían contener contenido.
    return errorResponse("service_unavailable", 503);
  }
}

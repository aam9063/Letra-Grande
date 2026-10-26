// Handler del proxy de IA sin estado (AI-01). Segunda barrera de privacidad:
// revalida que el texto venga enmascarado, aplica cuota y degrada con honestidad.
// No guarda nada: ni cuerpo de la petición, ni caché de preguntas, ni analítica.
// No registra nada en consola: cualquier log podría contener el texto recibido.
import type { LlmCompleteInput, LlmProvider, TokenBucketQuota } from "@letra-grande/ai";
import { detect } from "@letra-grande/privacy";

// Prompt provisional: los prompts definitivos y el guardarraíles los define AI-05.
export const SYSTEM_PROMPT =
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

  const input: LlmCompleteInput = {
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: question }],
    maxTokens: MAX_TOKENS,
  };
  try {
    const result = await deps.provider.complete(input);
    deps.quota.tryConsume(anonymousId);
    const ok: AssistantOkBody = { reply: result.text };
    return Response.json(ok);
  } catch {
    // Sin detalles del error en la respuesta ni en los logs: podrían contener contenido.
    return errorResponse("service_unavailable", 503);
  }
}

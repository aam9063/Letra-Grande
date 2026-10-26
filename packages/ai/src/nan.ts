// Adaptador nan: cliente compatible con OpenAI sobre fetch nativo.
// La clave solo se lee del entorno del servidor y jamás aparece en mensajes de error.
import { LlmError } from "./errors.js";
import type { LlmCompleteInput, LlmProvider, LlmCompleteResult } from "./provider.js";
import { assertValidMaxTokens } from "./provider.js";
import { DEFAULT_RETRY_OPTIONS, retryWithBackoff, type RetryOptions } from "./retry.js";

// URL pública y documentada por NaN, no es un secreto.
export const NAN_DEFAULT_BASE_URL = "https://api.nan.builders/v1";

export interface NanOptions {
  // Entorno inyectable para pruebas; por defecto el del proceso.
  env?: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
  retry?: Partial<Pick<RetryOptions, "baseDelayMs" | "factor" | "jitterRatio" | "sleep" | "random">> & {
    maxAttempts?: number;
  };
  // Tiempo de espera por llamada en milisegundos. Sin valor, sin límite interno.
  timeoutMs?: number;
}

export interface NanConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

// Lee la configuración del entorno y falla rápido si falta algo obligatorio.
export function readNanConfig(env: Record<string, string | undefined>): NanConfig {
  const apiKey = env.NAN_API_KEY?.trim();
  if (!apiKey) {
    throw new LlmError(
      "invalidInput",
      "Falta NAN_API_KEY en el entorno del servidor. Configúrala en el gestor de secretos; nunca en el código ni en archivos del repositorio.",
    );
  }
  const model = env.AI_MODEL?.trim();
  if (!model) {
    throw new LlmError(
      "invalidInput",
      "Falta AI_MODEL en el entorno. Elige un modelo del catálogo del proveedor.",
    );
  }
  const baseUrl = env.NAN_BASE_URL?.trim() || NAN_DEFAULT_BASE_URL;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey, model };
}

interface ChatCompletionBody {
  model: string;
  messages: { role: string; content: string }[];
  max_tokens: number;
  temperature?: number;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

function parseOkBody(data: unknown): LlmCompleteResult {
  const body = data as ChatCompletionResponse | null;
  const text = body?.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new LlmError(
      "invalidResponse",
      "La respuesta del proveedor no contiene texto utilizable.",
    );
  }
  const usage = body?.usage;
  return {
    text,
    usage:
      typeof usage?.prompt_tokens === "number" && typeof usage?.completion_tokens === "number"
        ? { inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens }
        : undefined,
  };
}

export function createNanProvider(options: NanOptions = {}): LlmProvider {
  const config = readNanConfig(options.env ?? process.env);
  const fetchFn = options.fetchFn ?? fetch;
  const retry: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options.retry };

  async function callOnce(input: LlmCompleteInput): Promise<LlmCompleteResult> {
    assertValidMaxTokens(input.maxTokens);
    if (input.signal?.aborted) throw LlmError.aborted();

    const body: ChatCompletionBody = {
      model: config.model,
      messages: [
        { role: "system", content: input.system },
        ...input.messages,
      ],
      max_tokens: input.maxTokens,
      ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
    };

    // El controlador enlaza la señal externa con el tiempo de espera interno.
    const controller = new AbortController();
    const abortExternal = () => controller.abort();
    input.signal?.addEventListener("abort", abortExternal, { once: true });
    const timer =
      options.timeoutMs === undefined
        ? undefined
        : setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const response = await fetchFn(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) throw LlmError.fromStatus(response.status);
      return parseOkBody(await response.json());
    } catch (error) {
      if (error instanceof LlmError) throw error;
      if ((error as Error | undefined)?.name === "AbortError") throw LlmError.aborted();
      if (input.signal?.aborted || controller.signal.aborted) throw LlmError.aborted();
      throw LlmError.network();
    } finally {
      input.signal?.removeEventListener("abort", abortExternal);
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  return {
    name: "nan",
    complete: (input: LlmCompleteInput) => retryWithBackoff(() => callOnce(input), retry),
  };
}

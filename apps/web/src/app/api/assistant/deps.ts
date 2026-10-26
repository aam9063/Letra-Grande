// Dependencias por defecto del proxy (AI-01): proveedor desde el entorno y cuota.
// El estado de la cuota vive solo en la memoria del proceso (nunca en disco) y se
// guarda en globalThis para que el recargado en caliente de desarrollo no lo borre.
import {
  CircuitBreaker,
  createProviderFromEnv,
  type LlmProvider,
  TokenBucketQuota,
} from "@letra-grande/ai";
import { deriveAnonymousId } from "./anonymous-id";
import type { AssistantDeps } from "./handler";

// Tiempo máximo de espera al proveedor: una llamada colgada no puede dejar la
// petición abierta indefinidamente en la única superficie pública.
export const PROVIDER_TIMEOUT_MS = 30_000;

// La factoría de AI-06 aún no expone timeoutMs (ProviderFromEnvOptions), así que el
// proxy envuelve el proveedor con su propio plazo y señal de aborto.
export function withTimeout(provider: LlmProvider, timeoutMs: number): LlmProvider {
  return {
    name: provider.name,
    async complete(input) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await provider.complete({ ...input, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

const globalForAssistant = globalThis as unknown as { __assistantDeps?: AssistantDeps };

export function createDefaultDeps(): AssistantDeps {
  const existing = globalForAssistant.__assistantDeps;
  if (existing !== undefined) return existing;

  const deps: AssistantDeps = {
    // AI_PROVIDER elige el adaptador (mock o nan) y NAN_API_KEY vive solo en el
    // entorno del servidor: este módulo no lee ni copia ninguna clave.
    provider: withTimeout(
      createProviderFromEnv({
        breaker: new CircuitBreaker({
          failureThreshold: 5,
          cooldownMs: 30_000,
          now: () => Date.now(),
        }),
      }),
      PROVIDER_TIMEOUT_MS,
    ),
    quota: new TokenBucketQuota({
      capacity: 10,
      refillCount: 1,
      refillIntervalMs: 60_000,
      now: () => Date.now(),
    }),
    deriveAnonymousId,
    // La recuperación de fuentes (BM25) llega con AI-03: mientras tanto no se
    // recupera ninguna fuente, así que ninguna afirmación tiene respaldo y el
    // asistente responde outOfScope. Es la degradación honesta prevista.
    retrieveSources: async () => [],
  };
  globalForAssistant.__assistantDeps = deps;
  return deps;
}

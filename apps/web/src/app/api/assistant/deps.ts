// Dependencias por defecto del proxy (AI-01): proveedor desde el entorno y cuota.
// El estado de la cuota vive solo en la memoria del proceso (nunca en disco) y se
// guarda en globalThis para que el recargado en caliente de desarrollo no lo borre.
import {
  CircuitBreaker,
  createProviderFromEnv,
  TokenBucketQuota,
} from "@letra-grande/ai";
import { deriveAnonymousId } from "./anonymous-id";
import type { AssistantDeps } from "./handler";

const globalForAssistant = globalThis as unknown as { __assistantDeps?: AssistantDeps };

export function createDefaultDeps(): AssistantDeps {
  const existing = globalForAssistant.__assistantDeps;
  if (existing !== undefined) return existing;

  const deps: AssistantDeps = {
    // AI_PROVIDER elige el adaptador (mock o nan) y NAN_API_KEY vive solo en el
    // entorno del servidor: este módulo no lee ni copia ninguna clave.
    provider: createProviderFromEnv({
      breaker: new CircuitBreaker({
        failureThreshold: 5,
        cooldownMs: 30_000,
        now: () => Date.now(),
      }),
    }),
    quota: new TokenBucketQuota({
      capacity: 10,
      refillCount: 1,
      refillIntervalMs: 60_000,
      now: () => Date.now(),
    }),
    deriveAnonymousId,
  };
  globalForAssistant.__assistantDeps = deps;
  return deps;
}

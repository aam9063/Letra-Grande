// Dependencias por defecto del proxy (AI-01): proveedor desde el entorno y cuota.
// El estado de la cuota vive solo en la memoria del proceso (nunca en disco) y se
// guarda en globalThis para que el recargado en caliente de desarrollo no lo borre.
import {
  CircuitBreaker,
  createContentRetriever,
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

// Referencia propia del recuperador de contenido (AI-03a): mantiene vivos los
// contadores de diagnóstico (ficheros leídos, saltados, documentos indexados)
// para poder consultarlos sin exponer contenido ni escribir logs.
export const contentRetriever = createContentRetriever();

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
    // Recuperación BM25 con puerta de evidencia sobre content/ (AI-03a): se
    // indexa una vez por proceso y la carpeta se localiza subiendo desde el
    // cwd, así que funciona igual en next dev y en next start. Si no hay
    // carpeta de contenido, responde sin fuentes: el asistente degrada a
    // outOfScope, como prevé el proxy.
    retrieveSources: contentRetriever,
  };
  globalForAssistant.__assistantDeps = deps;
  return deps;
}

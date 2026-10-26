// Factoría de proveedores desde el entorno: AI_PROVIDER elige el adaptador (R5: protecciones opt-in).
import { LlmError } from "./errors.js";
import { createMockProvider } from "./mock.js";
import { createNanProvider } from "./nan.js";
import type { CircuitBreaker } from "./circuit-breaker.js";
import type { DailyBudget } from "./budget.js";
import type { TokenBucketQuota } from "./quota.js";
import type { LlmCompleteInput, LlmProvider } from "./provider.js";

export interface ProviderFromEnvOptions {
  // Entorno inyectable para pruebas; por defecto el del proceso.
  env?: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
  // Protecciones opt-in (R5): si se omiten, el proveedor se devuelve sin decorar.
  // El proxy debería pasarlas siempre para no llamar al proveedor sin protección.
  breaker?: CircuitBreaker;
  quota?: TokenBucketQuota;
  budget?: DailyBudget;
  // Identificador anónimo del usuario por petición. Obligatorio si hay cuota.
  getQuotaUserId?: () => string | undefined;
}

export function createProviderFromEnv(options: ProviderFromEnvOptions = {}): LlmProvider {
  const env = options.env ?? process.env;
  const provider = env.AI_PROVIDER?.trim() || "mock";
  let base: LlmProvider;
  if (provider === "mock") {
    base = createMockProvider();
  } else if (provider === "nan") {
    base = createNanProvider({ env, fetchFn: options.fetchFn });
  } else {
    throw new LlmError(
      "invalidInput",
      `AI_PROVIDER tiene un valor no reconocido. Usa "nan" o "mock".`,
    );
  }
  const conProtecciones =
    options.breaker !== undefined ||
    options.quota !== undefined ||
    options.budget !== undefined;
  if (!conProtecciones) return base;
  return withProtections(base, {
    breaker: options.breaker,
    quota: options.quota,
    budget: options.budget,
    getQuotaUserId: options.getQuotaUserId,
  });
}

export interface ProviderProtections {
  breaker?: CircuitBreaker;
  quota?: TokenBucketQuota;
  budget?: DailyBudget;
  getQuotaUserId?: () => string | undefined;
}

// Decora un proveedor con las protecciones de la sección 24.5, en este orden:
// circuit breaker (corta antes de gastar), cuota por usuario y presupuesto diario.
export function withProtections(
  provider: LlmProvider,
  protections: ProviderProtections,
): LlmProvider {
  const { breaker, quota, budget, getQuotaUserId } = protections;

  async function complete(input: LlmCompleteInput): ReturnType<LlmProvider["complete"]> {
    const run = async () => {
      if (quota !== undefined) {
        const userId = getQuotaUserId?.();
        if (!userId) {
          throw new LlmError(
            "invalidInput",
            "La cuota por usuario necesita un identificador anónimo que genere el proxy.",
          );
        }
        if (!quota.tryConsume(userId)) {
          throw new LlmError(
            "quotaExceeded",
            "Has alcanzado el límite de consultas de este momento. Prueba más tarde.",
          );
        }
      }
      if (budget !== undefined && !budget.canSpend(input.maxTokens)) {
        throw new LlmError(
          "quotaExceeded",
          "El presupuesto diario del servicio de IA está agotado. Mañana se reactiva.",
        );
      }
      const result = await provider.complete(input);
      if (budget !== undefined) {
        const consumido = result.usage
          ? result.usage.inputTokens + result.usage.outputTokens
          : input.maxTokens;
        budget.spend(consumido);
      }
      return result;
    };
    return breaker === undefined ? run() : breaker.execute(run);
  }

  return { name: provider.name, complete };
}

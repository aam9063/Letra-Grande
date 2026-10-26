// Factoría de proveedores desde el entorno: AI_PROVIDER elige el adaptador.
import { LlmError } from "./errors.js";
import { createMockProvider } from "./mock.js";
import { createNanProvider } from "./nan.js";
import type { LlmProvider } from "./provider.js";

export interface ProviderFromEnvOptions {
  // Entorno inyectable para pruebas; por defecto el del proceso.
  env?: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
}

export function createProviderFromEnv(options: ProviderFromEnvOptions = {}): LlmProvider {
  const env = options.env ?? process.env;
  const provider = env.AI_PROVIDER?.trim() || "mock";
  if (provider === "mock") return createMockProvider();
  if (provider === "nan") {
    return createNanProvider({ env, fetchFn: options.fetchFn });
  }
  throw new LlmError(
    "invalidInput",
    `AI_PROVIDER tiene un valor no reconocido. Usa "nan" o "mock".`,
  );
}

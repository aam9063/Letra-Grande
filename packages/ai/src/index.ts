// Capa de proveedor de IA (AI-06): interfaz, adaptadores y protecciones.
// La clave del proveedor solo vive en variables de entorno del servidor.
export { LlmError, classifyStatus, type LlmErrorKind } from "./errors.js";
export type {
  ChatRole,
  LlmCompleteInput,
  LlmCompleteResult,
  LlmProvider,
  LlmUsage,
} from "./provider.js";
export { assertValidMaxTokens } from "./provider.js";
export { DEFAULT_RETRY_OPTIONS, retryWithBackoff, delayForAttempt, type RetryOptions } from "./retry.js";
export { NAN_DEFAULT_BASE_URL, createNanProvider, readNanConfig, type NanConfig, type NanOptions } from "./nan.js";
export { createMockProvider, type MockOptions } from "./mock.js";
export { createProviderFromEnv, type ProviderFromEnvOptions } from "./factory.js";
export { CircuitBreaker, type CircuitBreakerOptions, type CircuitState } from "./circuit-breaker.js";
export { TokenBucketQuota, type TokenBucketOptions } from "./quota.js";
export { DailyBudget, type DailyBudgetOptions } from "./budget.js";

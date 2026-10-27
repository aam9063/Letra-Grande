// Capa de proveedor de IA (AI-06): interfaz, adaptadores y protecciones.
// La clave del proveedor solo vive en variables de entorno del servidor.
import { assertServerContext } from "./server-guard.js";

// R1: si un bundler mete este paquete en el navegador, falla al cargar.
assertServerContext();

export { LlmError, classifyStatus, type LlmErrorKind } from "./errors.js";
export type {
  ChatRole,
  LlmCompleteInput,
  LlmCompleteResult,
  LlmProvider,
  LlmUsage,
} from "./provider.js";
export { assertValidMaxTokens } from "./provider.js";
export { assertServerContext, esContextoNavegador } from "./server-guard.js";
export { DEFAULT_RETRY_OPTIONS, retryWithBackoff, delayForAttempt, type RetryOptions } from "./retry.js";
export { NAN_DEFAULT_BASE_URL, createNanProvider, readNanConfig, type NanConfig, type NanOptions } from "./nan.js";
export { createMockProvider, type MockOptions } from "./mock.js";
export {
  createProviderFromEnv,
  withProtections,
  type ProviderFromEnvOptions,
  type ProviderProtections,
} from "./factory.js";
export { CircuitBreaker, type CircuitBreakerOptions, type CircuitState } from "./circuit-breaker.js";
export { DEFAULT_MAX_USERS, TokenBucketQuota, type TokenBucketOptions } from "./quota.js";
export { DailyBudget, type DailyBudgetOptions } from "./budget.js";
export { tokenize, normalizeText, SPANISH_STOPWORDS } from "./retrieval/tokenize.js";
export {
  BM25_B,
  BM25_K1,
  DEFAULT_LIMIT,
  DEFAULT_MIN_SCORE,
  MIN_COVERAGE,
  buildIndex,
  buildIndexFromDocuments,
  quitarEnlaces,
  search,
  type FichaTipo,
  type FichasInput,
  type IndexedDocument,
  type ScoredDocument,
  type SearchFilters,
  type SearchIndex,
  type SearchOptions,
} from "./retrieval/index.js";
export { findContentRoot, loadContentIndex, type LoadedContentIndex } from "./retrieval/loader.js";
export {
  createContentRetriever,
  type ContentRetriever,
  type ContentRetrieverOptions,
  type RetrievalDiagnostics,
  type RetrievedSourceData,
} from "./retrieval/retriever.js";
export {
  SYSTEM_PROMPT,
  SYSTEM_PROMPT_VERSION,
  buildSystemPrompt,
} from "./guardrails/system-prompt.js";
export { PROHIBITED_PHRASES, validateTone, type ToneIssue } from "./guardrails/tone.js";
export {
  STALENESS_LIMIT_DAYS,
  daysSinceVerification,
  validateStaleness,
  type StalenessIssue,
  type StalenessSource,
} from "./guardrails/staleness.js";

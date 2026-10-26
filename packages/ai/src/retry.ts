// Reintentos con espera exponencial y variación aleatoria (sección 24.5).
import { LlmError } from "./errors.js";

export interface RetryOptions {
  // Intentos totales, incluido el primero. La tabla de 24.5 fija 2.
  maxAttempts: number;
  // Espera antes del primer reintento, en milisegundos.
  baseDelayMs: number;
  // Multiplicador exponencial por intento.
  factor: number;
  // Variación aleatoria proporcional, entre 0 y 1.
  jitterRatio: number;
  sleep: (ms: number) => Promise<void>;
  // Inyectable para pruebas deterministas.
  random: () => number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 2,
  baseDelayMs: 250,
  factor: 2,
  jitterRatio: 0.2,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  random: Math.random,
};

export function delayForAttempt(options: RetryOptions, failedAttempts: number): number {
  const base = options.baseDelayMs * Math.pow(options.factor, failedAttempts - 1);
  const jitter = 1 + options.jitterRatio * (2 * options.random() - 1);
  return Math.max(0, Math.round(base * jitter));
}

// Ejecuta fn hasta maxAttempts veces. Solo reintenta errores LlmError reintentables
// (429 y 5xx); un aborto, un tiempo de espera o un error de red no se reintenta.
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  if (!Number.isInteger(options.maxAttempts) || options.maxAttempts < 1) {
    throw new LlmError("invalidInput", "maxAttempts debe ser un entero mayor o igual que 1.");
  }
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retriable =
        error instanceof LlmError && error.retryable && attempt < options.maxAttempts;
      if (!retriable) break;
      await options.sleep(delayForAttempt(options, attempt));
    }
  }
  throw lastError;
}

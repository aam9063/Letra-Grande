// Cuota por usuario anónimo: cubo de fichas con reloj inyectable (sección 24.5).
import { LlmError } from "./errors.js";

export interface TokenBucketOptions {
  // Fichas máximas por usuario: el arranque permitido.
  capacity: number;
  // Fichas que se rellenan en cada intervalo.
  refillCount: number;
  // Intervalo de relleno en milisegundos.
  refillIntervalMs: number;
  // Máximo de usuarios con estado (R4): con ids falsos ilimitados, el mapa crecería
  // sin control y agotaría la memoria del servidor. Se expulsa al menos reciente.
  maxUsers?: number;
  // Reloj inyectable para pruebas deterministas.
  now: () => number;
}

export const DEFAULT_MAX_USERS = 10_000;

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class TokenBucketQuota {
  readonly #options: TokenBucketOptions;
  readonly #maxUsers: number;
  // Map con orden de inserción: el primer elemento es el menos usado recientemente.
  readonly #buckets = new Map<string, Bucket>();

  constructor(options: TokenBucketOptions) {
    const valid =
      Number.isInteger(options.capacity) &&
      options.capacity > 0 &&
      Number.isInteger(options.refillCount) &&
      options.refillCount > 0 &&
      Number.isInteger(options.refillIntervalMs) &&
      options.refillIntervalMs > 0;
    if (!valid) {
      throw new LlmError(
        "invalidInput",
        "La cuota necesita capacity, refillCount y refillIntervalMs enteros y positivos.",
      );
    }
    const maxUsers = options.maxUsers ?? DEFAULT_MAX_USERS;
    if (!Number.isInteger(maxUsers) || maxUsers < 1) {
      throw new LlmError(
        "invalidInput",
        "maxUsers debe ser un entero mayor o igual que 1.",
      );
    }
    this.#maxUsers = maxUsers;
    this.#options = options;
  }

  // Consume fichas del usuario si hay saldo. El identificador es anónimo y lo genera el proxy.
  tryConsume(userId: string, cost: number = 1): boolean {
    if (!Number.isInteger(cost) || cost <= 0) {
      throw new LlmError("invalidInput", "El coste debe ser un entero mayor que 0.");
    }
    const t = this.#options.now();
    let bucket = this.#buckets.get(userId);
    if (bucket === undefined) {
      bucket = { tokens: this.#options.capacity, lastRefill: t };
    } else {
      // Refrescar la posición marca al usuario como recientemente activo.
      this.#buckets.delete(userId);
    }
    if (t > bucket.lastRefill) {
      const intervals = Math.floor((t - bucket.lastRefill) / this.#options.refillIntervalMs);
      if (intervals > 0) {
        bucket.tokens = Math.min(
          this.#options.capacity,
          bucket.tokens + intervals * this.#options.refillCount,
        );
        bucket.lastRefill += intervals * this.#options.refillIntervalMs;
      }
    }
    this.#buckets.set(userId, bucket);
    this.#evictIfNeeded();
    if (bucket.tokens < cost) return false;
    bucket.tokens -= cost;
    return true;
  }

  // Expulsa al usuario menos reciente si se supera el máximo (R4).
  #evictIfNeeded(): void {
    while (this.#buckets.size > this.#maxUsers) {
      const oldest = this.#buckets.keys().next().value;
      if (oldest === undefined) break;
      this.#buckets.delete(oldest);
    }
  }

  // Fichas disponibles ahora mismo para el usuario.
  available(userId: string): number {
    return this.#buckets.get(userId)?.tokens ?? this.#options.capacity;
  }
}

// Circuit breaker con estado explícito y reloj inyectable (sección 24.5).
import { LlmError } from "./errors.js";

export type CircuitState = "closed" | "open" | "halfOpen";

export interface CircuitBreakerOptions {
  // Fallos consecutivos necesarios para abrir el circuito.
  failureThreshold: number;
  // Tiempo en abierto antes de permitir una prueba, en milisegundos.
  cooldownMs: number;
  // Reloj inyectable para pruebas deterministas.
  now: () => number;
}

export class CircuitBreaker {
  readonly #options: CircuitBreakerOptions;
  #failures = 0;
  #status: "closed" | "open" = "closed";
  #openedAt = 0;

  constructor(options: CircuitBreakerOptions) {
    if (!Number.isInteger(options.failureThreshold) || options.failureThreshold < 1) {
      throw new LlmError("invalidInput", "failureThreshold debe ser un entero mayor o igual que 1.");
    }
    if (!Number.isInteger(options.cooldownMs) || options.cooldownMs < 0) {
      throw new LlmError("invalidInput", "cooldownMs debe ser un entero mayor o igual que 0.");
    }
    this.#options = options;
  }

  // Estado calculado: un circuito abierto pasa a semiabierto al agotarse el enfriamiento.
  get state(): CircuitState {
    if (
      this.#status === "open" &&
      this.#options.now() - this.#openedAt >= this.#options.cooldownMs
    ) {
      return "halfOpen";
    }
    return this.#status;
  }

  // Fallos consecutivos registrados en el ciclo cerrado actual.
  get failures(): number {
    return this.#failures;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      throw new LlmError(
        "circuitOpen",
        "El circuito está abierto: se degrada el servicio hasta que pase el enfriamiento.",
      );
    }
    try {
      const result = await fn();
      this.#failures = 0;
      this.#status = "closed";
      return result;
    } catch (error) {
      if (this.state === "halfOpen") {
        this.#open();
      } else {
        this.#failures += 1;
        if (this.#failures >= this.#options.failureThreshold) this.#open();
      }
      throw error;
    }
  }

  #open(): void {
    this.#status = "open";
    this.#openedAt = this.#options.now();
    this.#failures = 0;
  }
}

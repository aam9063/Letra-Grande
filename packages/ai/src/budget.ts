// Presupuesto diario de tokens con corte automático (sección 24.5).
// El consumo real por día y modelo se consulta con GET /v1/usage; esta guarda
// impone el límite local antes de cada llamada.
import { LlmError } from "./errors.js";

export interface DailyBudgetOptions {
  // Límite de tokens al día. El razonamiento consume del mismo presupuesto.
  limitTokens: number;
  // Reloj inyectable para pruebas deterministas.
  now: () => number;
}

// Día natural en formato UTC: cambia de clave a medianoche UTC.
function dayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export class DailyBudget {
  readonly #options: DailyBudgetOptions;
  #day: string;
  #spent = 0;

  constructor(options: DailyBudgetOptions) {
    if (!Number.isInteger(options.limitTokens) || options.limitTokens <= 0) {
      throw new LlmError("invalidInput", "limitTokens debe ser un entero mayor que 0.");
    }
    this.#options = options;
    this.#day = dayKey(options.now());
  }

  get spent(): number {
    this.#rollDay();
    return this.#spent;
  }

  get limitTokens(): number {
    return this.#options.limitTokens;
  }

  // Indica si caben esos tokens hoy, sin registrar nada.
  canSpend(tokens: number): boolean {
    return tokens >= 0 && this.spent + tokens <= this.#options.limitTokens;
  }

  // Registra el consumo si cabe dentro del límite. Devuelve false si no cabe.
  spend(tokens: number): boolean {
    if (!Number.isInteger(tokens) || tokens < 0) {
      throw new LlmError("invalidInput", "El consumo debe ser un entero mayor o igual que 0.");
    }
    if (!this.canSpend(tokens)) return false;
    this.#spent += tokens;
    return true;
  }

  #rollDay(): void {
    const day = dayKey(this.#options.now());
    if (day !== this.#day) {
      this.#day = day;
      this.#spent = 0;
    }
  }
}

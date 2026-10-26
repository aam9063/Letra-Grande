// Interfaz única de proveedor de IA: el resto del código nunca habla con un proveedor concreto.
import { LlmError } from "./errors.js";

export type ChatRole = "user" | "assistant";

export interface LlmCompleteInput {
  system: string;
  messages: { role: ChatRole; content: string }[];
  maxTokens: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmCompleteResult {
  text: string;
  usage?: LlmUsage;
}

// Contrato de la sección 24.4 de docs/ARRANQUE.md.
export interface LlmProvider {
  readonly name: string;
  complete(input: LlmCompleteInput): Promise<LlmCompleteResult>;
}

// Rechaza un presupuesto de tokens insuficiente antes de hacer ninguna llamada.
export function assertValidMaxTokens(maxTokens: number): void {
  if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
    throw new LlmError(
      "invalidInput",
      "maxTokens debe ser un entero mayor que 0: el razonamiento del modelo consume parte de ese presupuesto.",
    );
  }
}

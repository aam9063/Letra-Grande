// Adaptador mock determinista: proveedor de CI y de los e2e. Sin red y sin claves.
import { LlmError } from "./errors.js";
import type { LlmProvider } from "./provider.js";
import { assertValidMaxTokens } from "./provider.js";

export interface MockOptions {
  // Tabla fija de respuestas por pregunta. Con datos ficticios siempre.
  table?: Record<string, string>;
  name?: string;
}

const DEFAULT_MOCK_TABLE: Record<string, string> = {
  "hola": "Hola: soy el asistente de prueba. Pregúntame por facturas, contratos o cartas oficiales.",
  "que es una factura": "Según la ficha de prueba: una factura acredita una venta y debe incluir número, fecha, datos del emisor y desglose de impuestos.",
  "puedo reclamar una factura": "Según la ficha de prueba: para reclamar una factura, pide primero la corrección al emisor por escrito y guarda una copia.",
};

// Normaliza una pregunta para que dos escrituras equivalentes den la misma respuesta.
function normalizeQuestion(question: string): string {
  return question.trim().replace(/\s+/g, " ").toLowerCase();
}

export function createMockProvider(options: MockOptions = {}): LlmProvider {
  const table = new Map<string, string>();
  for (const [question, answer] of Object.entries(options.table ?? DEFAULT_MOCK_TABLE)) {
    table.set(normalizeQuestion(question), answer);
  }

  return {
    name: options.name ?? "mock",
    async complete(input) {
      assertValidMaxTokens(input.maxTokens);
      const last = input.messages[input.messages.length - 1];
      const question = typeof last?.content === "string" ? last.content : "";
      const answer = table.get(normalizeQuestion(question));
      if (answer === undefined) {
        // Sin la pregunta en el mensaje: puede contener datos personales.
        throw new LlmError(
          "noAnswer",
          "El mock no tiene respuesta para esta pregunta. Añádela a la tabla fija del adaptador mock.",
        );
      }
      return { text: answer };
    },
  };
}

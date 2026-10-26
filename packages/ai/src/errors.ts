// Clasificación de errores del proveedor según la tabla de la sección 24.5.
export type LlmErrorKind =
  | "auth"
  | "payment"
  | "forbidden"
  | "notFound"
  | "rateLimit"
  | "server"
  | "aborted"
  | "network"
  | "invalidInput"
  | "invalidResponse"
  | "circuitOpen"
  | "quotaExceeded"
  | "noAnswer"
  | "unknown";

interface Classification {
  kind: LlmErrorKind;
  retryable: boolean;
}

const KIND_DETAIL: Record<Exclude<LlmErrorKind, "aborted" | "network" | "invalidInput" | "invalidResponse" | "circuitOpen" | "noAnswer">, string> = {
  auth: "clave rechazada o sin acceso al modelo",
  payment: "cuota del modelo agotada",
  forbidden: "el plan no permite esta llamada",
  notFound: "modelo inexistente",
  rateLimit: "demasiadas peticiones o cuota",
  server: "fallo del servidor del proveedor",
  quotaExceeded: "límite de cuota o presupuesto alcanzado",
  unknown: "estado no previsto",
};

// Solo 429 y 5xx son transitorios: el resto es configuración, cuota, red o entrada.
export function classifyStatus(status: number): Classification {
  if (status === 401) return { kind: "auth", retryable: false };
  if (status === 402) return { kind: "payment", retryable: false };
  if (status === 403) return { kind: "forbidden", retryable: false };
  if (status === 404) return { kind: "notFound", retryable: false };
  if (status === 429) return { kind: "rateLimit", retryable: true };
  if (status >= 500 && status <= 599) return { kind: "server", retryable: true };
  return { kind: "unknown", retryable: false };
}

function isRetryable(kind: LlmErrorKind): boolean {
  return kind === "rateLimit" || kind === "server";
}

export class LlmError extends Error {
  readonly kind: LlmErrorKind;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(kind: LlmErrorKind, message: string, status?: number) {
    super(message);
    this.name = "LlmError";
    this.kind = kind;
    this.status = status;
    this.retryable = isRetryable(kind);
  }

  // El mensaje nunca incluye el cuerpo de la respuesta ni datos de la petición.
  static fromStatus(status: number): LlmError {
    const { kind } = classifyStatus(status);
    const detail = KIND_DETAIL[kind as keyof typeof KIND_DETAIL] ?? KIND_DETAIL.unknown;
    return new LlmError(
      kind,
      `El proveedor de IA respondió con el estado HTTP ${status} (${detail}).`,
      status,
    );
  }

  static aborted(): LlmError {
    return new LlmError(
      "aborted",
      "La petición al proveedor de IA se abortó o agotó su tiempo de espera.",
    );
  }

  static network(): LlmError {
    return new LlmError(
      "network",
      "No se pudo conectar con el proveedor de IA.",
    );
  }
}

// Tests del handler de /api/assistant con proveedor simulado, sin red (AI-01).
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LlmError,
  TokenBucketQuota,
  type LlmCompleteInput,
  type LlmProvider,
} from "@letra-grande/ai";
import { deriveAnonymousId } from "./anonymous-id";
import { MAX_QUESTION_CHARS, handleAssistant, type AssistantDeps } from "./handler";

const MOCK_REPLY = "Según la ficha de prueba: esta es la respuesta simulada del proveedor.";

function makeDeps(options?: {
  quota?: TokenBucketQuota;
  provider?: LlmProvider;
}): { deps: AssistantDeps; calls: LlmCompleteInput[] } {
  const calls: LlmCompleteInput[] = [];
  const provider: LlmProvider = {
    name: "fake",
    async complete(input) {
      calls.push(input);
      const inner = options?.provider;
      if (inner === undefined) return { text: MOCK_REPLY };
      return inner.complete(input);
    },
  };
  return {
    calls,
    deps: {
      provider,
      quota:
        options?.quota ??
        new TokenBucketQuota({
          capacity: 10,
          refillCount: 1,
          refillIntervalMs: 60_000,
          now: () => Date.now(),
        }),
      deriveAnonymousId,
    },
  };
}

function makeRequest(body: unknown, headers?: Record<string, string>): Request {
  return new Request("http://localhost:3000/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/assistant", () => {
  it("rechaza un DNI sin enmascarar y no repite el texto recibido", async () => {
    const { deps, calls } = makeDeps();
    const response = await handleAssistant(
      makeRequest({ question: "Mi documento es 12345678Z, ¿puedo reclamar?" }),
      deps,
    );
    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("unmasked_data");
    expect(body.error.message).toContain("enmascar");
    expect(JSON.stringify(body)).not.toContain("12345678Z");
    expect(calls).toHaveLength(0);
  });

  it("acepta texto ya enmascarado y lo pasa al proveedor tal cual", async () => {
    const { deps, calls } = makeDeps();
    const question = "¿Puedo reclamar la factura {{documento_1}} sin respuesta del emisor?";
    const response = await handleAssistant(makeRequest({ question }), deps);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { reply: string };
    expect(body.reply).toBe(MOCK_REPLY);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.messages).toEqual([{ role: "user", content: question }]);
    expect(typeof calls[0]?.system).toBe("string");
    expect(JSON.stringify(body)).not.toContain(question);
  });

  it("rechaza un cuerpo que no es JSON válido", async () => {
    const { deps, calls } = makeDeps();
    const response = await handleAssistant(makeRequest("esto no es json"), deps);
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("invalid_body");
    expect(calls).toHaveLength(0);
  });

  it("rechaza un cuerpo sin pregunta, con tipo equivocado o vacía", async () => {
    const { deps, calls } = makeDeps();
    for (const body of [{}, { question: 42 }, { question: "   " }, [1, 2]]) {
      const response = await handleAssistant(makeRequest(body), deps);
      expect(response.status).toBe(400);
      const json = (await response.json()) as { error: { code: string } };
      expect(json.error.code).toBe("invalid_body");
    }
    expect(calls).toHaveLength(0);
  });

  it("rechaza una pregunta demasiado larga sin llamar al proveedor", async () => {
    const { deps, calls } = makeDeps();
    const question = "a".repeat(MAX_QUESTION_CHARS + 1);
    const response = await handleAssistant(makeRequest({ question }), deps);
    expect(response.status).toBe(413);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("payload_too_large");
    expect(calls).toHaveLength(0);
  });

  it("rechaza una petición con Content-Length desbordado antes de leer el cuerpo", async () => {
    const { deps, calls } = makeDeps();
    const response = await handleAssistant(
      makeRequest({ question: "hola" }, { "content-length": "999999" }),
      deps,
    );
    expect(response.status).toBe(413);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("payload_too_large");
    expect(calls).toHaveLength(0);
  });

  it("devuelve 429 al agotar la cuota del usuario anónimo", async () => {
    const { deps, calls } = makeDeps({
      quota: new TokenBucketQuota({
        capacity: 1,
        refillCount: 1,
        refillIntervalMs: 60_000,
        now: () => Date.now(),
      }),
    });
    const ok = await handleAssistant(makeRequest({ question: "{{documento_1}}" }), deps);
    expect(ok.status).toBe(200);
    const limited = await handleAssistant(makeRequest({ question: "{{documento_1}}" }), deps);
    expect(limited.status).toBe(429);
    const body = (await limited.json()) as { error: { code: string } };
    expect(body.error.code).toBe("rate_limited");
    expect(calls).toHaveLength(1);
  });

  it("degrada con 503 cuando el proveedor falla y no filtra el error", async () => {
    const { deps } = makeDeps({
      provider: {
        name: "fake",
        complete: async () => {
          throw new LlmError("server", "fallo simulado del proveedor");
        },
      },
    });
    const response = await handleAssistant(makeRequest({ question: "{{documento_1}}" }), deps);
    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("service_unavailable");
    expect(JSON.stringify(body)).not.toContain("fallo simulado");
    expect(JSON.stringify(body)).not.toContain("stack");
  });

  it("degrada con 503 cuando el circuito está abierto", async () => {
    const { deps } = makeDeps({
      provider: {
        name: "fake",
        complete: async () => {
          throw new LlmError("circuitOpen", "circuito abierto");
        },
      },
    });
    const response = await handleAssistant(makeRequest({ question: "{{documento_1}}" }), deps);
    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("service_unavailable");
  });

  it("no registra el contenido de la pregunta en consola, ni en éxito ni en fallo", async () => {
    const marker = "PREGUNTA-SECRETA-42";
    const spies = ["log", "warn", "error", "info", "debug"].map((m) =>
      vi.spyOn(console, m as "log").mockImplementation(() => {}),
    );
    const ok = await makeDeps();
    await handleAssistant(
      makeRequest({ question: `¿Qué es ${marker} en {{documento_1}}?` }),
      ok.deps,
    );
    const failing = makeDeps({
      provider: {
        name: "fake",
        complete: async () => {
          throw new LlmError("server", "fallo simulado");
        },
      },
    });
    await handleAssistant(makeRequest({ question: `${marker} con {{email_1}}` }), failing.deps);
    for (const spy of spies) {
      const logged = spy.mock.calls.map((args) => args.map(String).join(" ")).join("\n");
      expect(logged).not.toContain(marker);
    }
  });
});

describe("deriveAnonymousId", () => {
  it("es estable con las mismas cabeceras y distinto si cambia la IP", () => {
    const base = { "user-agent": "navegador-de-prueba", "accept-language": "es" };
    const a = deriveAnonymousId(new Headers(base));
    const b = deriveAnonymousId(new Headers(base));
    const c = deriveAnonymousId(new Headers({ ...base, "x-forwarded-for": "203.0.113.7" }));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

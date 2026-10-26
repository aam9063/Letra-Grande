// Tests del handler de /api/assistant con proveedor simulado, sin red (AI-01 y AI-02).
// AI-02: el proveedor responde con el JSON del catálogo cerrado, el handler valida
// contra las fuentes recuperadas, reintenta una vez y cae en outOfScope con honestidad.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LlmError,
  TokenBucketQuota,
  type LlmCompleteInput,
  type LlmProvider,
} from "@letra-grande/ai";
import { deriveAnonymousId } from "./anonymous-id";
import { PROVIDER_TIMEOUT_MS, withTimeout } from "./deps";
import {
  MAX_QUESTION_CHARS,
  SYSTEM_PROMPT,
  handleAssistant,
  type AssistantDeps,
} from "./handler";

// Fuente recuperada de prueba: el texto es lo que respalda cifras y citas.
const FUENTE_PRUEBA = {
  id: "fuente-prueba",
  titulo: "Ficha de prueba",
  url: "https://example.com/ficha",
  texto: "El plazo de reclamación es de 30 días. La reclamación es gratuita.",
  verified: false,
};

const BLOQUE_VALIDO = {
  kind: "fact",
  claim: "El plazo de reclamación es de 30 días.",
  citations: [{ sourceId: "fuente-prueba", quote: "El plazo de reclamación es de 30 días." }],
};

// Respuesta del catálogo cerrado que se espera del proveedor, como texto JSON.
function respuestaModelo(bloques: unknown[] = [BLOQUE_VALIDO]): string {
  return JSON.stringify({ question: "¿Cuántos días tengo?", outOfScope: false, blocks: bloques });
}

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
      if (inner === undefined) return { text: respuestaModelo() };
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
      retrieveSources: async () => [FUENTE_PRUEBA],
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

// Emoji de prueba: 4 bytes en UTF-8 pero 2 unidades UTF-16, útil para distinguir bytes de unidades.
const EMOJI = "\u{1F4C9}";
const encoder = new TextEncoder();

function chunkedRequest(chunks: string[]): Request {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  const init: RequestInit & { duplex: "half" } = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stream,
    duplex: "half",
  };
  return new Request("http://localhost:3000/api/assistant", init);
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
    const body = (await response.json()) as {
      answer: { outOfScope: boolean; question: string; blocks: { kind: string; claim: string }[] };
      fuentes: Record<string, { titulo: string; url: string }>;
    };
    expect(body.answer.outOfScope).toBe(false);
    expect(body.answer.blocks).toHaveLength(1);
    expect(body.answer.blocks[0]?.claim).toBe("El plazo de reclamación es de 30 días.");
    expect(body.fuentes["fuente-prueba"]).toEqual({
      titulo: "Ficha de prueba",
      url: "https://example.com/ficha",
      verified: false,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.messages[0]).toEqual({ role: "user", content: question });
    // Las fuentes recuperadas viajan en un mensaje propio para que el modelo cote.
    expect(calls[0]?.messages.at(-1)?.content).toContain("fuente-prueba");
    expect(calls[0]?.messages.at(-1)?.content).toContain("30 días");
    // La respuesta se devuelve al mismo cliente que preguntó: solo en
    // answer.question se refleja la pregunta. Los errores nunca la repiten
    // (lo comprueba el test de DNI sin enmascarar).
    expect(body.answer.question).toBe(question);
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

  it("responde 503 cuando el proveedor no responde y se agota el tiempo de espera", async () => {
    // Proveedor que nunca resuelve y solo reacciona a la señal de aborto, como el adaptador real.
    const hanging: LlmProvider = {
      name: "fake",
      complete: (input) =>
        new Promise((_, reject) => {
          input.signal?.addEventListener("abort", () => reject(LlmError.aborted()));
        }),
    };
    const timed = withTimeout(hanging, 20);
    const { deps, calls } = makeDeps({ provider: timed });
    const response = await handleAssistant(makeRequest({ question: "{{documento_1}}" }), deps);
    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("service_unavailable");
    expect(calls).toHaveLength(1);
  });

  it("usa un tiempo de espera de 30 000 ms para el proveedor", () => {
    expect(PROVIDER_TIMEOUT_MS).toBe(30_000);
  });

  it("rechaza un cuerpo fragmentado mayor que el límite en bytes sin content-length", async () => {
    const { deps, calls } = makeDeps();
    const padded = JSON.stringify({ question: "hola", padding: EMOJI.repeat(10_000) });
    const response = await handleAssistant(chunkedRequest([padded]), deps);
    expect(response.status).toBe(413);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("payload_too_large");
    expect(calls).toHaveLength(0);
  });

  it("acepta un cuerpo multibyte justo por debajo del límite en bytes", async () => {
    const { deps, calls } = makeDeps();
    // 5 000 emoji: unos 20 000 bytes de cuerpo, justo por debajo de los 20 KiB.
    const response = await handleAssistant(
      makeRequest({ question: "hola", padding: EMOJI.repeat(5_000) }),
      deps,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { answer: { outOfScope: boolean } };
    expect(body.answer.outOfScope).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it("un fallo del proveedor no consume cuota del usuario anónimo", async () => {
    let fail = true;
    const { deps, calls } = makeDeps({
      quota: new TokenBucketQuota({
        capacity: 1,
        refillCount: 1,
        refillIntervalMs: 60_000,
        now: () => Date.now(),
      }),
      provider: {
        name: "fake",
        complete: async () => {
          if (fail) throw new LlmError("server", "fallo simulado");
          return { text: respuestaModelo() };
        },
      },
    });
    const failed = await handleAssistant(makeRequest({ question: "{{documento_1}}" }), deps);
    expect(failed.status).toBe(503);
    fail = false;
    const retry = await handleAssistant(makeRequest({ question: "{{documento_1}}" }), deps);
    expect(retry.status).toBe(200);
    expect(calls).toHaveLength(2);
  });

  it("el cuerpo de la petición nunca llega al system prompt", async () => {
    const marker = "MARCADOR-EN-LA-PREGUNTA";
    const { deps, calls } = makeDeps();
    await handleAssistant(makeRequest({ question: `¿Qué es ${marker}?` }), deps);
    expect(calls[0]?.system).toBe(SYSTEM_PROMPT);
    expect(calls[0]?.system).not.toContain(marker);
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

describe("validación de la respuesta del modelo contra las fuentes (AI-02)", () => {
  it("degrada a outOfScope cuando una cifra del bloque no aparece en la fuente citada", async () => {
    const invalido = respuestaModelo([
      {
        kind: "fact",
        claim: "El plazo es de 45 días naturales.",
        citations: [{ sourceId: "fuente-prueba" }],
      },
    ]);
    const { deps, calls } = makeDeps({
      provider: { name: "fake", complete: async () => ({ text: invalido }) },
    });
    const response = await handleAssistant(makeRequest({ question: "¿Cuántos días tengo?" }), deps);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      answer: { outOfScope: boolean; blocks: unknown[] };
    };
    expect(body.answer.outOfScope).toBe(true);
    expect(body.answer.blocks).toEqual([]);
    // Un reintento único: como máximo dos llamadas al proveedor.
    expect(calls).toHaveLength(2);
  });

  it("degrada a outOfScope cuando el modelo cita una fuente desconocida", async () => {
    const invalido = respuestaModelo([
      {
        kind: "fact",
        claim: "El plazo de reclamación es de 30 días.",
        citations: [{ sourceId: "fuente-inexistente" }],
      },
    ]);
    const { deps, calls } = makeDeps({
      provider: { name: "fake", complete: async () => ({ text: invalido }) },
    });
    const response = await handleAssistant(makeRequest({ question: "¿Cuántos días tengo?" }), deps);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      answer: { outOfScope: boolean; blocks: unknown[] };
    };
    expect(body.answer.outOfScope).toBe(true);
    expect(body.answer.blocks).toEqual([]);
    expect(calls).toHaveLength(2);
  });

  it("degrada a outOfScope cuando la respuesta lleva dos avisos", async () => {
    const invalido = respuestaModelo([
      {
        kind: "warning",
        claim: "Atención: el plazo es de 30 días.",
        citations: [{ sourceId: "fuente-prueba" }],
      },
      {
        kind: "warning",
        claim: "Atención: la reclamación es gratuita.",
        citations: [{ sourceId: "fuente-prueba" }],
      },
    ]);
    const { deps, calls } = makeDeps({
      provider: { name: "fake", complete: async () => ({ text: invalido }) },
    });
    const response = await handleAssistant(makeRequest({ question: "¿Cuántos días tengo?" }), deps);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      answer: { outOfScope: boolean; blocks: unknown[] };
    };
    expect(body.answer.outOfScope).toBe(true);
    expect(body.answer.blocks).toEqual([]);
    expect(calls).toHaveLength(2);
  });

  it("degrada a outOfScope cuando el modelo no responde con el JSON del catálogo", async () => {
    const { deps, calls } = makeDeps({
      provider: {
        name: "fake",
        complete: async () => ({ text: "Texto plano sin JSON ni bloques." }),
      },
    });
    const response = await handleAssistant(makeRequest({ question: "¿Cuántos días tengo?" }), deps);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      answer: { outOfScope: boolean; blocks: unknown[] };
    };
    expect(body.answer.outOfScope).toBe(true);
    expect(body.answer.blocks).toEqual([]);
    expect(calls).toHaveLength(2);
  });

  it("reintenta una vez con el error de validación y sin repetir la respuesta completa del modelo", async () => {
    const invalido = respuestaModelo([
      {
        kind: "fact",
        claim: "El plazo es de 45 días naturales.",
        citations: [{ sourceId: "fuente-prueba" }],
      },
    ]);
    let llamada = 0;
    const { deps, calls } = makeDeps({
      provider: {
        name: "fake",
        complete: async () => {
          llamada += 1;
          return { text: llamada === 1 ? invalido : respuestaModelo() };
        },
      },
    });
    const response = await handleAssistant(makeRequest({ question: "¿Cuántos días tengo?" }), deps);
    expect(response.status).toBe(200);
    expect(calls).toHaveLength(2);
    const reintento = calls[1];
    expect(reintento).toBeDefined();
    const ultimo = reintento?.messages.at(-1);
    expect(ultimo?.content).toContain("45");
    // No se devuelve la respuesta completa del modelo al proveedor: solo los errores.
    expect(ultimo?.content).not.toContain("naturales");
    expect(ultimo?.content).not.toContain('"blocks"');
    expect(ultimo?.content).not.toContain("citations");
  });

  it("devuelve los bloques validados cuando el reintento corrige la respuesta", async () => {
    const invalido = respuestaModelo([
      {
        kind: "fact",
        claim: "El plazo es de 45 días naturales.",
        citations: [{ sourceId: "fuente-prueba" }],
      },
    ]);
    let llamada = 0;
    const { deps, calls } = makeDeps({
      provider: {
        name: "fake",
        complete: async () => {
          llamada += 1;
          return { text: llamada === 1 ? invalido : respuestaModelo() };
        },
      },
    });
    const response = await handleAssistant(makeRequest({ question: "¿Cuántos días tengo?" }), deps);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      answer: { outOfScope: boolean; blocks: { kind: string; claim: string }[] };
    };
    expect(body.answer.outOfScope).toBe(false);
    expect(body.answer.blocks).toHaveLength(1);
    expect(calls).toHaveLength(2);
  });

  it("acepta una respuesta del propio modelo que declara outOfScope", async () => {
    const { deps, calls } = makeDeps({
      provider: {
        name: "fake",
        complete: async () => ({
          text: JSON.stringify({ question: "¿X?", outOfScope: true, blocks: [] }),
        }),
      },
    });
    const response = await handleAssistant(makeRequest({ question: "¿X?" }), deps);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      answer: { outOfScope: boolean; blocks: unknown[] };
    };
    expect(body.answer.outOfScope).toBe(true);
    expect(body.answer.blocks).toEqual([]);
    expect(calls).toHaveLength(1);
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

// Adaptador nan con fetch simulado: sin red real (AI-06, T1 y T3).
import { describe, expect, it } from "vitest";
import { LlmError } from "../src/errors.js";
import { NAN_DEFAULT_BASE_URL, createNanProvider } from "../src/nan.js";
import type { RetryOptions } from "../src/retry.js";

const ENV_OK = {
  NAN_API_KEY: "clave-de-prueba-nunca-real",
  AI_MODEL: "deepseek-v4-flash",
};

interface FetchCall {
  url: string;
  init: RequestInit;
}

type Step =
  | { status: number }
  | { okBody: unknown }
  | { fail: Error };

function scriptedFetch(steps: Step[]) {
  const calls: FetchCall[] = [];
  const fetchFn = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const step = steps[calls.length - 1] as Step | undefined;
    if (!step) throw new Error("fetch simulado sin pasos");
    if ("fail" in step) throw step.fail;
    if ("status" in step) return new Response("no", { status: step.status });
    return new Response(JSON.stringify(step.okBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return { calls, fetchFn };
}

const OK_BODY = {
  choices: [{ message: { content: "Respuesta de prueba." } }],
  usage: { prompt_tokens: 12, completion_tokens: 34 },
};

const retryFast: Pick<RetryOptions, "baseDelayMs" | "sleep" | "random"> = {
  baseDelayMs: 1,
  sleep: () => Promise.resolve(),
  random: () => 0.5,
};

function complete(provider: ReturnType<typeof createNanProvider>) {
  return provider.complete({
    system: "system-de-prueba",
    messages: [{ role: "user", content: "pregunta-de-prueba" }],
    maxTokens: 512,
  });
}

describe("createNanProvider: configuración", () => {
  it("falla rápido sin NAN_API_KEY y sin claves por defecto", () => {
    expect(() => createNanProvider({ env: {}, fetchFn: undefined })).toThrow(
      /NAN_API_KEY/,
    );
  });

  it("falla rápido sin AI_MODEL", () => {
    expect(() =>
      createNanProvider({ env: { NAN_API_KEY: "clave-de-prueba-nunca-real" } }),
    ).toThrow(/AI_MODEL/);
  });

  it("usa la URL pública documentada por defecto y permite otra", async () => {
    const porDefecto = scriptedFetch([{ okBody: OK_BODY }]);
    const provider = createNanProvider({
      env: ENV_OK,
      fetchFn: porDefecto.fetchFn,
      retry: retryFast,
    });
    await complete(provider);
    expect(porDefecto.calls[0]?.url).toBe(
      `${NAN_DEFAULT_BASE_URL}/chat/completions`,
    );

    const otra = scriptedFetch([{ okBody: OK_BODY }]);
    const otro = createNanProvider({
      env: { ...ENV_OK, NAN_BASE_URL: "https://otro.proveedor/v1" },
      fetchFn: otra.fetchFn,
      retry: retryFast,
    });
    await complete(otro);
    expect(otra.calls[0]?.url).toBe("https://otro.proveedor/v1/chat/completions");
  });

  it("envía el modelo, los mensajes y max_tokens en el cuerpo", async () => {
    const { calls, fetchFn } = scriptedFetch([{ okBody: OK_BODY }]);
    const provider = createNanProvider({
      env: ENV_OK,
      fetchFn,
      retry: retryFast,
    });
    await complete(provider);
    const init = calls[0]?.init;
    expect(init?.method).toBe("POST");
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe(
      `Bearer ${ENV_OK.NAN_API_KEY}`,
    );
    const body = JSON.parse(String(init?.body)) as {
      model: string;
      max_tokens: number;
      temperature?: number;
      messages: { role: string; content: string }[];
    };
    expect(body.model).toBe("deepseek-v4-flash");
    expect(body.max_tokens).toBe(512);
    expect(body.messages[0]).toEqual({
      role: "system",
      content: "system-de-prueba",
    });
    expect(body.messages[1]).toEqual({
      role: "user",
      content: "pregunta-de-prueba",
    });
    expect(body.temperature).toBeUndefined();
  });

  it("rechaza un maxTokens insuficiente antes de llamar", async () => {
    const { calls, fetchFn } = scriptedFetch([]);
    const provider = createNanProvider({
      env: ENV_OK,
      fetchFn,
      retry: retryFast,
    });
    for (const maxTokens of [0, -5, 12.5, Number.NaN]) {
      await expect(
        provider.complete({
          system: "s",
          messages: [{ role: "user", content: "p" }],
          maxTokens,
        }),
      ).rejects.toMatchObject({ kind: "invalidInput" });
    }
    expect(calls.length).toBe(0);
  });
});

describe("adaptador nan: política de reintentos (RED T1)", () => {
  it("un 429 se reintenta y acaba resolviendo", async () => {
    const { calls, fetchFn } = scriptedFetch([
      { status: 429 },
      { okBody: OK_BODY },
    ]);
    const provider = createNanProvider({
      env: ENV_OK,
      fetchFn,
      retry: retryFast,
    });
    const result = await complete(provider);
    expect(result.text).toBe("Respuesta de prueba.");
    expect(calls.length).toBe(2);
  });

  it("un 401 no se reintenta ni una vez", async () => {
    const { calls, fetchFn } = scriptedFetch([{ status: 401 }]);
    const provider = createNanProvider({
      env: ENV_OK,
      fetchFn,
      retry: retryFast,
    });
    await expect(complete(provider)).rejects.toMatchObject({
      kind: "auth",
      retryable: false,
    });
    expect(calls.length).toBe(1);
  });

  it("un 5xx se reintenta un número acotado de veces", async () => {
    const { calls, fetchFn } = scriptedFetch([
      { status: 500 },
      { status: 500 },
      { status: 500 },
    ]);
    const provider = createNanProvider({
      env: ENV_OK,
      fetchFn,
      retry: retryFast,
    });
    await expect(complete(provider)).rejects.toMatchObject({
      kind: "server",
      retryable: true,
    });
    expect(calls.length).toBe(2);
  });

  it("un 402 y un 404 tampoco se reintentan", async () => {
    for (const status of [402, 404]) {
      const { calls, fetchFn } = scriptedFetch([{ status }]);
      const provider = createNanProvider({
        env: ENV_OK,
        fetchFn,
        retry: retryFast,
      });
      await expect(complete(provider)).rejects.toBeInstanceOf(LlmError);
      expect(calls.length).toBe(1);
    }
  });

  it("espera exponencial con variación aleatoria entre intentos", async () => {
    const sleeps: number[] = [];
    const { fetchFn } = scriptedFetch([
      { status: 429 },
      { status: 429 },
      { okBody: OK_BODY },
    ]);
    const provider = createNanProvider({
      env: ENV_OK,
      fetchFn,
      retry: {
        maxAttempts: 3,
        baseDelayMs: 200,
        factor: 2,
        jitterRatio: 0.2,
        random: () => 1,
        sleep: async (ms) => {
          sleeps.push(ms);
        },
      },
    });
    await complete(provider);
    expect(sleeps.length).toBe(2);
    expect(sleeps[0]).toBe(240);
    expect(sleeps[1]).toBe(480);
  });

  it("una petición abortada no se reintenta", async () => {
    const { calls, fetchFn } = scriptedFetch([]);
    const provider = createNanProvider({
      env: ENV_OK,
      fetchFn,
      retry: retryFast,
    });
    const controller = new AbortController();
    controller.abort();
    await expect(
      provider.complete({
        system: "s",
        messages: [{ role: "user", content: "p" }],
        maxTokens: 100,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ kind: "aborted", retryable: false });
    // Una señal ya abortada no llega a llamar: ni una llamada ni un reintento.
    expect(calls.length).toBe(0);
  });

  it("un tiempo de espera agotado no se reintenta", async () => {
    const abortError = new DOMException("abort", "AbortError");
    const { calls, fetchFn } = scriptedFetch([{ fail: abortError }]);
    const provider = createNanProvider({
      env: ENV_OK,
      fetchFn,
      retry: retryFast,
    });
    await expect(complete(provider)).rejects.toMatchObject({
      kind: "aborted",
      retryable: false,
    });
    expect(calls.length).toBe(1);
  });

  it("un fallo de red no se reintenta", async () => {
    const { calls, fetchFn } = scriptedFetch([
      { fail: new Error("network down") },
    ]);
    const provider = createNanProvider({
      env: ENV_OK,
      fetchFn,
      retry: retryFast,
    });
    await expect(complete(provider)).rejects.toMatchObject({
      kind: "network",
      retryable: false,
    });
    expect(calls.length).toBe(1);
  });
});

describe("adaptador nan: respuesta y secretos", () => {
  it("mapea el texto y el uso de la respuesta", async () => {
    const { fetchFn } = scriptedFetch([{ okBody: OK_BODY }]);
    const provider = createNanProvider({
      env: ENV_OK,
      fetchFn,
      retry: retryFast,
    });
    const result = await complete(provider);
    expect(result.text).toBe("Respuesta de prueba.");
    expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 34 });
  });

  it("rechaza una respuesta 200 sin contenido útil", async () => {
    const { fetchFn } = scriptedFetch([{ okBody: { choices: [] } }]);
    const provider = createNanProvider({
      env: ENV_OK,
      fetchFn,
      retry: retryFast,
    });
    await expect(complete(provider)).rejects.toMatchObject({
      kind: "invalidResponse",
    });
  });

  it("los mensajes de error nunca contienen la clave ni el cuerpo", async () => {
    const { fetchFn } = scriptedFetch([{ status: 401 }]);
    const provider = createNanProvider({
      env: ENV_OK,
      fetchFn,
      retry: retryFast,
    });
    try {
      await complete(provider);
      expect.unreachable("debía fallar");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).not.toContain("clave-de-prueba-nunca-real");
      expect(message).not.toContain("system-de-prueba");
      expect(message).not.toContain("pregunta-de-prueba");
    }
  });
});

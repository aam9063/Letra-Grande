// Factoría de proveedores desde el entorno (AI-06, T3 y T5).
import { describe, expect, it } from "vitest";
import { CircuitBreaker } from "../src/circuit-breaker.js";
import { DailyBudget } from "../src/budget.js";
import { LlmError } from "../src/errors.js";
import { TokenBucketQuota } from "../src/quota.js";
import { createProviderFromEnv } from "../src/factory.js";
import { NAN_DEFAULT_BASE_URL } from "../src/nan.js";

const ENV_NAN = {
  AI_PROVIDER: "nan",
  NAN_API_KEY: "clave-de-prueba-nunca-real",
  AI_MODEL: "deepseek-v4-flash",
};

describe("createProviderFromEnv", () => {
  it("crea el adaptador nan cuando AI_PROVIDER vale nan", () => {
    const provider = createProviderFromEnv({ env: ENV_NAN });
    expect(provider.name).toBe("nan");
  });
  it("crea el mock por defecto y con AI_PROVIDER=mock", () => {
    expect(createProviderFromEnv({ env: {} }).name).toBe("mock");
    expect(
      createProviderFromEnv({ env: { AI_PROVIDER: "mock" } }).name,
    ).toBe("mock");
  });

  it("falla con un valor de AI_PROVIDER desconocido", () => {
    expect(() =>
      createProviderFromEnv({ env: { AI_PROVIDER: "desconocido" } }),
    ).toThrow(/AI_PROVIDER/);
  });

  it("no tiene la clave en su configuración pública por defecto", () => {
    expect(NAN_DEFAULT_BASE_URL).toBe("https://api.nan.builders/v1");
    expect(NAN_DEFAULT_BASE_URL).not.toContain("key");
  });
});

describe("protecciones decoradas (R5)", () => {
  const PREGUNTA = { system: "s", messages: [{ role: "user" as const, content: "hola" }] };

  function fakeClock() {
    let now = 1_000;
    return { now: () => now };
  }

  it("con circuito abierto corta antes de llamar al proveedor", async () => {
    const clock = fakeClock();
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 1_000, now: clock.now });
    await expect(breaker.execute(async () => { throw LlmError.fromStatus(500); })).rejects.toThrow();
    const provider = createProviderFromEnv({ env: {}, breaker });
    await expect(provider.complete({ ...PREGUNTA, maxTokens: 100 })).rejects.toMatchObject({
      kind: "circuitOpen",
    });
  });

  it("aplica la cuota por usuario y corta al agotarla", async () => {
    const clock = fakeClock();
    const quota = new TokenBucketQuota({ capacity: 1, refillCount: 1, refillIntervalMs: 60_000, now: clock.now });
    const provider = createProviderFromEnv({ env: {}, quota, getQuotaUserId: () => "anon-1" });
    await expect(provider.complete({ ...PREGUNTA, maxTokens: 100 })).resolves.toBeTruthy();
    await expect(provider.complete({ ...PREGUNTA, maxTokens: 100 })).rejects.toMatchObject({
      kind: "quotaExceeded",
    });
  });

  it("aplica el presupuesto diario antes de llamar", async () => {
    const clock = fakeClock();
    const budget = new DailyBudget({ limitTokens: 50, now: clock.now });
    const provider = createProviderFromEnv({ env: {}, budget });
    await expect(provider.complete({ ...PREGUNTA, maxTokens: 100 })).rejects.toMatchObject({
      kind: "quotaExceeded",
    });
  });

  it("registra el consumo en el presupuesto tras responder", async () => {
    const clock = fakeClock();
    const budget = new DailyBudget({ limitTokens: 500, now: clock.now });
    const provider = createProviderFromEnv({ env: {}, budget });
    await provider.complete({ ...PREGUNTA, maxTokens: 100 });
    expect(budget.spent).toBe(100);
  });

  it("exige un identificador anónimo cuando hay cuota", async () => {
    const clock = fakeClock();
    const quota = new TokenBucketQuota({ capacity: 1, refillCount: 1, refillIntervalMs: 60_000, now: clock.now });
    const provider = createProviderFromEnv({ env: {}, quota, getQuotaUserId: () => undefined });
    await expect(provider.complete({ ...PREGUNTA, maxTokens: 100 })).rejects.toMatchObject({
      kind: "invalidInput",
    });
  });

  it("sin protecciones se comporta igual que el proveedor base", async () => {
    const provider = createProviderFromEnv({ env: {} });
    await expect(provider.complete({ ...PREGUNTA, maxTokens: 100 })).resolves.toBeTruthy();
  });
});

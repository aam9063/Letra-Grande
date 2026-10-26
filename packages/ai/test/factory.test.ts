// Factoría de proveedores desde el entorno (AI-06, T3 y T5).
import { describe, expect, it } from "vitest";
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

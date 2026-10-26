// Adaptador mock determinista (AI-06, T3).
import { describe, expect, it } from "vitest";
import { createMockProvider } from "../src/mock.js";

function complete(provider: ReturnType<typeof createMockProvider>) {
  return provider.complete({
    system: "sistema-de-prueba",
    messages: [{ role: "user", content: "que es una factura" }],
    maxTokens: 256,
  });
}

describe("adaptador mock", () => {
  it("devuelve la misma respuesta para la misma pregunta en dos ejecuciones seguidas", async () => {
    const provider = createMockProvider();
    const primera = await complete(provider);
    const segunda = await complete(provider);
    expect(primera.text).toBe(segunda.text);
    expect(primera).toEqual(segunda);
  });

  it("responde desde una tabla fija", async () => {
    const provider = createMockProvider({
      table: { pregunta: "respuesta fija" },
    });
    const result = await provider.complete({
      system: "s",
      messages: [{ role: "user", content: "pregunta" }],
      maxTokens: 100,
    });
    expect(result.text).toBe("respuesta fija");
  });

  it("ignora espacios y saltos de línea al buscar la pregunta", async () => {
    const provider = createMockProvider({
      table: { "hola que tal": "saludo" },
    });
    const result = await provider.complete({
      system: "s",
      messages: [{ role: "user", content: "  hola\nque\ttal  " }],
      maxTokens: 100,
    });
    expect(result.text).toBe("saludo");
  });

  it("falla de forma clara con una pregunta desconocida", async () => {
    const provider = createMockProvider({ table: {} });
    await expect(complete(provider)).rejects.toMatchObject({
      kind: "noAnswer",
    });
  });

  it("rechaza un maxTokens insuficiente antes de responder", async () => {
    const provider = createMockProvider();
    await expect(
      provider.complete({
        system: "s",
        messages: [{ role: "user", content: "p" }],
        maxTokens: 0,
      }),
    ).rejects.toMatchObject({ kind: "invalidInput" });
  });

  it("se llama mock y sirve de proveedor por defecto sin entorno", () => {
    expect(createMockProvider().name).toBe("mock");
  });
});

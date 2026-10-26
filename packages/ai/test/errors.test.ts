// Clasificación de errores del proveedor de IA (AI-06, T2).
import { describe, expect, it } from "vitest";
import { LlmError, classifyStatus } from "../src/errors.js";

describe("classifyStatus", () => {
  it("clasifica 401 como autenticación sin reintento", () => {
    const c = classifyStatus(401);
    expect(c.kind).toBe("auth");
    expect(c.retryable).toBe(false);
  });

  it("clasifica 402 como cuota agotada sin reintento", () => {
    const c = classifyStatus(402);
    expect(c.kind).toBe("payment");
    expect(c.retryable).toBe(false);
  });

  it("clasifica 403 como plan sin acceso sin reintento", () => {
    const c = classifyStatus(403);
    expect(c.kind).toBe("forbidden");
    expect(c.retryable).toBe(false);
  });

  it("clasifica 404 como modelo inexistente sin reintento", () => {
    const c = classifyStatus(404);
    expect(c.kind).toBe("notFound");
    expect(c.retryable).toBe(false);
  });

  it("clasifica 429 como límite de peticiones con reintento", () => {
    const c = classifyStatus(429);
    expect(c.kind).toBe("rateLimit");
    expect(c.retryable).toBe(true);
  });

  it("clasifica los 5xx como error del servidor con reintento", () => {
    for (const status of [500, 502, 503, 599]) {
      const c = classifyStatus(status);
      expect(c.kind).toBe("server");
      expect(c.retryable).toBe(true);
    }
  });

  it("clasifica otros estados como desconocidos sin reintento", () => {
    for (const status of [302, 400, 418]) {
      const c = classifyStatus(status);
      expect(c.kind).toBe("unknown");
      expect(c.retryable).toBe(false);
    }
  });
});

describe("LlmError", () => {
  it("expone el tipo, el estado y si es reintentable", () => {
    const e = LlmError.fromStatus(429);
    expect(e).toBeInstanceOf(LlmError);
    expect(e.kind).toBe("rateLimit");
    expect(e.status).toBe(429);
    expect(e.retryable).toBe(true);
  });

  it("no incluye el cuerpo de la respuesta en el mensaje", () => {
    const e = LlmError.fromStatus(500);
    expect(e.message).toContain("500");
    expect(e.message.toLowerCase()).not.toContain("body");
  });
});

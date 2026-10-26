// Circuit breaker con reloj inyectado (AI-06, T4).
import { describe, expect, it } from "vitest";
import { CircuitBreaker } from "../src/circuit-breaker.js";

function fakeClock() {
  let now = 1_000;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("CircuitBreaker", () => {
  it("empieza cerrado y se queda cerrado con éxitos", async () => {
    const clock = fakeClock();
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      cooldownMs: 1_000,
      now: clock.now,
    });
    expect(breaker.state).toBe("closed");
    await breaker.execute(async () => "ok");
    expect(breaker.state).toBe("closed");
    expect(breaker.failures).toBe(0);
  });

  it("abre tras el umbral de fallos consecutivos y corta sin llamar", async () => {
    const clock = fakeClock();
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      cooldownMs: 1_000,
      now: clock.now,
    });
    let llamadas = 0;
    const fallar = async () => {
      llamadas += 1;
      throw new Error("fallo");
    };
    for (let i = 0; i < 3; i += 1) {
      await expect(breaker.execute(fallar)).rejects.toThrow("fallo");
    }
    expect(breaker.state).toBe("open");
    expect(llamadas).toBe(3);
    await expect(breaker.execute(fallar)).rejects.toMatchObject({
      kind: "circuitOpen",
    });
    expect(llamadas).toBe(3);
  });

  it("pasa a semiabierto tras el enfriamiento y cierra si la prueba funciona", async () => {
    const clock = fakeClock();
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      cooldownMs: 5_000,
      now: clock.now,
    });
    const fallar = async () => {
      throw new Error("fallo");
    };
    await expect(breaker.execute(fallar)).rejects.toThrow();
    await expect(breaker.execute(fallar)).rejects.toThrow();
    expect(breaker.state).toBe("open");

    clock.advance(4_999);
    expect(breaker.state).toBe("open");
    clock.advance(1);
    expect(breaker.state).toBe("halfOpen");

    await breaker.execute(async () => "recuperado");
    expect(breaker.state).toBe("closed");
    expect(breaker.failures).toBe(0);
  });

  it("vuelve a abrir si la prueba en semiabierto falla", async () => {
    const clock = fakeClock();
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      cooldownMs: 1_000,
      now: clock.now,
    });
    const fallar = async () => {
      throw new Error("fallo");
    };
    await expect(breaker.execute(fallar)).rejects.toThrow();
    clock.advance(1_000);
    expect(breaker.state).toBe("halfOpen");
    await expect(breaker.execute(fallar)).rejects.toThrow("fallo");
    expect(breaker.state).toBe("open");
  });
});

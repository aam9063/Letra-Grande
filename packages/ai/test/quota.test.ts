// Cuota por usuario anónimo (cubo de fichas con reloj inyectado) y presupuesto diario (AI-06, T4).
import { describe, expect, it } from "vitest";
import { DailyBudget } from "../src/budget.js";
import { TokenBucketQuota } from "../src/quota.js";

function fakeClock() {
  let now = 1_000;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("TokenBucketQuota", () => {
  it("permite un arranque de fichas y corta al agotarse", () => {
    const clock = fakeClock();
    const quota = new TokenBucketQuota({
      capacity: 3,
      refillCount: 1,
      refillIntervalMs: 1_000,
      now: clock.now,
    });
    expect(quota.tryConsume("usuario-a")).toBe(true);
    expect(quota.tryConsume("usuario-a")).toBe(true);
    expect(quota.tryConsume("usuario-a")).toBe(true);
    expect(quota.tryConsume("usuario-a")).toBe(false);
  });

  it("rellena fichas con el tiempo de forma determinista", () => {
    const clock = fakeClock();
    const quota = new TokenBucketQuota({
      capacity: 2,
      refillCount: 1,
      refillIntervalMs: 1_000,
      now: clock.now,
    });
    expect(quota.tryConsume("u")).toBe(true);
    expect(quota.tryConsume("u")).toBe(true);
    expect(quota.tryConsume("u")).toBe(false);

    clock.advance(999);
    expect(quota.tryConsume("u")).toBe(false);
    clock.advance(1);
    expect(quota.tryConsume("u")).toBe(true);
    expect(quota.tryConsume("u")).toBe(false);
  });

  it("no comparte fichas entre usuarios distintos", () => {
    const clock = fakeClock();
    const quota = new TokenBucketQuota({
      capacity: 1,
      refillCount: 1,
      refillIntervalMs: 60_000,
      now: clock.now,
    });
    expect(quota.tryConsume("u1")).toBe(true);
    expect(quota.tryConsume("u1")).toBe(false);
    expect(quota.tryConsume("u2")).toBe(true);
  });

  it("no rellena por encima de la capacidad", () => {
    const clock = fakeClock();
    const quota = new TokenBucketQuota({
      capacity: 2,
      refillCount: 1,
      refillIntervalMs: 1_000,
      now: clock.now,
    });
    clock.advance(10 * 1_000);
    expect(quota.tryConsume("u")).toBe(true);
    expect(quota.tryConsume("u")).toBe(true);
    expect(quota.tryConsume("u")).toBe(false);
  });

  it("expulsa al usuario menos reciente al superar el máximo de usuarios (R4)", () => {
    const clock = fakeClock();
    const quota = new TokenBucketQuota({
      capacity: 1,
      refillCount: 1,
      refillIntervalMs: 60_000,
      maxUsers: 2,
      now: clock.now,
    });
    expect(quota.tryConsume("u1")).toBe(true);
    expect(quota.tryConsume("u2")).toBe(true);
    expect(quota.tryConsume("u3")).toBe(true);
    expect(quota.tryConsume("u4")).toBe(true);
    // Quedan u3 y u4; el estado de u1 y u2 se ha descartado.
    expect(quota.available("u3")).toBe(0);
    expect(quota.available("u4")).toBe(0);
  });

  it("un id nuevo recibe un cubo completo tras la expulsión (R4)", () => {
    const clock = fakeClock();
    const quota = new TokenBucketQuota({
      capacity: 1,
      refillCount: 1,
      refillIntervalMs: 60_000,
      maxUsers: 2,
      now: clock.now,
    });
    expect(quota.tryConsume("u1")).toBe(true);
    expect(quota.tryConsume("u2")).toBe(true);
    expect(quota.tryConsume("u3")).toBe(true);
    // u1 fue expulsado: si vuelve, empieza con el cubo lleno.
    expect(quota.tryConsume("u1")).toBe(true);
    expect(quota.available("u1")).toBe(0);
  });

  it("rechaza una configuración de máximo de usuarios no válida", () => {
    const clock = fakeClock();
    expect(
      () =>
        new TokenBucketQuota({
          capacity: 1,
          refillCount: 1,
          refillIntervalMs: 1_000,
          maxUsers: 0,
          now: clock.now,
        }),
    ).toThrow(/maxUsers/);
  });
});

describe("DailyBudget", () => {
  it("deja gastar dentro del límite y corta al llegar", () => {
    const clock = fakeClock();
    const budget = new DailyBudget({ limitTokens: 1_000, now: clock.now });
    expect(budget.canSpend(400)).toBe(true);
    expect(budget.spend(400)).toBe(true);
    expect(budget.spent).toBe(400);
    expect(budget.spend(600)).toBe(true);
    expect(budget.spent).toBe(1_000);
    expect(budget.spend(1)).toBe(false);
    expect(budget.spent).toBe(1_000);
  });

  it("rechaza de golpe lo que no cabe y no registra nada", () => {
    const clock = fakeClock();
    const budget = new DailyBudget({ limitTokens: 100, now: clock.now });
    expect(budget.spend(101)).toBe(false);
    expect(budget.spent).toBe(0);
  });

  it("se reinicia al cambiar el día", () => {
    const clock = fakeClock();
    const budget = new DailyBudget({ limitTokens: 100, now: clock.now });
    expect(budget.spend(100)).toBe(true);
    clock.advance(26 * 60 * 60 * 1_000);
    expect(budget.spent).toBe(0);
    expect(budget.spend(100)).toBe(true);
  });
});

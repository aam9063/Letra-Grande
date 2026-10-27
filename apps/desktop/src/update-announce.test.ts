import { describe, expect, it } from "vitest";
import { createVersionAnnouncer } from "./update-announce.js";

describe("memoria de la ultima version anunciada", () => {
  it("anuncia una version la primera vez", () => {
    const memoria = createVersionAnnouncer();
    expect(memoria.shouldAnnounce("0.0.2")).toBe(true);
  });

  it("no anuncia dos veces la misma version", () => {
    const memoria = createVersionAnnouncer();
    expect(memoria.shouldAnnounce("0.0.2")).toBe(true);
    expect(memoria.shouldAnnounce("0.0.2")).toBe(false);
  });

  it("vuelve a anunciar cuando llega una version distinta", () => {
    const memoria = createVersionAnnouncer();
    expect(memoria.shouldAnnounce("0.0.2")).toBe(true);
    expect(memoria.shouldAnnounce("0.0.2")).toBe(false);
    expect(memoria.shouldAnnounce("0.0.3")).toBe(true);
    expect(memoria.shouldAnnounce("0.0.3")).toBe(false);
  });

  it("no anuncia una version vacia ni recortada en blanco", () => {
    const memoria = createVersionAnnouncer();
    expect(memoria.shouldAnnounce("")).toBe(false);
    expect(memoria.shouldAnnounce("   ")).toBe(false);
  });
});

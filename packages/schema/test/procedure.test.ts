import { describe, expect, it } from "vitest";
import { Procedure } from "../src";
import { asProcedure, loadTemplate, makeProcedure } from "./helpers";

describe("Procedure", () => {
  it("la plantilla de trámites valida", () => {
    const result = Procedure.safeParse(asProcedure(loadTemplate("procedures")));
    expect(result.success).toBe(true);
  });

  it("pasos con numeración rota fallan", () => {
    const data = makeProcedure({
      steps: [
        { n: 1, text: "Primer paso.", sourceId: "fuente-1" },
        { n: 3, text: "Segundo paso.", sourceId: "fuente-1" },
      ],
    });
    const result = Procedure.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("numerarse"))).toBe(true);
    }
  });

  it("un sourceId inexistente en un aviso falla", () => {
    const data = makeProcedure({
      warnings: [{ text: "Ojo con el plazo.", sourceId: "no-existe" }],
    });
    const result = Procedure.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('"no-existe"'))).toBe(true);
    }
  });
});

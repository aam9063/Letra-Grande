import { describe, expect, it } from "vitest";
import { Authority } from "../src";
import { asAuthority, loadTemplate, makeAuthority } from "./helpers";

describe("Authority", () => {
  it("la plantilla de organismos valida", () => {
    const result = Authority.safeParse(asAuthority(loadTemplate("authorities")));
    expect(result.success).toBe(true);
  });

  it("un organismo autonómico sin región falla", () => {
    const data = makeAuthority({ scope: "autonomico", region: undefined });
    const result = Authority.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("`region`"))).toBe(true);
    }
  });

  it("un organismo estatal no necesita región", () => {
    const data = makeAuthority({ scope: "estatal", region: undefined });
    expect(Authority.safeParse(data).success).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { Company } from "../src";
import { asCompany, loadTemplate, makeCompany } from "./helpers";

describe("Company", () => {
  it("la plantilla de empresas valida", () => {
    const result = Company.safeParse(asCompany(loadTemplate("companies")));
    expect(result.success).toBe(true);
  });

  it("una ficha verificada sin fecha de verificación falla", () => {
    const data = makeCompany({
      verification: { verified: true, verifiedBy: "Ana" },
    });
    const result = Company.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("fecha de verificación"))).toBe(true);
    }
  });

  it("una ficha verificada sin quién la verificó falla", () => {
    const data = makeCompany({
      verification: { verified: true, verifiedOn: "2026-10-26" },
    });
    const result = Company.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("quién la verificó"))).toBe(true);
    }
  });

  it("una ficha verificada solo con fuentes de terceros falla", () => {
    const data = makeCompany({
      sources: [
        {
          id: "pista",
          title: "Foro de ejemplo",
          url: "https://forum.example.com/",
          kind: "tercero",
          retrievedOn: "2026-10-26",
        },
      ],
      verification: { verified: true, verifiedOn: "2026-10-26", verifiedBy: "Ana" },
    });
    const result = Company.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes("fuente oficial o de la propia empresa")),
      ).toBe(true);
    }
  });

  it("un sourceId inexistente falla", () => {
    const data = makeCompany();
    data.channels.atencionCliente = [
      { kind: "web", value: "https://example.com/atencion", sourceId: "no-existe" },
    ];
    const result = Company.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('"no-existe"'))).toBe(true);
    }
  });

  it("un id de fuente repetido falla", () => {
    const data = makeCompany();
    data.sources = [
      ...data.sources,
      { ...data.sources[0]!, id: "web-empresa" },
    ];
    const result = Company.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("repetido"))).toBe(true);
    }
  });
});

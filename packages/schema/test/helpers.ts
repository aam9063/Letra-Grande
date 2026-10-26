import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import type { Authority, Company, Procedure } from "../src";

const contentRoot = fileURLToPath(new URL("../../../content", import.meta.url));

export function loadTemplate(dir: string): unknown {
  return parse(readFileSync(join(contentRoot, dir, "_template.yaml"), "utf8"));
}

export function asCompany(data: unknown): Company {
  return data as Company;
}
export function asAuthority(data: unknown): Authority {
  return data as Authority;
}
export function asProcedure(data: unknown): Procedure {
  return data as Procedure;
}

type CompanyInput = Omit<Company, "channels" | "escalation"> & {
  channels?: Partial<Company["channels"]>;
  escalation?: string[];
};

export function makeCompany(overrides: Partial<CompanyInput> = {}): Company {
  const base: CompanyInput = {
    id: "empresa-ejemplo",
    name: "Empresa Ejemplo S.A. (ficha ficticia)",
    sector: "otros",
    channels: {
      atencionCliente: [
        { kind: "web", value: "https://example.com/atencion", sourceId: "web-empresa" },
      ],
      reclamacion: [],
      baja: [],
    },
    escalation: [],
    sources: [
      {
        id: "web-empresa",
        title: "Web de ejemplo",
        url: "https://example.com/",
        kind: "empresa",
        retrievedOn: "2026-10-26",
      },
    ],
    verification: { verified: false },
  };
  return { ...base, ...overrides } as Company;
}

type AuthorityInput = Omit<Authority, "sectors"> & { sectors?: Authority["sectors"] };

export function makeAuthority(overrides: Partial<AuthorityInput> = {}): Authority {
  const base: AuthorityInput = {
    id: "organismo-ejemplo",
    name: "Organismo de ejemplo (ficha ficticia)",
    scope: "estatal",
    sectors: ["otros"],
    url: "https://example.com/organismo",
    howToFile: "Descripción de cómo presentar una reclamación, tal como la explica la fuente.",
    sources: [
      {
        id: "web-organismo",
        title: "Web de ejemplo",
        url: "https://example.com/",
        kind: "oficial",
        retrievedOn: "2026-10-26",
      },
    ],
    verification: { verified: false },
  };
  return { ...base, ...overrides } as Authority;
}

type ProcedureInput = Omit<Procedure, "steps" | "documents" | "deadlines" | "warnings" | "legalBasis"> & {
  steps?: Procedure["steps"];
  documents?: Procedure["documents"];
  deadlines?: Procedure["deadlines"];
  warnings?: Procedure["warnings"];
  legalBasis?: Procedure["legalBasis"];
};

export function makeProcedure(overrides: Partial<ProcedureInput> = {}): Procedure {
  const base: ProcedureInput = {
    id: "tramite-ejemplo",
    title: "Trámite de ejemplo (ficha ficticia)",
    audience: "consumidor",
    sector: "otros",
    summary: "Resumen de una o dos frases de qué consigue este trámite.",
    steps: [
      { n: 1, text: "Primer paso, redactado en imperativo amable.", sourceId: "fuente-1" },
      { n: 2, text: "Segundo paso.", sourceId: "fuente-1" },
    ],
    documents: [],
    deadlines: [],
    warnings: [],
    legalBasis: [],
    sources: [
      {
        id: "fuente-1",
        title: "Fuente de ejemplo",
        url: "https://example.com/fuente",
        kind: "oficial",
        retrievedOn: "2026-10-26",
      },
    ],
    verification: { verified: false },
  };
  return { ...base, ...overrides } as Procedure;
}

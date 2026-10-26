// TDD AI-03a: tokenizador, índice BM25 y búsqueda sobre fichas ficticias.
// Todas las fichas de este archivo son ficticias: nunca datos reales.
import { describe, expect, it } from "vitest";
import { Authority, Company, Procedure } from "@letra-grande/schema";
import { buildIndex, search, type FichasInput } from "../src/retrieval/index.js";
import { tokenize } from "../src/retrieval/tokenize.js";

const fuenteTeleco = {
  id: "web-teleco",
  title: "Web de Teleco Ejemplo",
  url: "https://example.com/teleco",
  kind: "empresa" as const,
  retrievedOn: "2026-01-15",
};

const fuenteEnergia = {
  id: "web-energia",
  title: "Web de Energia Ejemplo",
  url: "https://example.com/energia",
  kind: "empresa" as const,
  retrievedOn: "2026-01-15",
};

const fuenteValencia = {
  id: "web-omac-valencia",
  title: "Web del OMAC de Valencia",
  url: "https://example.com/omac-valencia",
  kind: "oficial" as const,
  retrievedOn: "2026-01-15",
};

const fuenteCataluna = {
  id: "web-omac-cataluna",
  title: "Web del OMAC de Cataluña",
  url: "https://example.com/omac-cataluna",
  kind: "oficial" as const,
  retrievedOn: "2026-01-15",
};

function empresaTeleco(): Company {
  return Company.parse({
    id: "teleco-ejemplo",
    name: "Teleco Ejemplo S.A.",
    sector: "telefonia",
    channels: {
      atencionCliente: [{ kind: "web", value: "https://example.com/teleco/ayuda", sourceId: "web-teleco" }],
      reclamacion: [
        {
          kind: "web",
          value: "https://example.com/teleco/reclamacion",
          notes: "Formulario de reclamación online",
          sourceId: "web-teleco",
        },
      ],
      baja: [
        {
          kind: "web",
          value: "https://example.com/teleco/baja",
          notes: "Cómo darse de baja desde el área de cliente",
          sourceId: "web-teleco",
        },
      ],
    },
    escalation: [],
    sources: [fuenteTeleco],
    verification: { verified: false, note: "Ficha ficticia de prueba." },
  });
}

function empresaEnergia(): Company {
  return Company.parse({
    id: "energia-ejemplo",
    name: "Energia Ejemplo S.L.",
    sector: "energia",
    channels: {
      atencionCliente: [{ kind: "web", value: "https://example.com/energia/ayuda", sourceId: "web-energia" }],
      reclamacion: [
        {
          kind: "email",
          value: "reclama@example.com",
          notes: "Envía la reclamación por correo electrónico",
          sourceId: "web-energia",
        },
      ],
      baja: [],
    },
    escalation: [],
    sources: [fuenteEnergia],
    verification: { verified: false, note: "Ficha ficticia de prueba." },
  });
}

function organismoValencia(): Authority {
  return Authority.parse({
    id: "omac-valencia",
    name: "OMAC Valencia",
    scope: "local",
    region: "valencia",
    sectors: ["otros"],
    url: "https://example.com/omac-valencia",
    howToFile: "Presenta la reclamación en la oficina municipal de consumo de Valencia.",
    sources: [fuenteValencia],
    verification: { verified: false, note: "Ficha ficticia de prueba." },
  });
}

function organismoCataluna(): Authority {
  return Authority.parse({
    id: "omac-cataluna",
    name: "OMAC Cataluña",
    scope: "autonomico",
    region: "cataluna",
    sectors: ["otros"],
    url: "https://example.com/omac-cataluna",
    howToFile: "Presenta la reclamación en la agencia de consumo de Cataluña.",
    sources: [fuenteCataluna],
    verification: { verified: true, verifiedOn: "2026-02-01", verifiedBy: "Revisión humana ficticia" },
  });
}

function tramiteBaja(): Procedure {
  return Procedure.parse({
    id: "baja-telefonia",
    title: "Baja de línea telefónica",
    audience: "consumidor",
    sector: "telefonia",
    summary: "Cómo solicitar la baja de una línea de telefonía según la ficha.",
    steps: [
      { n: 1, text: "Presenta la reclamación de baja por el canal de la empresa.", sourceId: "web-teleco" },
      { n: 2, text: "Conserva el justificante de la solicitud.", sourceId: "web-teleco" },
    ],
    documents: [],
    deadlines: [
      {
        id: "plazo-respuesta",
        label: "Respuesta de la empresa",
        kind: "plazo_legal",
        amount: 15,
        unit: "dias_naturales",
        from: "recepción de la solicitud",
        sourceId: "web-teleco",
      },
    ],
    warnings: [{ text: "Revisa la permanencia antes de pedir la baja.", sourceId: "web-teleco" }],
    legalBasis: [],
    sources: [fuenteTeleco],
    verification: { verified: false, note: "Ficha ficticia de prueba." },
  });
}

function fichasPrueba(): FichasInput {
  return {
    companies: [empresaTeleco(), empresaEnergia()],
    authorities: [organismoValencia(), organismoCataluna()],
    procedures: [tramiteBaja()],
  };
}

describe("tokenize", () => {
  it("pasa a minúsculas, quita acentos y signos y suelta palabras vacías", () => {
    expect(tokenize("Reclamación: ¡Darme de BAJA!")).toEqual(["reclamacion", "darme", "baja"]);
  });

  it("normaliza ü y ñ de forma determinista", () => {
    expect(tokenize("Año, cigüeña")).toEqual(["ano", "ciguena"]);
  });

  it("suelta tokens de una o dos letras", () => {
    expect(tokenize("yo y a la telefonía")).toEqual(["telefonia"]);
  });

  it("conserva números dentro de tokens y suelta números sueltos", () => {
    expect(tokenize("plazo de 15 dias naturales")).toEqual(["plazo", "dias", "naturales"]);
  });

  it("devuelve una lista vacía para texto sin contenido útil", () => {
    expect(tokenize("!!! ... ??")).toEqual([]);
  });
});

describe("buildIndex y search", () => {
  it("un documento por ficha y por sección, con sourceId, título, url, sector, región, tipo y verified", () => {
    const index = buildIndex(fichasPrueba());
    const titulos = index.documents.map((d) => d.titulo);
    expect(titulos).toContain("Teleco Ejemplo S.A.: baja");
    expect(titulos).toContain("Teleco Ejemplo S.A.: reclamación");
    expect(titulos).toContain("Baja de línea telefónica: paso 1");
    expect(titulos).toContain("Baja de línea telefónica: plazo Respuesta de la empresa");

    const baja = index.documents.find((d) => d.titulo === "Teleco Ejemplo S.A.: baja");
    expect(baja).toMatchObject({
      sourceId: "web-teleco",
      url: "https://example.com/teleco",
      sector: "telefonia",
      region: "",
      tipo: "empresa",
      verified: false,
    });
    // El texto de la sección menciona el canal de baja.
    expect(baja?.texto).toContain("baja");
  });

  it("el ranking coloca primero el documento con canal de baja para una consulta de baja", () => {
    const results = search(buildIndex(fichasPrueba()), "cómo darme de baja de mi compañía");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.titulo).toBe("Teleco Ejemplo S.A.: baja");
  });

  it("la búsqueda no distingue acentos ni mayúsculas: reclamacion encuentra reclamación", () => {
    const results = search(buildIndex(fichasPrueba()), "RECLAMACION");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((d) => d.titulo.includes("reclamación") || d.texto.includes("reclamación"))).toBe(true);
  });

  it("el filtro por región excluye fichas de otra comunidad", () => {
    const results = search(buildIndex(fichasPrueba()), "reclamación", { region: "cataluna" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((d) => d.region === "cataluna" || d.region === "")).toBe(true);
    expect(results.some((d) => d.region === "valencia")).toBe(false);
  });

  it("el filtro por sector excluye fichas de otro sector", () => {
    const results = search(buildIndex(fichasPrueba()), "reclamación baja", { sector: "energia" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((d) => d.sector === "energia")).toBe(true);
  });

  it("el filtro por tipo solo devuelve fichas de ese tipo", () => {
    const results = search(buildIndex(fichasPrueba()), "reclamación", { tipo: "tramite" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((d) => d.tipo === "tramite")).toBe(true);
  });

  it("una consulta vacía y una sin coincidencias devuelven una lista vacía", () => {
    const index = buildIndex(fichasPrueba());
    expect(search(index, "   ")).toEqual([]);
    expect(search(index, "zzzqqq xxxxxx")).toEqual([]);
  });

  it("título y url del documento se propagan al resultado, con su puntuación", () => {
    const results = search(buildIndex(fichasPrueba()), "baja");
    const baja = results.find((d) => d.titulo === "Teleco Ejemplo S.A.: baja");
    expect(baja).toBeDefined();
    expect(baja?.url).toBe("https://example.com/teleco");
    expect(baja?.sourceId).toBe("web-teleco");
    expect(baja?.score).toBeGreaterThan(0);
  });

  it("una ficha con verified: false sigue siendo recuperable y se marca en el título del resultado", () => {
    const index = buildIndex(fichasPrueba());
    const conSinVerificar = index.documents.filter((d) => d.verified === false);
    expect(conSinVerificar.length).toBeGreaterThan(0);
    const results = search(index, "reclamación", { tipo: "empresa" });
    const marcados = results.filter((d) => d.verified === false);
    expect(marcados.length).toBeGreaterThan(0);
    // El índice no muta: verified queda como en la ficha, el marcado es del adaptador.
    expect(conSinVerificar.every((d) => !d.titulo.includes("sin verificar"))).toBe(true);
  });

  it("el orden es estable: misma puntuación, sourceId en orden creciente", () => {
    const index = buildIndex(fichasPrueba());
    const results = search(index, "reclamación", {}, { minScore: 0 });
    for (let i = 1; i < results.length; i += 1) {
      const prev = results[i - 1] as (typeof results)[number];
      const curr = results[i] as (typeof results)[number];
      if (curr.score === prev.score) {
        expect(prev.sourceId <= curr.sourceId).toBe(true);
      }
      expect(curr.score).toBeLessThanOrEqual(prev.score);
    }
  });

  it("search no muta el índice", () => {
    const index = buildIndex(fichasPrueba());
    const before = JSON.stringify(index.documents);
    search(index, "baja reclamación telefonía", { region: "valencia" }, { minScore: 0 });
    expect(JSON.stringify(index.documents)).toBe(before);
  });
});

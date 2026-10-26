// TDD AI-03a: tokenizador, índice BM25 y búsqueda sobre fichas ficticias.
// Todas las fichas de este archivo son ficticias: nunca datos reales.
import { describe, expect, it } from "vitest";
import { Authority, Company, Procedure } from "@letra-grande/schema";
import {
  buildIndex,
  buildIndexFromDocuments,
  search,
  type FichasInput,
  type IndexedDocument,
} from "../src/retrieval/index.js";
import { tokenize } from "../src/retrieval/tokenize.js";

/** Documento de índice para pruebas directas del gate y del ranking. */
function doc(
  partial: Partial<IndexedDocument> & Pick<IndexedDocument, "sourceId" | "titulo" | "url" | "texto">,
): IndexedDocument {
  return { sector: "", region: "", tipo: "empresa", verified: true, ...partial };
}

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
          notes: "Cómo darse de baja: pide la baja desde el área de cliente",
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
    const results = search(buildIndex(fichasPrueba()), "reclamación", { sector: "energia" });
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

  it("una ficha con verified: false sigue siendo recuperable y el índice no altera su título", () => {
    const index = buildIndex(fichasPrueba());
    const conSinVerificar = index.documents.filter((d) => d.verified === false);
    expect(conSinVerificar.length).toBeGreaterThan(0);
    const results = search(index, "reclamación", { tipo: "empresa" });
    const marcados = results.filter((d) => d.verified === false);
    expect(marcados.length).toBeGreaterThan(0);
    // El marcado lo hace el recuperador con el campo verified (no el título):
    // el índice conserva la ficha tal cual.
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

describe("puerta de evidencia del gate (revisión AI-03a)", () => {
  /** Cinco fichas de gas y cinco del IBI: el caso que motivó el gate. */
  function indiceGasIbi(): ReturnType<typeof buildIndexFromDocuments> {
    const docs: IndexedDocument[] = [];
    for (const n of ["uno", "dos", "tres", "cuatro", "cinco"]) {
      docs.push(
        doc({
          sourceId: `gas-${n}`,
          titulo: `Ficha de gas ${n}`,
          url: "https://example.com/gas",
          texto: `la empresa gestiona el contrato del gas de la factura ${n}`,
        }),
        doc({
          sourceId: `ibi-${n}`,
          titulo: `Ficha del IBI ${n}`,
          url: "https://example.com/ibi",
          texto: `la empresa gestiona el contrato del ibi de la factura ${n}`,
        }),
      );
    }
    return buildIndexFromDocuments(docs);
  }

  it("el término más raro decide: la pregunta del IBI solo devuelve documentos del IBI", () => {
    const results = search(indiceGasIbi(), "que empresa gestiona el contrato del ibi");
    expect(results.length).toBe(5);
    expect(results.every((d) => d.texto.includes("ibi"))).toBe(true);
    expect(results[0]?.texto).toContain("ibi");
  });

  it("una consulta que solo comparte la palabra común a todo el corpus no devuelve nada", () => {
    expect(search(indiceGasIbi(), "empresa")).toEqual([]);
  });

  it("una consulta cuyos términos no existen en el corpus devuelve vacío", () => {
    expect(search(indiceGasIbi(), "zzzqqq")).toEqual([]);
  });

  it("la longitud del documento es la suma de frecuencias: repetir no vence a uno corto y centrado", () => {
    const index = buildIndexFromDocuments([
      doc({ sourceId: "s-a", titulo: "Documento repetitivo", url: "https://example.com/a", texto: "baja baja baja baja" }),
      doc({ sourceId: "s-b", titulo: "Documento centrado", url: "https://example.com/b", texto: "baja linea" }),
      doc({ sourceId: "s-c", titulo: "Documento tercera", url: "https://example.com/c", texto: "linea aqui contenido distinto" }),
      doc({ sourceId: "s-d", titulo: "Documento cuarta", url: "https://example.com/d", texto: "relleno diferente tambien" }),
    ]);
    const results = search(index, "baja linea");
    expect(results[0]?.sourceId).toBe("s-b");
    expect(results.map((d) => d.sourceId)).toContain("s-a");
  });

  it("las URLs y los correos del texto no generan términos de índice", () => {
    const index = buildIndexFromDocuments([
      doc({
        sourceId: "s1",
        titulo: "Canal de baja",
        url: "https://example.com/baja",
        texto: "web: https://soporte.ejemplo-largo.com/baja (Escribe en el formulario) o a soporte@ejemplo-largo.com",
      }),
      doc({ sourceId: "s2", titulo: "Otra cosa", url: "https://example.com/otra", texto: "contenido distinto" }),
    ]);
    expect(search(index, "soporte")).toEqual([]);
    expect(search(index, "ejemplo")).toEqual([]);
    expect(search(index, "formulario").length).toBe(1);
  });

  it("los filtros ignoran acentos y mayúsculas", () => {
    const index = buildIndex(fichasPrueba());
    const porRegion = search(index, "reclamación", { region: "Cataluña" });
    expect(porRegion.some((d) => d.region === "cataluna")).toBe(true);
    expect(porRegion.some((d) => d.region === "valencia")).toBe(false);
    const porSector = search(index, "reclamación", { sector: "Telefonía" });
    expect(porSector.length).toBeGreaterThan(0);
    expect(porSector.every((d) => d.sector === "telefonia")).toBe(true);
  });

  it("un organismo multissector indexa todos sus sectores y no duplica resultados", () => {
    const index = buildIndexFromDocuments([
      doc({
        sourceId: "omac",
        titulo: "OMAC de Prueba: reclamación",
        url: "https://example.com/omac",
        texto: "Presenta la reclamación en la oficina.",
        sector: "energia",
        tipo: "organismo",
      }),
      doc({
        sourceId: "omac",
        titulo: "OMAC de Prueba: reclamación",
        url: "https://example.com/omac",
        texto: "Presenta la reclamación en la oficina.",
        sector: "telefonia",
        tipo: "organismo",
      }),
    ]);
    expect(search(index, "reclamación", {}, { minScore: 0 })).toHaveLength(1);
    expect(search(index, "reclamación", { sector: "telefonia" }, { minScore: 0 })).toHaveLength(1);
    expect(search(index, "reclamación", { sector: "banca" })).toEqual([]);
  });

  it("cada canal genera su propio documento con su fuente, título y URL", () => {
    const empresa = Company.parse({
      id: "dos-canales",
      name: "Empresa de Dos Canales",
      sector: "telefonia",
      channels: {
        atencionCliente: [],
        reclamacion: [],
        baja: [
          { kind: "web", value: "https://example.com/baja-web", sourceId: "web-baja" },
          { kind: "telefono", value: "900 123 456", sourceId: "tel-baja" },
        ],
      },
      escalation: [],
      sources: [
        { id: "web-baja", title: "Web de baja", url: "https://example.com/web", kind: "empresa", retrievedOn: "2026-01-15" },
        { id: "tel-baja", title: "Teléfono de baja", url: "https://example.com/tel", kind: "empresa", retrievedOn: "2026-01-15" },
      ],
      verification: { verified: false },
    });
    const index = buildIndex({ companies: [empresa], authorities: [], procedures: [] });
    const canales = index.documents.filter((d) => d.titulo === "Empresa de Dos Canales: baja");
    expect(canales).toHaveLength(2);
    const web = canales.find((d) => d.sourceId === "web-baja");
    const tel = canales.find((d) => d.sourceId === "tel-baja");
    expect(web?.url).toBe("https://example.com/web");
    expect(tel?.url).toBe("https://example.com/tel");
    // El valor del canal sigue en el texto (el teléfono), la URL no.
    expect(tel?.texto).toContain("900 123 456");
    expect(web?.texto).not.toContain("baja-web");
  });

  it("un documento sin sector o sin región encaja con cualquier filtro", () => {
    const index = buildIndexFromDocuments([
      doc({ sourceId: "sin-sector", titulo: "Trámite sin sector", url: "https://example.com/t", texto: "reclamación de factura", tipo: "tramite" }),
      doc({ sourceId: "con-sector", titulo: "Trámite de otro sector", url: "https://example.com/o", texto: "reclamación de telefonía", tipo: "tramite", sector: "telefonia" }),
      doc({ sourceId: "relleno-1", titulo: "Relleno uno", url: "https://example.com/r1", texto: "contenido distinto" }),
      doc({ sourceId: "relleno-2", titulo: "Relleno dos", url: "https://example.com/r2", texto: "otro contenido diferente" }),
    ]);
    const conFiltro = search(index, "reclamación", { sector: "energia", region: "madrid" });
    expect(conFiltro.map((d) => d.sourceId)).toContain("sin-sector");
    expect(conFiltro.map((d) => d.sourceId)).not.toContain("con-sector");
  });

  it("un importe con separador de miles se reduce a su parte numérica (comportamiento aceptado)", () => {
    // Aceptado a propósito: el punto es separador, así que "1.500" se reduce a
    // "500". Las cifras que cita el modelo se validan contra el texto completo
    // de la fuente, no contra los términos del índice, así que no se pierde
    // ninguna validación por esta reducción.
    expect(tokenize("1.500 euros")).toEqual(["500", "euros"]);
  });
});

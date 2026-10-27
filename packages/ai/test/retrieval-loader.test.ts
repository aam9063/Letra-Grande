// TDD AI-03a: cargador del índice desde content/ con validación por esquema.
// Los ficheros YAML de las pruebas son ficticios y viven en un directorio temporal.
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { findContentRoot, loadContentIndex } from "../src/retrieval/loader.js";
import { createContentRetriever } from "../src/retrieval/retriever.js";

const raices: string[] = [];

function crearRaizContenido(): string {
  const raiz = mkdtempSync(join(tmpdir(), "lg-retrieval-"));
  raices.push(raiz);
  return raiz;
}

afterAll(() => {
  for (const raiz of raices) rmSync(raiz, { recursive: true, force: true });
});

const yamlEmpresaValida = `id: empresa-prueba
name: Empresa de Prueba S.A. (ficticia)
sector: telefonia
channels:
  baja:
    - kind: web
      value: https://example.com/baja
      sourceId: web-prueba
escalation: []
sources:
  - id: web-prueba
    title: Web de prueba
    url: https://example.com/
    kind: empresa
    retrievedOn: "2026-01-15"
verification:
  verified: false
`;

const yamlOrganismoInvalido = `id: organismo-incorrecto
name: Organismo sin url ni fuentes
scope: estatal
sectors: [otros]
howToFile: Texto de ejemplo.
sources: []
verification:
  verified: false
`;

const yamlRoto = "id: [esto no es: yaml valido";

describe("loadContentIndex", () => {
  it("lee los YAML de content/, valida contra el esquema y salta los ficheros inválidos", () => {
    const raiz = crearRaizContenido();
    mkdirSync(join(raiz, "content", "companies"), { recursive: true });
    mkdirSync(join(raiz, "content", "authorities"), { recursive: true });
    writeFileSync(join(raiz, "content", "companies", "empresa-prueba.yaml"), yamlEmpresaValida);
    writeFileSync(join(raiz, "content", "authorities", "organismo-incorrecto.yaml"), yamlOrganismoInvalido);
    writeFileSync(join(raiz, "content", "authorities", "roto.yaml"), yamlRoto);

    // El contentRoot es la carpeta content/ del repositorio.
    const cargado = loadContentIndex(join(raiz, "content"));
    expect(cargado.filesRead).toBe(3);
    expect(cargado.skippedFiles).toBe(2);
    const titulos = cargado.index.documents.map((d) => d.titulo);
    expect(titulos).toContain("Empresa de Prueba S.A. (ficticia)");
    expect(titulos).toContain("Empresa de Prueba S.A. (ficticia): baja");
  });

  it("cachea el índice en memoria para el mismo contentRoot", () => {
    const raiz = crearRaizContenido();
    mkdirSync(join(raiz, "content", "procedures"), { recursive: true });
    writeFileSync(join(raiz, "content", "procedures", "tramite.yaml"), "id: [roto");
    const primero = loadContentIndex(join(raiz, "content"));
    const segundo = loadContentIndex(join(raiz, "content"));
    expect(segundo).toBe(primero);
  });

  it("un contentRoot sin subcarpetas produce un índice vacío, sin lanzar", () => {
    const raiz = crearRaizContenido();
    const cargado = loadContentIndex(raiz);
    expect(cargado.index.documents).toEqual([]);
    expect(cargado.skippedFiles).toBe(0);
  });
});

describe("createContentRetriever", () => {
  it("devuelve { id, titulo, url, texto, verified } con verified false para fichas sin verificar", async () => {
    const raiz = crearRaizContenido();
    mkdirSync(join(raiz, "content", "companies"), { recursive: true });
    writeFileSync(join(raiz, "content", "companies", "empresa-prueba.yaml"), yamlEmpresaValida);

    const recuperador = createContentRetriever({ contentRoot: join(raiz, "content") });
    const fuentes = await recuperador("darse de baja");
    expect(fuentes.length).toBeGreaterThan(0);
    for (const fuente of fuentes) {
      expect(Object.keys(fuente).sort()).toEqual(["id", "texto", "titulo", "url", "verified"]);
      expect(fuente.verified).toBe(false);
    }
    expect(fuentes.some((f) => f.id === "web-prueba")).toBe(true);
  });

  it("diagnostics devuelve los contadores de carga sin contenido ni logs", async () => {
    const raiz = crearRaizContenido();
    mkdirSync(join(raiz, "content", "companies"), { recursive: true });
    writeFileSync(join(raiz, "content", "companies", "empresa-prueba.yaml"), yamlEmpresaValida);
    writeFileSync(join(raiz, "content", "companies", "rota.yaml"), "id: [roto");

    const recuperador = createContentRetriever({ contentRoot: join(raiz, "content") });
    expect(recuperador.diagnostics()).toEqual({ filesRead: 2, filesSkipped: 1, documents: 2 });
    await recuperador("baja");
    expect(recuperador.diagnostics()).toEqual({ filesRead: 2, filesSkipped: 1, documents: 2 });
  });

  it("sin carpeta de contenido responde sin fuentes y con diagnóstico a cero, sin lanzar", async () => {
    const raiz = crearRaizContenido();
    const recuperador = createContentRetriever({ contentRoot: join(raiz, "no-existe") });
    expect(await recuperador("baja")).toEqual([]);
    expect(recuperador.diagnostics()).toEqual({ filesRead: 0, filesSkipped: 0, documents: 0 });
  });
});

describe("findContentRoot", () => {
  it("sube directorios desde apps/web hasta encontrar content/", () => {
    const raiz = crearRaizContenido();
    mkdirSync(join(raiz, "content", "companies"), { recursive: true });
    mkdirSync(join(raiz, "apps", "web"), { recursive: true });
    expect(findContentRoot(join(raiz, "apps", "web"))).toBe(join(raiz, "content"));
  });

  it("devuelve undefined si no hay content/ en ninguna carpeta ascendente", () => {
    const raiz = crearRaizContenido();
    mkdirSync(join(raiz, "solo", "pruebas"), { recursive: true });
    expect(findContentRoot(join(raiz, "solo", "pruebas"))).toBeUndefined();
  });
});

describe("createContentRetriever: fecha de verificación (AI-05)", () => {
  const yamlEmpresaVerificada = `id: empresa-verificada
name: Empresa Verificada S.L. (ficticia)
sector: energia
channels:
  atencionCliente:
    - kind: web
      value: https://example.com/verificada
      sourceId: web-verificada
escalation: []
sources:
  - id: web-verificada
    title: Web verificada de prueba
    url: https://example.com/verificada
    kind: empresa
    retrievedOn: "2026-01-15"
verification:
  verified: true
  verifiedOn: "2026-05-01"
  verifiedBy: "Revisión humana ficticia"
`;

  it("una ficha verificada llega con su verifiedAt y una sin verificar llega sin él", async () => {
    const raiz = crearRaizContenido();
    mkdirSync(join(raiz, "content", "companies"), { recursive: true });
    writeFileSync(join(raiz, "content", "companies", "verificada.yaml"), yamlEmpresaVerificada);
    writeFileSync(join(raiz, "content", "companies", "sin-verificar.yaml"), yamlEmpresaValida);

    const recuperador = createContentRetriever({ contentRoot: join(raiz, "content") });
    const verificadas = await recuperador("Empresa Verificada");
    const verificada = verificadas.find((f) => f.id === "web-verificada");
    expect(verificada?.verified).toBe(true);
    expect(verificada?.verifiedAt).toBe("2026-05-01");
    // El campo solo existe cuando hay fecha: la forma sin verificar no cambia.
    const sinVerificar = (await recuperador("darse de baja")).find((f) => f.id === "web-prueba");
    expect(sinVerificar?.verified).toBe(false);
    expect(Object.keys(sinVerificar ?? {})).not.toContain("verifiedAt");
  });
});

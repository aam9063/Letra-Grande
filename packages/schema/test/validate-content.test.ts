import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Authority, Company, Procedure } from "../src";
import { validateContent } from "../src/validate-content-core";

// Fichas ficticias de prueba. Nunca datos reales.
const COMPANY = `id: empresa-ejemplo
name: Empresa Ejemplo S.A. (ficha ficticia)
sector: otros
channels:
  atencionCliente: []
  reclamacion: []
  baja: []
escalation: []
sources:
  - id: web-empresa
    title: Web de ejemplo
    url: https://example.com/
    kind: empresa
    retrievedOn: "2026-10-26"
verification:
  verified: false
`;

const COMPANY_WITH_ESCALATION = `id: empresa-con-escalado
name: Empresa con escalado (ficha ficticia)
sector: otros
channels:
  atencionCliente: []
  reclamacion: []
  baja: []
escalation:
  - organismo-fantasma
sources:
  - id: web-empresa
    title: Web de ejemplo
    url: https://example.com/
    kind: empresa
    retrievedOn: "2026-10-26"
verification:
  verified: false
`;

const AUTHORITY = `id: organismo-ejemplo
name: Organismo de ejemplo (ficha ficticia)
scope: estatal
sectors: [otros]
url: https://example.com/organismo
howToFile: Descripción de cómo presentar una reclamación.
sources:
  - id: web-organismo
    title: Web de ejemplo
    url: https://example.com/
    kind: oficial
    retrievedOn: "2026-10-26"
verification:
  verified: false
`;

const AUTHORITY_STALE = `id: organismo-antiguo
name: Organismo antiguo (ficha ficticia)
scope: estatal
sectors: [otros]
url: https://example.com/organismo
howToFile: Descripción de cómo presentar una reclamación.
sources:
  - id: web-organismo
    title: Web de ejemplo
    url: https://example.com/
    kind: oficial
    retrievedOn: "2026-10-26"
verification:
  verified: true
  verifiedOn: "2020-01-01"
  verifiedBy: Ana
`;

const PROCEDURE = `id: tramite-ejemplo
title: Trámite de ejemplo (ficha ficticia)
audience: consumidor
sector: otros
summary: Resumen del trámite.
steps:
  - n: 1
    text: Primer paso.
    sourceId: fuente-1
sources:
  - id: fuente-1
    title: Fuente de ejemplo
    url: https://example.com/fuente
    kind: oficial
    retrievedOn: "2026-10-26"
verification:
  verified: false
`;

function writeYaml(root: string, dir: string, name: string, content: string): void {
  mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, dir, name), content, "utf8");
}

describe("validateContent", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lg-content-test-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const collections = [
    { dir: "companies", schema: Company },
    { dir: "authorities", schema: Authority },
    { dir: "procedures", schema: Procedure },
  ];

  it("un id duplicado en la misma carpeta falla", () => {
    writeYaml(root, "companies", "empresa-a.yaml", COMPANY);
    writeYaml(root, "companies", "empresa-b.yaml", COMPANY);
    const result = validateContent(root, collections);
    expect(result.errors).toContain('companies/empresa-b.yaml: id duplicado "empresa-ejemplo"');
    expect(result.validCount).toBe(2);
  });

  it("un nombre de archivo que no coincide con el id falla", () => {
    writeYaml(root, "companies", "nombre-erroneo.yaml", COMPANY);
    const result = validateContent(root, collections);
    expect(result.errors).toContain(
      'companies/nombre-erroneo.yaml: el nombre del archivo debe ser "empresa-ejemplo.yaml"',
    );
  });

  it("un escalation que apunta a un organismo inexistente falla", () => {
    writeYaml(root, "companies", "empresa-con-escalado.yaml", COMPANY_WITH_ESCALATION);
    writeYaml(root, "authorities", "organismo-ejemplo.yaml", AUTHORITY);
    writeYaml(root, "procedures", "tramite-ejemplo.yaml", PROCEDURE);
    const result = validateContent(root, collections);
    expect(result.errors).toContain(
      'companies/empresa-con-escalado.yaml: escalation apunta a un organismo inexistente "organismo-fantasma"',
    );
  });

  it("una verificación de hace más de 180 días produce un aviso", () => {
    mkdirSync(join(root, "companies"), { recursive: true });
    mkdirSync(join(root, "procedures"), { recursive: true });
    writeYaml(root, "authorities", "organismo-antiguo.yaml", AUTHORITY_STALE);
    const result = validateContent(root, collections);
    expect(result.errors).toHaveLength(0);
    expect(result.validCount).toBe(1);
    expect(result.warnings[0]).toContain("organismo-antiguo.yaml");
    expect(result.warnings[0]).toContain("conviene revisarla");
  });

  it("una carpeta de colección que no existe produce un error claro", () => {
    writeYaml(root, "companies", "empresa-ejemplo.yaml", COMPANY);
    const result = validateContent(root, collections);
    expect(result.errors).toContain("content/procedures: no existe la carpeta de esta colección");
    expect(result.errors).toContain("content/authorities: no existe la carpeta de esta colección");
  });
});

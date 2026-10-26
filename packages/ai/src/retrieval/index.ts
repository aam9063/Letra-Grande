// Índice léxico BM25 sobre el contenido público (AI-03a).
// MVP: búsqueda léxica con filtros sobre un corpus pequeño y estructurado
// (sección 5.5 de docs/ARRANQUE.md). El índice solo contiene contenido
// público de las fichas: nunca texto de usuario ni datos del vault.
import type { Authority, Company, Procedure } from "@letra-grande/schema";
import { tokenize } from "./tokenize.js";

/** Parámetros BM25 clásicos: k1 controla la saturación de frecuencia y b la
 * normalización por longitud del documento. Son los valores habituales de la
 * bibliografía (Robertson, Sparck Jones) y funcionan bien en textos cortos. */
export const BM25_K1 = 1.2;
export const BM25_B = 0.75;

/**
 * Puntuación mínima para considerar una coincidencia real. Justificación:
 * un término presente en más o menos la mitad del corpus (o en su totalidad)
 * no discrimina, y su BM25 cae por debajo de este umbral, igual que una
 * consulta sin ninguna coincidencia (puntuación 0). Así una consulta sin
 * contenido relevante devuelve una lista vacía en lugar de "la ficha menos mala".
 */
export const DEFAULT_MIN_SCORE = 0.5;

/** Máximo de fragmentos que se devuelven al proxy por consulta. */
export const DEFAULT_LIMIT = 8;

/** Tipo de ficha indexada. */
export type FichaTipo = "empresa" | "organismo" | "tramite";

/** Documento atómico del índice: una ficha o una sección citable de una ficha. */
export interface IndexedDocument {
  /** Id de la fuente citable: el `sourceId` de la sección si cita uno, o el id de la ficha. */
  readonly sourceId: string;
  readonly titulo: string;
  readonly url: string;
  readonly texto: string;
  /** Sector de la ficha; cadena vacía si la ficha no declara uno (equivale a todos). */
  readonly sector: string;
  /** Región de la ficha; cadena vacía para fichas estatales o sin región (equivale a todas). */
  readonly region: string;
  readonly tipo: FichaTipo;
  readonly verified: boolean;
}

/** Fichas de entrada para construir el índice. */
export interface FichasInput {
  readonly companies: readonly Company[];
  readonly authorities: readonly Authority[];
  readonly procedures: readonly Procedure[];
}

/** Filtros de búsqueda. Un filtro sin valor no restringe. */
export interface SearchFilters {
  readonly sector?: string;
  readonly region?: string;
  readonly tipo?: string;
}

/** Opciones de búsqueda: umbral y límite ajustables para las pruebas. */
export interface SearchOptions {
  readonly minScore?: number;
  readonly limit?: number;
}

/** Documento recuperado con su puntuación BM25. */
export interface ScoredDocument extends IndexedDocument {
  readonly score: number;
}

/** Entrada interna: documento con su bolsa de términos precalculada. */
interface IndexedEntry {
  readonly doc: IndexedDocument;
  /** Frecuencia de cada término tokenizado del texto del documento. */
  readonly tf: ReadonlyMap<string, number>;
  readonly length: number;
}

/** Índice inmutable: buildIndex lo crea y search nunca lo muta. */
export interface SearchIndex {
  readonly documents: readonly IndexedDocument[];
  /** Estadísticas internas del corpus. */
  readonly entries: readonly IndexedEntry[];
  readonly avgLength: number;
  readonly df: ReadonlyMap<string, number>;
}

function compareIds(a: string, b: string): number {
  // Orden por unidades de código, sin colación dependiente del locale.
  return a < b ? -1 : a > b ? 1 : 0;
}

interface SectionInput {
  readonly sourceId: string;
  readonly titulo: string;
  readonly texto: string;
}

function sectionDocument(
  texto: SectionInput,
  base: { url: string; sector: string; region: string; tipo: FichaTipo; verified: boolean },
  fuentes: ReadonlyMap<string, string>,
): IndexedDocument | undefined {
  // El id de fuente citado debe existir en la ficha (lo garantiza el esquema)
  // y su fuente debe tener una URL resoluble; si no, el documento no entra.
  const url = fuentes.get(texto.sourceId);
  if (url === undefined || texto.texto.trim().length === 0) return undefined;
  return { ...base, url, sourceId: texto.sourceId, titulo: texto.titulo, texto: texto.texto };
}

function describeCanal(value: string, kind: string, notes: string | undefined): string {
  const base = `${kind}: ${value}`;
  return notes === undefined ? base : `${base} (${notes})`;
}

function companyDocuments(ficha: Company): IndexedDocument[] {
  const fuentes = new Map(ficha.sources.map((s) => [s.id, s.url] as const));
  const base = {
    url: ficha.sources[0]?.url ?? "",
    sector: ficha.sector,
    region: "",
    tipo: "empresa" as const,
    verified: ficha.verification.verified,
  };

  const docs: IndexedDocument[] = [];
  // Documento de la ficha: datos generales (notas de baja y permanencia si hay).
  const textoFicha = [ficha.name, ficha.bajaNotes ?? "", ficha.permanencia?.text ?? ""]
    .filter((parte) => parte.length > 0)
    .join(". ");
  if (base.url !== "" && textoFicha.trim().length > 0) {
    docs.push({
      sourceId: ficha.id,
      titulo: ficha.name,
      url: base.url,
      texto: textoFicha,
      sector: base.sector,
      region: base.region,
      tipo: base.tipo,
      verified: base.verified,
    });
  }

  const grupos: readonly (readonly ["atencionCliente" | "reclamacion" | "baja", string])[] = [
    ["atencionCliente", "atención al cliente"],
    ["reclamacion", "reclamación"],
    ["baja", "baja"],
  ];
  for (const [clave, etiqueta] of grupos) {
    const canales = ficha.channels[clave];
    if (canales.length === 0) continue;
    const seccion = sectionDocument(
      {
        sourceId: canales[0]?.sourceId ?? "",
        titulo: `${ficha.name}: ${etiqueta}`,
        texto: canales.map((c) => describeCanal(c.value, c.kind, c.notes)).join(". "),
      },
      base,
      fuentes,
    );
    if (seccion !== undefined) docs.push(seccion);
  }
  return docs;
}

function authorityDocuments(ficha: Authority): IndexedDocument[] {
  const base = {
    url: ficha.url,
    sector: ficha.sectors[0] ?? "",
    region: ficha.region ?? "",
    tipo: "organismo" as const,
    verified: ficha.verification.verified,
  };
  const fuentes = new Map<string, string>([[ficha.id, ficha.url]]);

  const docs: IndexedDocument[] = [];
  if (ficha.name.trim().length > 0) {
    docs.push({
      sourceId: ficha.id,
      titulo: ficha.name,
      url: ficha.url,
      texto: ficha.name,
      sector: base.sector,
      region: base.region,
      tipo: base.tipo,
      verified: base.verified,
    });
  }
  const seccion = sectionDocument(
    { sourceId: ficha.id, titulo: `${ficha.name}: reclamación`, texto: ficha.howToFile },
    base,
    fuentes,
  );
  if (seccion !== undefined) docs.push(seccion);
  return docs;
}

function procedureDocuments(ficha: Procedure): IndexedDocument[] {
  const fuentes = new Map(ficha.sources.map((s) => [s.id, s.url] as const));
  const base = {
    url: ficha.sources[0]?.url ?? "",
    sector: ficha.sector ?? "",
    region: ficha.region ?? "",
    tipo: "tramite" as const,
    verified: ficha.verification.verified,
  };

  const docs: IndexedDocument[] = [];
  if (base.url !== "" && ficha.summary.trim().length > 0) {
    docs.push({
      sourceId: ficha.id,
      titulo: ficha.title,
      url: base.url,
      texto: ficha.summary,
      sector: base.sector,
      region: base.region,
      tipo: base.tipo,
      verified: base.verified,
    });
  }

  const secciones: SectionInput[] = [];
  for (const paso of ficha.steps) {
    secciones.push({ sourceId: paso.sourceId, titulo: `${ficha.title}: paso ${paso.n}`, texto: paso.text });
  }
  for (const plazo of ficha.deadlines) {
    secciones.push({
      sourceId: plazo.sourceId,
      titulo: `${ficha.title}: plazo ${plazo.label}`,
      texto: `${plazo.label}: ${plazo.amount} ${plazo.unit.replace("_", " ")} desde ${plazo.from}`,
    });
  }
  for (const aviso of ficha.warnings) {
    secciones.push({ sourceId: aviso.sourceId, titulo: `${ficha.title}: aviso`, texto: aviso.text });
  }
  for (const seccion of secciones) {
    const doc = sectionDocument(seccion, base, fuentes);
    if (doc !== undefined) docs.push(doc);
  }
  return docs;
}

/**
 * Construye el índice: un documento por ficha y otro por sección citable
 * (cada paso, plazo, aviso y grupo de canales de contacto). Cada documento
 * lleva su `sourceId` (el de la fuente citada por la sección, o el id de la
 * ficha), su título de cita, su URL, su sector, su región, su tipo y si la
 * ficha está verificada. Solo entra el documento con texto y URL resoluble.
 */
export function buildIndex(fichas: FichasInput): SearchIndex {
  const documents: IndexedDocument[] = [
    ...fichas.companies.flatMap(companyDocuments),
    ...fichas.authorities.flatMap(authorityDocuments),
    ...fichas.procedures.flatMap(procedureDocuments),
  ];

  const entries: IndexedEntry[] = documents.map((doc) => {
    const tf = new Map<string, number>();
    for (const term of tokenize(`${doc.titulo} ${doc.texto}`)) {
      tf.set(term, (tf.get(term) ?? 0) + 1);
    }
    return { doc, tf, length: tf.size };
  });

  const df = new Map<string, number>();
  for (const entry of entries) {
    for (const term of entry.tf.keys()) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const avgLength =
    entries.length === 0 ? 0 : entries.reduce((suma, entry) => suma + entry.length, 0) / entries.length;

  return { documents, entries, avgLength, df };
}

function pasaFiltros(doc: IndexedDocument, filtros: SearchFilters): boolean {
  // Un documento sin sector o sin región (ficha estatal o nacional) encaja
  // con cualquier filtro de ese campo: no restringe de más.
  if (filtros.sector !== undefined && doc.sector !== filtros.sector && doc.sector !== "") return false;
  if (filtros.region !== undefined && doc.region !== filtros.region && doc.region !== "") return false;
  if (filtros.tipo !== undefined && doc.tipo !== filtros.tipo) return false;
  return true;
}

function idf(N: number, dfTerm: number): number {
  return Math.log(1 + (N - dfTerm + 0.5) / (dfTerm + 0.5));
}

/**
 * Búsqueda BM25 con filtros y umbral mínimo. Resultados ordenados por
 * puntuación descendente y, en empate, por `sourceId` ascendente (orden
 * estable y determinista, sin colación de locale). Nunca muta el índice.
 */
export function search(
  index: SearchIndex,
  query: string,
  filters: SearchFilters = {},
  options: SearchOptions = {},
): ScoredDocument[] {
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const limit = options.limit ?? DEFAULT_LIMIT;

  const terms = tokenize(query);
  if (terms.length === 0 || index.entries.length === 0) return [];

  const N = index.entries.length;
  const scores = new Map<number, number>();
  for (const term of new Set(terms)) {
    const dfTerm = index.df.get(term);
    if (dfTerm === undefined) continue;
    const peso = idf(N, dfTerm);
    for (let i = 0; i < index.entries.length; i += 1) {
      const entry = index.entries[i];
      if (entry === undefined) continue;
      const tf = entry.tf.get(term);
      if (tf === undefined) continue;
      const normalizada =
        (tf * (BM25_K1 + 1)) /
        (tf + BM25_K1 * (1 - BM25_B + BM25_B * (entry.length / index.avgLength || 1)));
      scores.set(i, (scores.get(i) ?? 0) + peso * normalizada);
    }
  }

  const resultados: ScoredDocument[] = [];
  for (const [i, score] of scores) {
    const entry = index.entries[i];
    if (entry === undefined) continue;
    if (score < minScore) continue;
    if (!pasaFiltros(entry.doc, filters)) continue;
    resultados.push({ ...entry.doc, score });
  }

  resultados.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return compareIds(a.sourceId, b.sourceId);
  });
  return resultados.slice(0, limit);
}

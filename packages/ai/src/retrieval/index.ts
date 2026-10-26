// Índice léxico BM25 sobre el contenido público (AI-03a).
// MVP: búsqueda léxica con filtros sobre un corpus pequeño y estructurado
// (sección 5.5 de docs/ARRANQUE.md). El índice solo contiene contenido
// público de las fichas: nunca texto de usuario ni datos del vault.
import type { Authority, Company, Procedure } from "@letra-grande/schema";
import { normalizeText, tokenize } from "./tokenize.js";

/** Parámetros BM25 clásicos: k1 controla la saturación de frecuencia y b la
 * normalización por longitud del documento. Son los valores habituales de la
 * bibliografía (Robertson, Sparck Jones) y funcionan bien en textos cortos. */
export const BM25_K1 = 1.2;
export const BM25_B = 0.75;

/**
 * Umbral de puntuación: solo descarta puntuaciones residuales, como la de una
 * consulta cuyo único término está presente en todo el corpus (su idf cae por
 * debajo de este valor) o coincidencias casuales muy débiles. La decisión de
 * relevancia no es suya: la toman el término más raro y la cobertura.
 */
export const DEFAULT_MIN_SCORE = 0.5;

/** Máximo de fragmentos que se devuelven al proxy por consulta. */
export const DEFAULT_LIMIT = 8;

/**
 * Cobertura mínima de términos de la consulta que debe contener el documento:
 * al menos la mitad. Exige que el documento respalde la mayor parte del
 * sentido de la pregunta, no una sola palabra coincidental.
 */
export const MIN_COVERAGE = 0.5;

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
  /** Longitud real del documento: suma de frecuencias, no términos únicos. */
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

/**
 * Quita URLs y direcciones de correo del texto que se indexa: generan tokens
 * basura ("ejemplo", "com") que hacen coincidir consultas sin relación. El
 * valor sin quitar se sigue mostrando al usuario en los campos de la ficha.
 */
export function quitarEnlaces(texto: string): string {
  return texto
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/www\.\S+/gi, " ")
    .replace(/\S+@\S+\.\S+/gi, " ");
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

/** Texto de un canal de contacto, sin la URL o el correo (van aparte, en `url`). */
function describeCanal(value: string, kind: string, notes: string | undefined): string {
  const base = `${kind}: ${quitarEnlaces(value)}`;
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

  // Un documento por canal concreto, no por grupo: así la cita apunta a la
  // fuente del canal exacto sobre el que pregunta la persona.
  const grupos: readonly (readonly ["atencionCliente" | "reclamacion" | "baja", string])[] = [
    ["atencionCliente", "atención al cliente"],
    ["reclamacion", "reclamación"],
    ["baja", "baja"],
  ];
  for (const [clave, etiqueta] of grupos) {
    for (const canal of ficha.channels[clave]) {
      const seccion = sectionDocument(
        {
          sourceId: canal.sourceId,
          titulo: `${ficha.name}: ${etiqueta}`,
          texto: describeCanal(canal.value, canal.kind, canal.notes),
        },
        base,
        fuentes,
      );
      if (seccion !== undefined) docs.push(seccion);
    }
  }
  return docs;
}

function authorityDocuments(ficha: Authority): IndexedDocument[] {
  const fuentes = new Map<string, string>([[ficha.id, ficha.url]]);

  const docs: IndexedDocument[] = [];
  // La ficha declara varios sectores: se indexa un juego de documentos por
  // sector para que el filtro por sector la encuentre en todos ellos.
  // search deduplica los resultados idénticos que esto produce.
  const sectores = ficha.sectors.length > 0 ? ficha.sectors : ([""] as const);
  for (const sector of sectores) {
    const base = {
      url: ficha.url,
      sector,
      region: ficha.region ?? "",
      tipo: "organismo" as const,
      verified: ficha.verification.verified,
    };
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
  }
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
 * Construye el índice a partir de documentos ya recortados. Es la pieza
 * común de buildIndex y de las pruebas: search nunca muta lo que devuelve.
 */
export function buildIndexFromDocuments(documents: readonly IndexedDocument[]): SearchIndex {
  const entries: IndexedEntry[] = documents.map((doc) => {
    const tf = new Map<string, number>();
    for (const term of tokenize(quitarEnlaces(`${doc.titulo} ${doc.texto}`))) {
      tf.set(term, (tf.get(term) ?? 0) + 1);
    }
    // Longitud real: suma de frecuencias de términos, no número de únicos.
    let length = 0;
    for (const frecuencia of tf.values()) length += frecuencia;
    return { doc, tf, length };
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

/**
 * Construye el índice: un documento por ficha y otro por sección citable
 * (cada paso, plazo y aviso de los trámites, cada canal de contacto de las
 * empresas, y la forma de reclamar de los organismos). Cada documento lleva
 * su `sourceId` (el de la fuente citada por la sección, o el id de la ficha),
 * su título de cita, su URL, su sector, su región, su tipo y si la ficha está
 * verificada. Solo entra el documento con texto y URL resoluble.
 */
export function buildIndex(fichas: FichasInput): SearchIndex {
  const documents: IndexedDocument[] = [
    ...fichas.companies.flatMap(companyDocuments),
    ...fichas.authorities.flatMap(authorityDocuments),
    ...fichas.procedures.flatMap(procedureDocuments),
  ];
  return buildIndexFromDocuments(documents);
}

function pasaFiltros(doc: IndexedDocument, filtros: SearchFilters): boolean {
  // Comparación sin acentos ni mayúsculas: "Cataluña" y "cataluna" equivalen.
  // Un documento sin sector o sin región (ficha estatal o nacional) encaja
  // con cualquier filtro de ese campo: no restringe de más.
  if (
    filtros.sector !== undefined &&
    normalizeText(doc.sector) !== normalizeText(filtros.sector) &&
    doc.sector !== ""
  ) {
    return false;
  }
  if (
    filtros.region !== undefined &&
    normalizeText(doc.region) !== normalizeText(filtros.region) &&
    doc.region !== ""
  ) {
    return false;
  }
  if (filtros.tipo !== undefined && normalizeText(doc.tipo) !== normalizeText(filtros.tipo)) return false;
  return true;
}

function idf(N: number, dfTerm: number): number {
  return Math.log(1 + (N - dfTerm + 0.5) / (dfTerm + 0.5));
}

/**
 * Búsqueda BM25 con una puerta de evidencia, filtros y umbral:
 *
 * 1. Se tokeniza la consulta y se sueltan los términos sin frecuencia en el
 *    corpus (df cero: no pueden aportar nada).
 * 2. Término más raro: el de menor df (empate: el que antes aparece en la
 *    consulta). El documento debe contenerlo. Es la regla que evita que un
 *    documento de otro tema gane solo por repetir palabras comunes.
 * 3. Cobertura: el documento contiene al menos la mitad (MIN_COVERAGE) de los
 *    términos de la consulta con df mayor que cero.
 * 4. Umbral de puntuación (DEFAULT_MIN_SCORE): solo descarta puntuaciones
 *    residuales, ya no decide la relevancia por sí solo.
 *
 * Resultados ordenados por puntuación descendente y, en empate, por
 * `sourceId` ascendente (orden estable y determinista, sin colación de
 * locale). Si la consulta no comparte con el corpus más que palabras comunes
 * a todos los documentos, el umbral la deja en vacío. Nunca muta el índice.
 */
export function search(
  index: SearchIndex,
  query: string,
  filters: SearchFilters = {},
  options: SearchOptions = {},
): ScoredDocument[] {
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const limit = options.limit ?? DEFAULT_LIMIT;

  // Términos únicos de la consulta en orden de primera aparición.
  const vistos = new Set<string>();
  const terminosUnicos: string[] = [];
  for (const term of tokenize(query)) {
    if (!vistos.has(term)) {
      vistos.add(term);
      terminosUnicos.push(term);
    }
  }
  const conDf = terminosUnicos.filter((t) => index.df.has(t));
  // Ningún término de la consulta existe en el corpus: no hay nada que buscar.
  if (conDf.length === 0 || index.entries.length === 0) return [];

  // Término más raro: menor df; empate, el que antes aparece en la consulta.
  let masRaro = conDf[0] as string;
  let dfMasRaro = index.df.get(masRaro) as number;
  for (const term of conDf) {
    const dfTerm = index.df.get(term) as number;
    if (dfTerm < dfMasRaro) {
      masRaro = term;
      dfMasRaro = dfTerm;
    }
  }

  const N = index.entries.length;
  const resultados: ScoredDocument[] = [];
  for (let i = 0; i < index.entries.length; i += 1) {
    const entry = index.entries[i];
    if (entry === undefined) continue;
    if (!entry.tf.has(masRaro)) continue;

    let presentes = 0;
    for (const term of conDf) {
      if (entry.tf.has(term)) presentes += 1;
    }
    if (presentes < MIN_COVERAGE * conDf.length) continue;

    let score = 0;
    for (const term of conDf) {
      const tf = entry.tf.get(term);
      if (tf === undefined) continue;
      const peso = idf(N, index.df.get(term) as number);
      const normalizada =
        (tf * (BM25_K1 + 1)) /
        (tf + BM25_K1 * (1 - BM25_B + BM25_B * (entry.length / index.avgLength || 1)));
      score += peso * normalizada;
    }
    if (score < minScore) continue;
    if (!pasaFiltros(entry.doc, filters)) continue;
    resultados.push({ ...entry.doc, score });
  }

  resultados.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return compareIds(a.sourceId, b.sourceId);
  });

  // Las fichas multissector producen documentos idénticos salvo el sector:
  // una misma sección no debe aparecer dos veces en la respuesta.
  const claves = new Set<string>();
  const unicos: ScoredDocument[] = [];
  for (const resultado of resultados) {
    const clave = `${resultado.sourceId} ${resultado.titulo}`;
    if (claves.has(clave)) continue;
    claves.add(clave);
    unicos.push(resultado);
  }
  return unicos.slice(0, limit);
}

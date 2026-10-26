// Adaptador de recuperación para el proxy (AI-03a): implementa el contrato
// `retrieveSources` del asistente buscando con la pregunta del usuario sobre
// el índice de content/. Nunca acepta texto del usuario como documento: solo
// se buscan términos, el índice contiene contenido público verificado o por
// verificar de las fichas.
import { findContentRoot, loadContentIndex } from "./loader.js";
import { search, type SearchFilters } from "./index.js";

/** Fragmento recuperado, con la forma que espera el proxy. */
export interface RetrievedSourceData {
  readonly id: string;
  readonly titulo: string;
  readonly url: string;
  readonly texto: string;
}

/** Recuperador de fuentes: busca fragmentos para la pregunta. */
export type ContentRetriever = (question: string) => Promise<RetrievedSourceData[]>;

/** Marcador visible en el título de toda fuente de una ficha sin verificar. */
export const SIN_VERIFICAR = " (sin verificar)";

export interface ContentRetrieverOptions {
  /** Raíz de contenido (carpeta `content/`). Por defecto se localiza subiendo desde el cwd. */
  readonly contentRoot?: string;
}

/**
 * Crea un recuperador sobre content/. Carga e indexa el contenido una sola
 * vez por raíz (caché del cargador) y, para cada pregunta, devuelve los
 * fragmentos con mejor puntuación BM25 en `{ id, titulo, url, texto }`.
 * Las fuentes de fichas con `verified: false` se marcan en el título para
 * que la respuesta pueda avisar de que no están verificadas. Si no se
 * encuentra la carpeta de contenido, responde sin fuentes: el asistente
 * degrada a outOfScope, como prevé el proxy.
 */
export function createContentRetriever(options: ContentRetrieverOptions = {}): ContentRetriever {
  let raizResuelta: string | undefined = options.contentRoot;

  return async (question: string): Promise<RetrievedSourceData[]> => {
    if (raizResuelta === undefined) {
      // Se resuelve en la primera búsqueda para que el cwd ya sea el del servidor.
      raizResuelta = findContentRoot();
    }
    if (raizResuelta === undefined) return [];

    const { index } = loadContentIndex(raizResuelta);
    // La pregunta no lleva filtros: el proxy no conoce el sector de antemano.
    const filtros: SearchFilters = {};
    return search(index, question, filtros).map((doc) => ({
      id: doc.sourceId,
      titulo: doc.verified ? doc.titulo : `${doc.titulo}${SIN_VERIFICAR}`,
      url: doc.url,
      texto: doc.texto,
    }));
  };
}

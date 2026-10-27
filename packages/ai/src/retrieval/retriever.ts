// Adaptador de recuperación para el proxy (AI-03a): implementa el contrato
// `retrieveSources` del asistente buscando con la pregunta del usuario sobre
// el índice de content/. Nunca acepta texto del usuario como documento: solo
// se buscan términos, el índice contiene contenido público verificado o por
// verificar de las fichas.
import { findContentRoot, loadContentIndex, type LoadedContentIndex } from "./loader.js";
import { search, type SearchFilters } from "./index.js";

/** Fragmento recuperado, con la forma que espera el proxy. */
export interface RetrievedSourceData {
  readonly id: string;
  readonly titulo: string;
  readonly url: string;
  readonly texto: string;
  /** Si la ficha de origen está verificada: la respuesta lo traslada a la interfaz. */
  readonly verified: boolean;
  /** Fecha de verificación en AAAA-MM-DD; ausente si la ficha no está verificada. */
  readonly verifiedAt?: string;
}

/** Contadores de diagnóstico del recuperador: solo cifras, nunca contenido. */
export interface RetrievalDiagnostics {
  /** Ficheros .yaml leídos e intentados validar. */
  readonly filesRead: number;
  /** Ficheros .yaml saltados por YAML roto o validación fallida. */
  readonly filesSkipped: number;
  /** Documentos indexados (fichas y secciones citables). */
  readonly documents: number;
}

/**
 * Recuperador de fuentes: busca fragmentos para la pregunta y expone
 * contadores de diagnóstico para saber si el índice está vacío o incompleto.
 */
export type ContentRetriever = ((question: string) => Promise<RetrievedSourceData[]>) & {
  readonly diagnostics: () => RetrievalDiagnostics;
};

export interface ContentRetrieverOptions {
  /** Raíz de contenido (carpeta `content/`). Por defecto se localiza subiendo desde el cwd. */
  readonly contentRoot?: string;
}

/**
 * Crea un recuperador sobre content/. Carga e indexa el contenido una sola
 * vez por raíz (caché del cargador) y, para cada pregunta, devuelve los
 * fragmentos con mejor puntuación en `{ id, titulo, url, texto, verified,
 * verifiedAt }`. Si la ficha de origen no está verificada, `verified: false`
 * viaja hasta la respuesta para que la interfaz pueda avisar y no hay fecha:
 * el guardarraíl de caducidad (AI-05) la cuenta como caducada. Si no se
 * encuentra la carpeta de contenido, responde sin fuentes: el asistente
 * degrada a outOfScope, como prevé el proxy.
 */
export function createContentRetriever(options: ContentRetrieverOptions = {}): ContentRetriever {
  let raizResuelta: string | undefined = options.contentRoot;

  const cargar = (): LoadedContentIndex | undefined => {
    if (raizResuelta === undefined) {
      // Se resuelve en el primer uso para que el cwd ya sea el del servidor.
      raizResuelta = findContentRoot();
    }
    if (raizResuelta === undefined) return undefined;
    return loadContentIndex(raizResuelta);
  };

  const buscar = async (question: string): Promise<RetrievedSourceData[]> => {
    const cargado = cargar();
    if (cargado === undefined) return [];
    // La pregunta no lleva filtros: el proxy no conoce el sector de antemano.
    const filtros: SearchFilters = {};
    // Sin ficha verificada no hay fecha: el campo se omite del todo, no va a
    // undefined, para que la forma del objeto sea exactamente la esperada.
    return search(cargado.index, question, filtros).map((doc) =>
      doc.verifiedAt === undefined
        ? { id: doc.sourceId, titulo: doc.titulo, url: doc.url, texto: doc.texto, verified: doc.verified }
        : {
            id: doc.sourceId,
            titulo: doc.titulo,
            url: doc.url,
            texto: doc.texto,
            verified: doc.verified,
            verifiedAt: doc.verifiedAt,
          },
    );
  };

  const diagnostics = (): RetrievalDiagnostics => {
    const cargado = cargar();
    if (cargado === undefined) return { filesRead: 0, filesSkipped: 0, documents: 0 };
    return {
      filesRead: cargado.filesRead,
      filesSkipped: cargado.skippedFiles,
      documents: cargado.index.documents.length,
    };
  };

  return Object.assign(buscar, { diagnostics });
}

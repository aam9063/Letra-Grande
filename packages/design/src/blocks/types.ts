/**
 * Tipos de bloque usados por los componentes de diseño.
 * El contrato es `@letra-grande/schema` (sección 8.5 de docs/ARRANQUE.md):
 * aquí solo se reexportan y se añaden alias por `kind` y el catálogo
 * de fuentes conocidas para las citas enlazadas.
 */

import type { Block } from "@letra-grande/schema";

export type { Block, Citation } from "@letra-grande/schema";

export type BlockData = Block;
export type StepBlockData = Extract<Block, { kind: "step" }>;
export type DocumentBlockData = Extract<Block, { kind: "document" }>;
export type CostBlockData = Extract<Block, { kind: "cost" }>;
export type DeadlineBlockData = Extract<Block, { kind: "deadline" }>;
export type WarningBlockData = Extract<Block, { kind: "warning" }>;
export type FactBlockData = Extract<Block, { kind: "fact" }>;

/** Información humana de una fuente conocida, para citar con enlace. */
export interface FuenteInfo {
  /** Título legible de la fuente. */
  titulo: string;
  /** URL oficial de la fuente. */
  url: string;
}

/** Catálogo de fuentes conocidas por `sourceId`, opcional en el render. */
export type Fuentes = Record<string, FuenteInfo>;

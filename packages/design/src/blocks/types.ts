/**
 * Espejo local del contrato de bloques de respuesta (sección 8.5 de docs/ARRANQUE.md).
 * packages/schema es el contrato común: cuando CORE-01 publique los tipos,
 * este archivo pasa a reexportarlos desde @letra-grande/schema. La forma y
 * las reglas (cita obligatoria, máximo un warning, pasos 1, 2, 3) no cambian.
 */

export interface Citation {
  /** Id de una fuente de las fichas recuperadas para esta respuesta. */
  sourceId: string;
  /** Fragmento literal de la fuente que respalda la afirmación. */
  quote?: string;
}

export interface BlockBase {
  /** Afirmación del bloque, en texto plano. Nunca HTML ni markdown. */
  claim: string;
  /** Al menos una cita: toda afirmación necesita fuente. */
  citations: Citation[];
}

export interface StepBlockData extends BlockBase {
  kind: "step";
  /** Número del paso: 1, 2, 3 sin saltos. */
  n: number;
}

export interface DocumentBlockData extends BlockBase {
  kind: "document";
}

export interface CostBlockData extends BlockBase {
  kind: "cost";
}

export interface DeadlineBlockData extends BlockBase {
  kind: "deadline";
  /** Id de un plazo de la ficha, para enlazar con el radar. */
  deadlineId?: string;
}

export interface WarningBlockData extends BlockBase {
  kind: "warning";
}

export interface FactBlockData extends BlockBase {
  kind: "fact";
}

/** Catálogo cerrado de bloques (sección 5.6). */
export type BlockData =
  | StepBlockData
  | DocumentBlockData
  | CostBlockData
  | DeadlineBlockData
  | WarningBlockData
  | FactBlockData;

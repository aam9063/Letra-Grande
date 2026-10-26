/**
 * Paquete de diseño de Letra Grande (UI-01).
 * Tokens, Callout, bloques de respuesta y galería local.
 * Contrato para UI-02 (shell) y AI-02 (renderizador de bloques).
 */

export { tokens, tonos, luminancia, contraste } from "./tokens";
export type { ParTono } from "./tokens";
export { Callout } from "./Callout";
export type { CalloutTone, CalloutProps } from "./Callout";
export { BlockRenderer } from "./blocks/BlockRenderer";
export { Citas } from "./blocks/Citas";
export { StepBlock } from "./blocks/StepBlock";
export { DocumentBlock } from "./blocks/DocumentBlock";
export { CostBlock } from "./blocks/CostBlock";
export { DeadlineBlock } from "./blocks/DeadlineBlock";
export { WarningBlock } from "./blocks/WarningBlock";
export { FactBlock } from "./blocks/FactBlock";
export type {
  BlockData,
  Citation,
  StepBlockData,
  DocumentBlockData,
  CostBlockData,
  DeadlineBlockData,
  WarningBlockData,
  FactBlockData,
  FuenteInfo,
  Fuentes,
} from "./blocks/types";
export { Gallery } from "./gallery/Gallery";
export { buildGalleryHtml } from "./gallery/generate";

/**
 * Entrada cliente de @letra-grande/design.
 *
 * Solo lo que el navegador puede usar: tokens, Callout, los bloques de
 * respuesta y su renderizador. El barrel completo (index.ts) expone también el
 * generador de la galería (react-dom/server, node:fs) y no es importable desde
 * la app de Next: usa "@letra-grande/design/client" en código de navegador.
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

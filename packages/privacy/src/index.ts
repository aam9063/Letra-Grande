// Punto de entrada del paquete privacy. Contrato de la sección 9 de docs/ARRANQUE.md.
export { detect } from "./detect.js";
export { isSafeToSend, mask, unmask } from "./mask.js";
export type { Detection, KnownTerm, MaskOptions, PiiKind } from "./types.js";

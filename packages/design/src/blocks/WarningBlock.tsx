import { Citas } from "./Citas";
import type { WarningBlockData } from "./types";

/**
 * Bloque `warning`: aviso. La respuesta lleva como máximo uno
 * (lo garantiza el esquema); aquí se pinta con su cita visible.
 */
export function WarningBlock({ block }: { block: WarningBlockData }) {
  return (
    <article className="lg-bloque lg-bloque-warning">
      <p className="lg-bloque-kind">Aviso</p>
      <p className="lg-claim">{block.claim}</p>
      <Citas citations={block.citations} />
    </article>
  );
}

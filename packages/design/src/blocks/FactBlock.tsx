import { Citas } from "./Citas";
import type { FactBlockData, Fuentes } from "./types";

/** Bloque `fact`: dato o explicación. */
export function FactBlock({ block, fuentes }: { block: FactBlockData; fuentes?: Fuentes }) {
  return (
    <article className="lg-bloque lg-bloque-fact">
      <p className="lg-bloque-kind">Dato</p>
      <p className="lg-claim">{block.claim}</p>
      <Citas citations={block.citations} fuentes={fuentes} />
    </article>
  );
}

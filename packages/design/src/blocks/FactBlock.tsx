import { Citas } from "./Citas";
import type { FactBlockData } from "./types";

/** Bloque `fact`: dato o explicación. */
export function FactBlock({ block }: { block: FactBlockData }) {
  return (
    <article className="lg-bloque lg-bloque-fact">
      <p className="lg-bloque-kind">Dato</p>
      <p className="lg-claim">{block.claim}</p>
      <Citas citations={block.citations} />
    </article>
  );
}

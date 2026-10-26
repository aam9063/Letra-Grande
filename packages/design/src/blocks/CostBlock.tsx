import { Citas } from "./Citas";
import type { CostBlockData } from "./types";

/** Bloque `cost`: coste de un trámite. */
export function CostBlock({ block }: { block: CostBlockData }) {
  return (
    <article className="lg-bloque lg-bloque-cost">
      <p className="lg-bloque-kind">Coste</p>
      <p className="lg-claim">{block.claim}</p>
      <Citas citations={block.citations} />
    </article>
  );
}

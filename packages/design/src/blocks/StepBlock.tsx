import { Citas } from "./Citas";
import type { Fuentes, StepBlockData } from "./types";

/** Bloque `step`: paso numerado. La numeración 1, 2, 3 es visible. */
export function StepBlock({ block, fuentes }: { block: StepBlockData; fuentes?: Fuentes }) {
  return (
    <article className="lg-bloque lg-bloque-step">
      <p className="lg-bloque-kind">Paso {block.n}</p>
      <p className="lg-claim">{block.claim}</p>
      <Citas citations={block.citations} fuentes={fuentes} />
    </article>
  );
}

import { Citas } from "./Citas";
import type { StepBlockData } from "./types";

/** Bloque `step`: paso numerado. La numeración 1, 2, 3 es visible. */
export function StepBlock({ block }: { block: StepBlockData }) {
  return (
    <article className="lg-bloque lg-bloque-step">
      <div className="lg-bloque-cabecera">
        <span className="lg-step-num">{block.n}</span>
        <p className="lg-bloque-kind">Paso</p>
      </div>
      <p className="lg-claim">{block.claim}</p>
      <Citas citations={block.citations} />
    </article>
  );
}

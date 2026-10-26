import { Citas } from "./Citas";
import type { DeadlineBlockData } from "./types";

/** Bloque `deadline`: plazo, enlazable con el radar mediante `deadlineId`. */
export function DeadlineBlock({ block }: { block: DeadlineBlockData }) {
  return (
    <article className="lg-bloque lg-bloque-deadline">
      <p className="lg-bloque-kind">Plazo</p>
      <p className="lg-claim">{block.claim}</p>
      {block.deadlineId ? <p className="lg-deadline-id">Plazo asociado: {block.deadlineId}</p> : null}
      <Citas citations={block.citations} />
    </article>
  );
}

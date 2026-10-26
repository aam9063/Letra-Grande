import { Citas } from "./Citas";
import type { DocumentBlockData } from "./types";

/** Bloque `document`: documentación necesaria. */
export function DocumentBlock({ block }: { block: DocumentBlockData }) {
  return (
    <article className="lg-bloque lg-bloque-document">
      <p className="lg-bloque-kind">Documento</p>
      <p className="lg-claim">{block.claim}</p>
      <Citas citations={block.citations} />
    </article>
  );
}

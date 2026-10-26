import { Citas } from "./Citas";
import type { DocumentBlockData, Fuentes } from "./types";

/** Bloque `document`: documentación necesaria. */
export function DocumentBlock({ block, fuentes }: { block: DocumentBlockData; fuentes?: Fuentes }) {
  return (
    <article className="lg-bloque lg-bloque-document">
      <p className="lg-bloque-kind">Documento</p>
      <p className="lg-claim">{block.claim}</p>
      <Citas citations={block.citations} fuentes={fuentes} />
    </article>
  );
}

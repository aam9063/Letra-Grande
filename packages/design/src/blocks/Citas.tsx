import type { Citation } from "./types";
import type { Fuentes } from "./types";

/**
 * Cita visible de un bloque: nombra la fuente con texto (nunca solo un icono).
 * Si la fuente está en el catálogo, se enlaza con su título humano;
 * si no, se mantiene el `sourceId` como texto visible.
 */
export function Citas({ citations, fuentes }: { citations: Citation[]; fuentes?: Fuentes }) {
  return (
    <footer className="lg-citas">
      {citations.map((cita, i) => {
        const fuente = fuentes?.[cita.sourceId];
        return (
          <p key={`${cita.sourceId}-${i}`} className="lg-cita">
            {"Fuente: "}
            {fuente ? <a href={fuente.url}>{fuente.titulo}</a> : <cite>{cita.sourceId}</cite>}
            {cita.quote ? <span>{`, "${cita.quote}"`}</span> : null}
          </p>
        );
      })}
    </footer>
  );
}

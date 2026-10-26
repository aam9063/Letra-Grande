import type { Citation } from "./types";

/**
 * Cita visible de un bloque: nombra la fuente con texto (nunca solo un icono)
 * y muestra el fragmento literal cuando lo hay.
 */
export function Citas({ citations }: { citations: Citation[] }) {
  return (
    <footer className="lg-citas">
      {citations.map((cita, i) => (
        <p key={`${cita.sourceId}-${i}`} className="lg-cita">
          {"Fuente: "}
          <cite>{cita.sourceId}</cite>
          {cita.quote ? <span>{`, "${cita.quote}"`}</span> : null}
        </p>
      ))}
    </footer>
  );
}

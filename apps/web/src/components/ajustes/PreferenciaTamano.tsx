"use client";

import { useEffect, useId, useState } from "react";
import {
  type TamanoLetra,
  aplicarTamanoLetra,
  guardarTamanoLetra,
  verTamanoLetra,
} from "./tamano-letra";

const OPCIONES: { valor: TamanoLetra; nombre: string; ayuda: string }[] = [
  { valor: "normal", nombre: "Normal", ayuda: "100 %" },
  { valor: "grande", nombre: "Grande", ayuda: "112,5 %" },
  { valor: "muy-grande", nombre: "Muy grande", ayuda: "125 %" },
];

/**
 * Chips de tamaño de letra (UI-06, S1 y S3): radios nativos con estilo de
 * chip del sistema de diseño. Elegir una opción la aplica a toda la app y la
 * guarda en localStorage.
 */
export function PreferenciaTamano() {
  // Estado inicial en el servidor: Normal. La preferencia guardada se lee en
  // el cliente tras montar, así la hidratación coincide con el HTML servido;
  // el font-size real ya lo aplica el script del layout antes del primer
  // pintado, sin saltos.
  const [tamano, setTamano] = useState<TamanoLetra>("normal");
  const idGrupo = useId();

  useEffect(() => {
    setTamano(verTamanoLetra());
  }, []);

  function elegir(valor: TamanoLetra): void {
    setTamano(valor);
    guardarTamanoLetra(valor);
    aplicarTamanoLetra(valor);
  }

  return (
    <fieldset className="lg-ajustes-campo" aria-labelledby={idGrupo}>
      <legend id={idGrupo} className="lg-ajustes-leyenda">
        Tamaño de letra
      </legend>
      <div className="lg-chip-grupo">
        {OPCIONES.map((opcion) => (
          <label key={opcion.valor} className="lg-chip">
            <input
              type="radio"
              name="lg-tamano-letra"
              value={opcion.valor}
              checked={tamano === opcion.valor}
              onChange={() => elegir(opcion.valor)}
            />
            <span className="lg-chip-etiqueta">
              <span className="lg-chip-nombre">{opcion.nombre}</span> <small className="lg-chip-ayuda">({opcion.ayuda})</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

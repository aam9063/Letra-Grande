"use client";

import { useState } from "react";
import { Callout } from "@letra-grande/design/client";
import { WrongPasswordError } from "@letra-grande/vault";
import { sesionCarpeta } from "./sesion";

const GARANTIAS = [
  "Se guarda cifrada, solo en este dispositivo",
  "Tus documentos no se suben a ningún servidor",
  "Funciona también sin conexión",
];

type Estado = "reposo" | "creando";

/**
 * Pantalla «Crea tu carpeta privada» (UI-07, S1): texto y estructura del PDF
 * de diseño. La casilla de recuperación es obligatoria y las dos contraseñas
 * deben coincidir. Con la sesión creada, el estado de la sesión compartida
 * cambia a abierta y la vista conmuta sola.
 */
export function CrearCarpeta({ alDesbloquear }: { alDesbloquear?: () => void }) {
  const [clave, setClave] = useState("");
  const [repetir, setRepetir] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [entendido, setEntendido] = useState(false);
  const [estado, setEstado] = useState<Estado>("reposo");
  const [error, setError] = useState<string | null>(null);

  const ocupado = estado === "creando";
  const puedeEnviar = entendido && clave.length > 0 && repetir.length > 0 && !ocupado;

  async function enviar(): Promise<void> {
    if (!puedeEnviar) {
      return;
    }
    if (clave !== repetir) {
      setError("Las contraseñas no coinciden. Revísalas y vuelve a escribirlas.");
      return;
    }
    setEstado("creando");
    setError(null);
    try {
      await sesionCarpeta.crear(clave);
      setClave("");
      setRepetir("");
      setEntendido(false);
    } catch (fallo) {
      setError(
        fallo instanceof WrongPasswordError
          ? fallo.message
          : "No se ha podido crear la carpeta. Inténtalo de nuevo.",
      );
    } finally {
      setEstado("reposo");
    }
  }

  return (
    <section className="lg-carpeta-panel" aria-label="Crear tu carpeta privada">
      <h2>Crea tu carpeta privada</h2>
      <p>Aquí guardarás tus facturas, contratos y cartas. Solo tú podrás abrirla.</p>
      <ul className="lg-carpeta-garantias">
        {GARANTIAS.map((garantia) => (
          <li key={garantia}>{garantia}</li>
        ))}
      </ul>

      <Callout tone="aviso" title="Importante">
        <p>Si olvidas la contraseña, no podemos recuperar tu carpeta. Apúntala en un lugar seguro.</p>
      </Callout>

      <form
        className="lg-carpeta-formulario"
        onSubmit={(evento) => {
          evento.preventDefault();
          void enviar();
        }}
      >
        <div className="lg-carpeta-campo">
          <label htmlFor="lg-carpeta-clave">Contraseña</label>
          <div className="lg-carpeta-fila-clave">
            <input
              id="lg-carpeta-clave"
              className="lg-carpeta-clave"
              type={mostrar ? "text" : "password"}
              autoComplete="new-password"
              value={clave}
              onChange={(evento) => setClave(evento.target.value)}
            />
            <button
              type="button"
              className="lg-secundario"
              aria-pressed={mostrar}
              onClick={() => setMostrar(!mostrar)}
            >
              {mostrar ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <p className="lg-carpeta-pista">Buena. Una frase larga es más segura que una palabra rara.</p>
        </div>

        <div className="lg-carpeta-campo">
          <label htmlFor="lg-carpeta-repetir">Repite la contraseña</label>
          <input
            id="lg-carpeta-repetir"
            className="lg-carpeta-clave"
            type={mostrar ? "text" : "password"}
            autoComplete="new-password"
            value={repetir}
            onChange={(evento) => setRepetir(evento.target.value)}
          />
        </div>

        {/* Contenedor persistente: si se monta solo con el error, algunos
            lectores de pantalla no lo anuncian. */}
        <p className="lg-carpeta-error" aria-live="assertive">
          {error}
        </p>

        <label className="lg-carpeta-entendido">
          <input
            type="checkbox"
            checked={entendido}
            onChange={(evento) => setEntendido(evento.target.checked)}
          />
          Entiendo que no se puede recuperar
        </label>

        <div className="lg-carpeta-botones">
          <button type="submit" className="lg-primario" disabled={!puedeEnviar}>
            {ocupado ? "Creando..." : "Crear carpeta"}
          </button>
        </div>
      </form>

      {alDesbloquear ? (
        <button type="button" className="lg-carpeta-enlace" onClick={alDesbloquear}>
          Ya tengo una carpeta: desbloquear
        </button>
      ) : null}
    </section>
  );
}

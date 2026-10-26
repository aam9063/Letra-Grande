"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WrongPasswordError } from "@letra-grande/vault";
import { sesionCarpeta } from "./sesion";

type Estado = "reposo" | "abriendo";

/**
 * Pantalla de desbloqueo (UI-07, S2): abre el vault existente con la
 * contraseña. Un error de contraseña se muestra tal cual y no se toca ningún
 * dato. Si no hay carpeta en este dispositivo, no se intenta abrir nada: se
 * lo decimos y enlazamos a la creación.
 */
export function DesbloquearCarpeta({
  alCrear,
  destino,
}: {
  alCrear?: () => void;
  /** Ruta interna a la que entrar tras desbloquear (S2). */
  destino?: string;
}) {
  const router = useRouter();
  const [clave, setClave] = useState("");
  const [estado, setEstado] = useState<Estado>("reposo");
  const [error, setError] = useState<string | null>(null);

  const ocupado = estado === "abriendo";
  const puedeEnviar = clave.length > 0 && !ocupado;

  async function enviar(): Promise<void> {
    if (!puedeEnviar) {
      return;
    }
    if (sesionCarpeta.consultar() === "no-creada") {
      setError("Todavía no hay ninguna carpeta en este dispositivo. Crea tu carpeta primero.");
      return;
    }
    setEstado("abriendo");
    setError(null);
    try {
      await sesionCarpeta.desbloquear(clave);
      setClave("");
      if (destino !== undefined) {
        router.replace(destino);
      }
    } catch (fallo) {
      setError(
        fallo instanceof WrongPasswordError
          ? fallo.message
          : "No se ha podido abrir la carpeta. Inténtalo de nuevo.",
      );
    } finally {
      setEstado("reposo");
    }
  }

  return (
    <section className="lg-carpeta-panel" aria-label="Desbloquear tu carpeta">
      <h2>Desbloquea tu carpeta</h2>
      <p>Escribe tu contraseña para abrir la carpeta de este dispositivo.</p>

      <form
        className="lg-carpeta-formulario"
        onSubmit={(evento) => {
          evento.preventDefault();
          void enviar();
        }}
      >
        <div className="lg-carpeta-campo">
          <label htmlFor="lg-carpeta-desbloqueo">Contraseña</label>
          <input
            id="lg-carpeta-desbloqueo"
            className="lg-carpeta-clave"
            type="password"
            autoComplete="current-password"
            value={clave}
            onChange={(evento) => setClave(evento.target.value)}
          />
        </div>

        <p className="lg-carpeta-error" aria-live="assertive">
          {error}
        </p>

        <div className="lg-carpeta-botones">
          <button type="submit" className="lg-primario" disabled={!puedeEnviar}>
            {ocupado ? "Abriendo..." : "Desbloquear"}
          </button>
        </div>
      </form>

      {alCrear ? (
        <button type="button" className="lg-carpeta-enlace" onClick={alCrear}>
          No tengo carpeta todavía: crear una
        </button>
      ) : null}
    </section>
  );
}

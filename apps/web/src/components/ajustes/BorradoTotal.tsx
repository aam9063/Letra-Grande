"use client";

import { useEffect, useRef, useState } from "react";
import { Callout } from "@letra-grande/design/client";
import { WrongPasswordError } from "@letra-grande/vault";
import { purgarTodo } from "./borrado";
import { CLAVE_ONBOARDING } from "@/components/onboarding/primer-arranque";
import { restablecerTamanoLetra } from "./tamano-letra";

type Estado = "reposo" | "confirmado" | "borrando" | "hecho";

/**
 * Borrado total (UI-06, S2): el único flujo destructivo del shell. Nunca se
 * ejecuta sin confirmación explícita con la contraseña de la carpeta. Con
 * contraseña incorrecta se muestra el mensaje y no se borra nada. Tras
 * borrar, la app queda como recién instalada: los ajustes de tamaño vuelven
 * a Normal.
 */
export function BorradoTotal() {
  const [estado, setEstado] = useState<Estado>("reposo");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);

  const ocupado = estado === "borrando";

  // La confirmación abre con el foco en la contraseña; al cancelar, vuelve al
  // botón que la desencadenó.
  useEffect(() => {
    if (estado === "confirmado") {
      campoRef.current?.focus();
    }
  }, [estado]);

  function abrir(): void {
    setEstado("confirmado");
    setClave("");
    setError(null);
  }

  function cancelar(): void {
    setEstado("reposo");
    setClave("");
    setError(null);
    botonRef.current?.focus();
  }

  async function confirmar(): Promise<void> {
    if (clave.length === 0 || ocupado) {
      return;
    }
    setEstado("borrando");
    setError(null);
    try {
      await purgarTodo(clave);
      restablecerTamanoLetra();
      // La app queda como recién instalada: también el onboarding vuelve a
      // mostrarse en la siguiente visita.
      localStorage.removeItem(CLAVE_ONBOARDING);
      setEstado("hecho");
    } catch (error) {
      if (error instanceof WrongPasswordError) {
        setError(error.message);
      } else {
        setError("No se han podido borrar los datos. Inténtalo de nuevo.");
      }
      setEstado("confirmado");
    }
  }

  if (estado === "hecho") {
    return (
      <Callout tone="exito" title="Datos borrados">
        <p>Se han borrado todos tus datos de este dispositivo. La app ha vuelto a su estado inicial.</p>
      </Callout>
    );
  }

  return (
    <div className="lg-borrado">
      <p className="lg-borrado-texto">
        Se eliminan tus documentos, fichas y ajustes guardados en este dispositivo. Esta acción no
        se puede deshacer.
      </p>
      {estado === "reposo" ? (
        <button type="button" ref={botonRef} className="lg-peligro" onClick={abrir}>
          Borrar todos mis datos
        </button>
      ) : (
        <div className="lg-borrado-confirmacion">
          <Callout tone="peligro" title="Importante">
            <p>Si borras todos los datos no se puede recuperar nada.</p>
          </Callout>
          <label className="lg-borrado-etiqueta" htmlFor="lg-borrado-clave">
            Contraseña de la carpeta
          </label>
          <input
            ref={campoRef}
            id="lg-borrado-clave"
            className="lg-borrado-clave"
            type="password"
            autoComplete="current-password"
            value={clave}
            onChange={(evento) => setClave(evento.target.value)}
          />
          {/* Contenedor persistente: si se monta solo con el error, algunos
              lectores de pantalla no lo anuncian. */}
          <p className="lg-borrado-error" aria-live="assertive">
            {error}
          </p>
          <div className="lg-borrado-botones">
            <button
              type="button"
              className="lg-peligro"
              disabled={clave.length === 0 || ocupado}
              onClick={() => {
                void confirmar();
              }}
            >
              {ocupado ? "Borrando..." : "Borrar todo definitivamente"}
            </button>
            <button type="button" className="lg-secundario" onClick={cancelar} disabled={ocupado}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

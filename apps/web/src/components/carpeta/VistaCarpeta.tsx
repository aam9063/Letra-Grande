"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sesionCarpeta, useSesionCarpeta } from "./sesion";
import { CrearCarpeta } from "./CrearCarpeta";
import { DesbloquearCarpeta } from "./DesbloquearCarpeta";

type Vista = "crear" | "desbloquear";

/**
 * Vista de la página Carpeta (UI-07): conmuta entre crear, desbloquear y la
 * sesión abierta según el estado de la sesión compartida. Hasta que el
 * componente se monta no hay estado fiable en el cliente: se muestra solo el
 * título, para que el HTML del servidor y la primera pintura coincidan.
 */
export function VistaCarpeta() {
  const estado = useSesionCarpeta();
  const [vista, setVista] = useState<Vista>("crear");
  const [montado, setMontado] = useState(false);
  const parametros = useSearchParams();

  useEffect(() => {
    setMontado(true);
    setVista(sesionCarpeta.consultar() === "cerrada" ? "desbloquear" : "crear");
  }, []);

  useEffect(() => {
    if (estado === "cerrada") {
      setVista("desbloquear");
    }
    if (estado === "no-creada") {
      setVista("crear");
    }
  }, [estado]);

  // Solo rutas internas: sin saltos a sitios de fuera de la app. La barra
  // invertida queda fuera porque «/\evil.com» no es una ruta de la app. En
  // entornos sin router montado (render de servidor, tests del shell) no hay
  // parámetros.
  const pedida = parametros?.get("next") ?? undefined;
  const destino =
    pedida !== undefined && pedida.startsWith("/") && !pedida.startsWith("//") && !pedida.includes("\\")
      ? pedida
      : undefined;

  if (!montado) {
    return (
      <main className="lg-carpeta">
        <h1>Carpeta</h1>
      </main>
    );
  }

  if (estado === "abierta") {
    return (
      <main className="lg-carpeta">
        <h1>Carpeta</h1>
        <section className="lg-carpeta-panel" aria-label="Tu carpeta está abierta">
          <h2>Tu carpeta está abierta</h2>
          <p>
            Todo lo que guardes aquí se queda cifrado en este dispositivo. Si no la usas, la sesión
            se cierra sola y volverá a pedir la contraseña.
          </p>
          <div className="lg-carpeta-botones">
            <button
              type="button"
              className="lg-secundario"
              onClick={() => {
                sesionCarpeta.bloquear();
              }}
            >
              Bloquear
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="lg-carpeta">
      <h1>Carpeta</h1>
      {vista === "crear" ? (
        <CrearCarpeta alDesbloquear={() => setVista("desbloquear")} />
      ) : (
        <DesbloquearCarpeta alCrear={() => setVista("crear")} destino={destino} />
      )}
    </main>
  );
}

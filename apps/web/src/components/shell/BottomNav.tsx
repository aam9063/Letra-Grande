"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { destinosExtra, destinosPrincipales } from "./destinos";
import { iconosNav, iconoMas } from "./iconos";

/**
 * Barra móvil flotante (UI-04): cuatro destinos principales con icono y
 * etiqueta, y un quinto botón «Más» (tres puntos) que abre una hoja modal con
 * el resto de módulos y Ajustes. En escritorio la sustituye la Sidebar.
 */
export function BottomNav() {
  const pathname = usePathname() ?? "/";
  const [abierta, setAbierta] = useState(false);
  const botonRef = useRef<HTMLButtonElement>(null);
  const hojaRef = useRef<HTMLDivElement>(null);

  // Al abrir, el foco entra en la hoja; al cerrar, vuelve al botón.
  useEffect(() => {
    if (abierta) {
      hojaRef.current?.focus();
    }
  }, [abierta]);

  // Escape a nivel de documento: el foco puede salir de la hoja con Tab y el
  // oyente dentro de la hoja dejaría de recibirlo.
  useEffect(() => {
    if (!abierta) return;
    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === "Escape") cerrar();
    }
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [abierta]);

  // Navegar cierra la hoja: la página nueva nunca queda tapada.
  useEffect(() => {
    setAbierta(false);
  }, [pathname]);

  function cerrar() {
    setAbierta(false);
    botonRef.current?.focus();
  }

  return (
    <>
      <nav className="lg-nav" aria-label="Secciones">
        <ul className="lg-nav-lista">
          {destinosPrincipales.map((destino) => {
            const activo = pathname === destino.href || pathname.startsWith(`${destino.href}/`);

            return (
              <li key={destino.href}>
                <Link
                  href={destino.href}
                  className={`lg-nav-enlace${activo ? " lg-nav-enlace-activo" : ""}`}
                  aria-current={activo ? "page" : undefined}
                >
                  <Trazo d={iconosNav[destino.nombre] ?? ""} />
                  <span>{destino.nombre}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              ref={botonRef}
              className="lg-nav-enlace lg-nav-boton"
              aria-haspopup="dialog"
              aria-expanded={abierta}
              onClick={() => setAbierta(true)}
            >
              <Trazo d={iconoMas} />
              <span>Más</span>
            </button>
          </li>
        </ul>
      </nav>

      {abierta && (
        <div
          className="lg-nav-velo"
          onClick={(evento) => {
            // Solo un toque directo en el velo cierra: los clics dentro de la
            // hoja burbujean hasta aquí y no deben descartarla por sorpresa.
            if (evento.target === evento.currentTarget) cerrar();
          }}
        >
          <div
            ref={hojaRef}
            role="dialog"
            aria-modal="true"
            aria-label="Más módulos"
            tabIndex={-1}
            className="lg-nav-hoja"
            onKeyDown={(evento) => {
              if (evento.key === "Escape") cerrar();
            }}
          >
            <p className="lg-nav-hoja-titulo">Más módulos</p>
            <ul className="lg-nav-hoja-lista">
              {destinosExtra.map((destino) => {
                const activo =
                  pathname === destino.href || pathname.startsWith(`${destino.href}/`);

                return (
                  <li key={destino.href}>
                    <Link
                      href={destino.href}
                      className="lg-nav-hoja-enlace"
                      aria-current={activo ? "page" : undefined}
                    >
                      <Trazo d={iconosNav[destino.nombre] ?? ""} pequena />
                      {destino.nombre}
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link href="/ajustes" className="lg-nav-hoja-enlace">
                  <Trazo d={iconosNav["Ajustes"] ?? ""} pequena />
                  Ajustes
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function Trazo({ d, pequena = false }: { d: string; pequena?: boolean }) {
  return (
    <svg
      style={{ flex: "none" }}
      width={pequena ? 22 : 24}
      height={pequena ? 22 : 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

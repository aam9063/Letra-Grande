"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { destinosPrincipales, modulosSidebar } from "./destinos";
import { iconosNav } from "./iconos";

/**
 * Sidebar de escritorio (Escritorio.dc.html): identidad, nav principal con la
 * página marcada, grupo «Más módulos», estado de la carpeta y salida a
 * Ajustes. En móvil la sustituye la barra flotante (BottomNav).
 */
export function Sidebar() {
  const pathname = usePathname() ?? "/";

  return (
    <aside className="lg-sidebar">
      <Link href="/hoy" className="lg-sidebar-logo">
        <span className="lg-sidebar-cubo" aria-hidden="true">
          A
        </span>
        <span>
          Letra <strong>Grande</strong>
        </span>
      </Link>

      <p className="lg-sidebar-perfil">
        <span className="lg-sidebar-iniciales" aria-hidden="true">
          YO
        </span>
        <span>Perfil: Yo</span>
      </p>

      <nav aria-label="Principal" className="lg-sidebar-nav">
        {destinosPrincipales.map((destino) => {
          const activo = pathname === destino.href || pathname.startsWith(`${destino.href}/`);

          return (
            <Link
              key={destino.href}
              href={destino.href}
              aria-current={activo ? "page" : undefined}
              className={`lg-sidebar-enlace${activo ? " lg-sidebar-enlace-activo" : ""}`}
            >
              <Trazo d={iconosNav[destino.nombre] ?? ""} />
              {destino.nombre}
            </Link>
          );
        })}
      </nav>

      <div>
        <p className="lg-sidebar-grupo">Más módulos</p>
        <nav aria-label="Módulos" className="lg-sidebar-nav lg-sidebar-nav-secundaria">
          {modulosSidebar.map((modulo) =>
            modulo.href ? (
              <Link key={modulo.nombre} href={modulo.href} className="lg-sidebar-modulo">
                <Trazo d={iconosNav[modulo.nombre] ?? ""} pequena />
                {modulo.nombre}
              </Link>
            ) : (
              <span key={modulo.nombre} className="lg-sidebar-modulo lg-sidebar-modulo-pendiente">
                <Trazo d={iconosNav[modulo.nombre] ?? ""} pequena />
                {modulo.nombre}
                <span className="lg-sidebar-proxima">Próximamente</span>
              </span>
            ),
          )}
        </nav>
      </div>

      <div className="lg-sidebar-pie">
        <p className="lg-sidebar-carpeta">
          <Trazo d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5" />
          <span>
            <strong>Carpeta cifrada.</strong> Todo se guarda solo en este dispositivo.
          </span>
        </p>
        <Link href="/ajustes" className="lg-sidebar-ajustes">
          <Trazo d={iconosNav["Ajustes"] ?? ""} pequena />
          Ajustes
        </Link>
      </div>
    </aside>
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

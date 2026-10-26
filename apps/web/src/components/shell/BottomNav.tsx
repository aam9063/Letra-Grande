"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { destinos } from "./destinos";

/**
 * Navegación inferior de la app (sección 14). Landmark de navegación con los
 * ocho destinos, página actual marcada con aria-current y objetivo táctil de
 * 44 px en cada enlace.
 */
export function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="lg-nav" aria-label="Secciones">
      <ul className="lg-nav-lista">
        {destinos.map((destino) => {
          const activo = pathname === destino.href || pathname.startsWith(`${destino.href}/`);

          return (
            <li key={destino.href}>
              <Link
                href={destino.href}
                className="lg-nav-enlace"
                aria-current={activo ? "page" : undefined}
                style={{ minWidth: "var(--lg-objetivo)", minHeight: "var(--lg-objetivo)" }}
              >
                {destino.nombre}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

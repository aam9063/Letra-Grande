import type { ReactNode } from "react";
import { Callout } from "@letra-grande/design/client";
import Link from "next/link";
import { BottomNav } from "@/components/shell/BottomNav";
import { Sidebar } from "@/components/shell/Sidebar";

// Shell de la app: sidebar de escritorio (UI-04, Escritorio.dc.html) y barra
// flotante móvil; el aviso de independencia y verificación sigue visible desde
// todas las rutas de la aplicación (sección 14).
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lg-shell">
      <Sidebar />
      <div className="lg-principal">
        <Link href="/hoy" className="lg-cabecera-movil">
          <span className="lg-cabecera-movil-cubo" aria-hidden="true">
            A
          </span>
          <span>
            Letra <strong>Grande</strong>
          </span>
        </Link>
        {children}
        <Callout tone="info" title="Proyecto independiente">
          <p>
            Letra Grande es un proyecto independiente, sin vinculación con ninguna empresa ni con
            la Administración. Ofrece información orientativa elaborada a partir de fuentes
            públicas, que puede estar incompleta o desactualizada. No constituye asesoramiento
            jurídico. Comprueba siempre la fuente enlazada y, ante dudas, consulta con un
            profesional o con un organismo de consumo.
          </p>
        </Callout>
      </div>
      <BottomNav />
    </div>
  );
}

import type { ReactNode } from "react";
import { Callout } from "@letra-grande/design/client";
import { BottomNav } from "@/components/shell/BottomNav";

// Shell de la app: aviso de independencia y verificación visible desde todas
// las rutas de la aplicación (sección 14) y navegación inferior.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lg-shell">
      {children}
      <Callout tone="info" title="Proyecto independiente">
        <p>
          Letra Grande es un proyecto independiente, sin vinculación con ninguna empresa ni con la
          Administración. Ofrece información orientativa elaborada a partir de fuentes públicas,
          que puede estar incompleta o desactualizada. No constituye asesoramiento jurídico.
          Comprueba siempre la fuente enlazada y, ante dudas, consulta con un profesional o con un
          organismo de consumo.
        </p>
      </Callout>
      <BottomNav />
    </div>
  );
}

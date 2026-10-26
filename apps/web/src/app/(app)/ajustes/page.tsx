import { Callout } from "@letra-grande/design/client";
import { paginaPendiente } from "@/components/shell/pendiente";

// Ajustes (UI-06): la página llega con su tarea; hoy el shell enlaza a un
// estado pendiente honesto en lugar de a una pantalla que no existe.
export default function AjustesPage() {
  return (
    <main>
      <h1>Ajustes</h1>
      <Callout tone="info" title="Próximamente">
        <p>{paginaPendiente}</p>
      </Callout>
    </main>
  );
}

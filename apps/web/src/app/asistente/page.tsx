import type { Metadata } from "next";
import { paginaPendiente } from "@/components/shell/pendiente";

export const metadata: Metadata = { title: "Asistente | Letra Grande" };

export default function AsistentePage() {
  return (
    <main>
      <h1>Asistente</h1>
      <p className="lg-pendiente">{paginaPendiente}</p>
    </main>
  );
}

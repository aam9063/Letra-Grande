import type { Metadata } from "next";
import { paginaPendiente } from "@/components/shell/pendiente";

export const metadata: Metadata = { title: "Datos | Letra Grande" };

export default function DatosPage() {
  return (
    <main>
      <h1>Datos</h1>
      <p className="lg-pendiente">{paginaPendiente}</p>
    </main>
  );
}

import type { Metadata } from "next";
import { paginaPendiente } from "@/components/shell/pendiente";

export const metadata: Metadata = { title: "Carpeta | Letra Grande" };

export default function CarpetaPage() {
  return (
    <main>
      <h1>Carpeta</h1>
      <p className="lg-pendiente">{paginaPendiente}</p>
    </main>
  );
}

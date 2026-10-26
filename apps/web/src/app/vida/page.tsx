import type { Metadata } from "next";
import { paginaPendiente } from "@/components/shell/pendiente";

export const metadata: Metadata = { title: "Vida | Letra Grande" };

export default function VidaPage() {
  return (
    <main>
      <h1>Vida</h1>
      <p className="lg-pendiente">{paginaPendiente}</p>
    </main>
  );
}

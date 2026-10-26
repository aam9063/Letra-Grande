import type { Metadata } from "next";
import { paginaPendiente } from "@/components/shell/pendiente";

export const metadata: Metadata = { title: "Hoy | Letra Grande" };

export default function HoyPage() {
  return (
    <main>
      <h1>Hoy</h1>
      <p className="lg-pendiente">{paginaPendiente}</p>
    </main>
  );
}

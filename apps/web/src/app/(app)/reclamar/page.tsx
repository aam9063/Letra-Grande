import type { Metadata } from "next";
import { paginaPendiente } from "@/components/shell/pendiente";

export const metadata: Metadata = { title: "Reclamar y bajas | Letra Grande" };

export default function ReclamarPage() {
  return (
    <main>
      <h1>Reclamar y bajas</h1>
      <p className="lg-pendiente">{paginaPendiente}</p>
    </main>
  );
}

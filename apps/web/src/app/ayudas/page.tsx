import type { Metadata } from "next";
import { paginaPendiente } from "@/components/shell/pendiente";

export const metadata: Metadata = { title: "Ayudas | Letra Grande" };

export default function AyudasPage() {
  return (
    <main>
      <h1>Ayudas</h1>
      <p className="lg-pendiente">{paginaPendiente}</p>
    </main>
  );
}

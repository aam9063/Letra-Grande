import type { Metadata } from "next";
import { paginaPendiente } from "@/components/shell/pendiente";

export const metadata: Metadata = { title: "Familia | Letra Grande" };

export default function FamiliaPage() {
  return (
    <main>
      <h1>Familia</h1>
      <p className="lg-pendiente">{paginaPendiente}</p>
    </main>
  );
}

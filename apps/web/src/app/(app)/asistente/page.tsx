import type { Metadata } from "next";
import { VistaAsistente } from "@/components/asistente/VistaAsistente";

// Asistente (AI-03): la página es fina y delega en el componente cliente,
// como la carpeta. La conversación vive solo en memoria del navegador.
export const metadata: Metadata = { title: "Asistente | Letra Grande" };

export default function AsistentePage() {
  return <VistaAsistente />;
}

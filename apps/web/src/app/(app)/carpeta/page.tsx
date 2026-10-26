import type { Metadata } from "next";
import { Suspense } from "react";
import { VistaCarpeta } from "@/components/carpeta/VistaCarpeta";

// Carpeta privada (UI-07): crear, desbloquear y bloquear. La sesión del vault
// vive en el cliente y nunca sale del dispositivo.
export const metadata: Metadata = { title: "Carpeta | Letra Grande" };

export default function CarpetaPage() {
  return (
    <Suspense fallback={null}>
      <VistaCarpeta />
    </Suspense>
  );
}

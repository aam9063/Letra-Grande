import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Callout } from "@letra-grande/design/client";
import { BottomNav } from "@/components/shell/BottomNav";
import { ServiceWorkerRegistrar } from "@/components/shell/ServiceWorkerRegistrar";
// Primero la hoja del paquete de diseño y después la de la app: así gana la
// app en cualquier regla compartida.
import "@letra-grande/design/base.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Letra Grande",
  description:
    "Entiende tus facturas, contratos y cartas oficiales, y actúa a tiempo. Tus datos se quedan en tu dispositivo.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0B5FA5",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="lg-shell">
          {children}
          {/* Aviso de independencia y verificación: visible desde todas las rutas (sección 14). */}
          <Callout tone="info" title="Proyecto independiente">
            <p>
              Letra Grande es un proyecto independiente, sin vinculación con ninguna empresa ni con
              la Administración. Ofrece información orientativa elaborada a partir de fuentes
              públicas, que puede estar incompleta o desactualizada. No constituye asesoramiento
              jurídico. Comprueba siempre la fuente enlazada y, ante dudas, consulta con un
              profesional o con un organismo de consumo.
            </p>
          </Callout>
          <BottomNav />
        </div>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}

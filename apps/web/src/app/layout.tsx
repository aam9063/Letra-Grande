import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/shell/BottomNav";
import { ServiceWorkerRegistrar } from "@/components/shell/ServiceWorkerRegistrar";
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
          {/* Aviso de independencia y verificación: visible desde todas las rutas (sección 14).
              Mismas clases y tokens que el Callout de @letra-grande/design; el barrel del
              paquete arrastra gallery/generate (react-dom/server) y no puede entrar en la
              build del navegador. */}
          <div className="lg-callout lg-callout-info" role="note">
            <p className="lg-callout-etiqueta">Información</p>
            <p className="lg-callout-titulo">Proyecto independiente</p>
            <div className="lg-callout-cuerpo">
              <p>
                Letra Grande es un proyecto independiente, sin vinculación con ninguna empresa ni con
                la Administración. Ofrece información orientativa elaborada a partir de fuentes
                públicas, que puede estar incompleta o desactualizada. No constituye asesoramiento
                jurídico. Comprueba siempre la fuente enlazada y, ante dudas, consulta con un
                profesional o con un organismo de consumo.
              </p>
            </div>
          </div>
          <BottomNav />
        </div>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}

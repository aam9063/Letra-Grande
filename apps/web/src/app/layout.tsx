import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { Callout } from "@letra-grande/design/client";
import { BottomNav } from "@/components/shell/BottomNav";
import { ServiceWorkerRegistrar } from "@/components/shell/ServiceWorkerRegistrar";

// Fuente de marca autoalojada (SIL OFL 1.1, ver fonts/OFL.txt): sin peticiones
// a terceros. next/font genera el fallback ajustado (Host Grotesk Fallback)
// para que el cambio de fuente no mueva el diseño.
const hostGrotesk = localFont({
  src: "./fonts/host-grotesk-latin.woff2",
  weight: "400 800",
  display: "swap",
  variable: "--font-host-grotesk",
  fallback: ["system-ui", "sans-serif"],
});

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
  themeColor: "#3E9B94",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={hostGrotesk.variable}>
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

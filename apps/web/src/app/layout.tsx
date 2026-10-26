import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { ServiceWorkerRegistrar } from "@/components/shell/ServiceWorkerRegistrar";
// Primero la hoja del paquete de diseño y después la de la app: así gana la
// app en cualquier regla compartida.
import "@letra-grande/design/base.css";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Letra Grande",
  description:
    "Entiende tus facturas, contratos y cartas oficiales, y actúa a tiempo. Tus datos se quedan en tu dispositivo.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#3E9B94",
};

// Layout raíz mínimo: html, fuente, service worker y tamaño de letra. El
// shell de la app (aviso de independencia y navegación) vive en (app), y la
// landing en (landing) se renderiza sin él.

// Tamaño de letra (UI-06, S1): se aplica antes del primer pintado para evitar
// saltos. Misma lógica que tamano-letra.ts, copiada mínima porque un script
// inline no puede importar módulos de la app. Solo una bandera local: sin
// datos personales y sin llamadas de red.
const SCRIPT_TAMANO = `(function(){try{var t=localStorage.getItem("lg-tamano-letra");var f={normal:"100%",grande:"112.5%","muy-grande":"125%"};var s=f[t];if(s)document.documentElement.style.fontSize=s;}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={hostGrotesk.variable} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TAMANO }} />
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}

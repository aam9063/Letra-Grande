import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Letra Grande",
  description:
    "Entiende tus facturas, contratos y cartas oficiales, y actúa a tiempo. Tus datos se quedan en tu dispositivo.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

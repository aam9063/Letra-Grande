"use client";

import { useEffect } from "react";

/**
 * Registra el service worker del shell (apps/web/public/sw.js) desde el
 * cliente, sin scripts en línea: la futura CSP los prohíbe.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sin conexión no hay que romper la app: el registro se reintenta sola.
      });
    }
  }, []);

  return null;
}

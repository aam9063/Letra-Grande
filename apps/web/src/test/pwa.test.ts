import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tokens } from "@letra-grande/design";
import { destinos } from "../components/shell/destinos";

// El manifiesto, los iconos y el service worker son ficheros estáticos: se
// comprueban leyendo lo que de verdad se publica en apps/web/public.
const publico = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "public");

describe("contrato navegación y ficheros", () => {
  it("cada destino tiene su page.tsx en src/app/(app)", () => {
    for (const destino of destinos) {
      const ruta = join(
        dirname(fileURLToPath(import.meta.url)),
        "..",
        "app",
        "(app)",
        destino.href.replace(/^\//, ""),
        "page.tsx",
      );

      expect(existsSync(ruta), `Falta ${ruta} para el destino ${destino.nombre}`).toBe(true);
    }
  });
});

describe("manifiesto PWA", () => {
  const manifiesto: Record<string, unknown> = JSON.parse(
    readFileSync(join(publico, "manifest.webmanifest"), "utf8"),
  );

  it("declara name, short_name, start_url y display standalone", () => {
    expect(manifiesto.name).toBe("Letra Grande");
    expect(manifiesto.short_name).toBe("Letra Grande");
    expect(manifiesto.id).toBe("/");
    expect(manifiesto.start_url).toBe("/");
    expect(manifiesto.display).toBe("standalone");
  });

  it("usa los colores de los tokens de diseño", () => {
    // Tema y fondo: valores de packages/design/src/tokens.ts.
    expect(manifiesto.theme_color).toBe(tokens.colorAcento);
    expect(manifiesto.background_color).toBe(tokens.colorLienzo);
  });

  it("declara iconos que existen de verdad", () => {
    const iconos = manifiesto.icons as Array<{ src: string }>;

    expect(Array.isArray(iconos)).toBe(true);
    expect(iconos.length).toBeGreaterThan(0);
    for (const icono of iconos) {
      expect(existsSync(join(publico, icono.src.replace(/^\//, "")))).toBe(true);
    }
  });
});

describe("tokens en la hoja de estilos de la app", () => {
  const css = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "app", "globals.css"),
    "utf8",
  );

  it("declara las custom properties de diseño con los valores del paquete", () => {
    expect(css).toContain(`--lg-tinta: ${tokens.colorTinta.toLowerCase()}`);
    expect(css).toContain(`--lg-lienzo: ${tokens.colorLienzo.toLowerCase()}`);
    expect(css).toContain(`--lg-superficie: ${tokens.colorSuperficie.toLowerCase()}`);
    expect(css).toContain(`--lg-acento: ${tokens.colorAcento.toLowerCase()}`);
    expect(css).toContain(`--lg-objetivo: 44px`);
  });
});

describe("service worker", () => {
  const sw = readFileSync(join(publico, "sw.js"), "utf8");

  it("declara una constante de versión", () => {
    expect(sw).toMatch(/const CACHE_VERSION = "/);
  });

  it("precachea solo el shell de la aplicación", () => {
    const lista = sw.match(/const PRECACHE = \[([^\]]*)\]/);
    expect(lista).not.toBeNull();

    const urls = (lista?.[1]?.match(/"([^"]+)"/g) ?? []).map((u) => u.replaceAll('"', ""));
    expect(urls).toEqual(["/", "/manifest.webmanifest", "/icon.svg", "/icon-maskable.svg"]);
  });

  it("no guarda nada en caché fuera del precache inicial (nunca datos de usuario)", () => {
    // Ningún cache.put en el handler de fetch: si no se escribe, no se puede
    // colar una respuesta con datos personales en la caché.
    expect(sw).not.toContain("cache.put");
    expect(sw).toContain("datos de usuario");
  });

  it("sirve las navegaciones network-first con caché de respaldo", () => {
    const rama = sw.slice(sw.indexOf('request.mode === "navigate"'));
    const cuerpo = rama.slice(0, rama.indexOf("caches.match", 1) + 40);

    // Primero la red (HTML fresco tras cada despliegue); si falla, la caché.
    expect(cuerpo).toContain("fetch(event.request)");
    expect(cuerpo.indexOf("fetch(event.request)")).toBeLessThan(cuerpo.indexOf("caches.match"));
  });

  it("aplica cache-first solo al manifiesto y a los iconos, nunca a la portada", () => {
    const lista = sw.match(/const CACHE_FIRST = \[([^\]]*)\]/);
    expect(lista).not.toBeNull();

    const urls = (lista?.[1]?.match(/"([^"]+)"/g) ?? []).map((u) => u.replaceAll('"', ""));
    expect(urls).toEqual(["/manifest.webmanifest", "/icon.svg", "/icon-maskable.svg"]);
    expect(urls).not.toContain("/");
  });
});

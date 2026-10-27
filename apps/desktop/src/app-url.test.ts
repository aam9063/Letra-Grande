// Pruebas de las funciones puras del proceso principal. No importan Electron:
// la logica vive en modulos propios para poder probarse sin arrancar la app.
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { APP_ORIGIN, DESKTOP_START_PATH, isNavigationAllowed, startUrl } from "./navigation.js";
import { buildCsp } from "./csp.js";
import { inlineScriptHashes } from "./inline-scripts.js";
import { isPermissionAllowed, NO_PERMISSIONS_ALLOWED } from "./permissions.js";
import { resolveAppUrl } from "./app-url.js";

// Existe() simulado: los archivos que tendria la exportacion estatica.
function existeEn(relativos: string[]) {
  const conjunto = new Set(relativos);
  return (rutaRelativa: string): boolean => conjunto.has(rutaRelativa);
}

const exportacionTipica = existeEn([
  "index.html",
  "facturas.html",
  "secciones/index.html",
  "_next/static/chunk.js",
  "_next/static/app.css",
]);

describe("resolveAppUrl", () => {
  it("la raiz del origen resuelve al index.html de la exportacion", () => {
    const resolucion = resolveAppUrl("app://letra-grande/", exportacionTipica);
    expect(resolucion).toEqual({ kind: "directoryIndex", relativePath: "index.html" });
  });

  it("una ruta de archivo existente resuelve a ese archivo", () => {
    const resolucion = resolveAppUrl(
      "app://letra-grande/_next/static/chunk.js",
      exportacionTipica,
    );
    expect(resolucion).toEqual({ kind: "file", relativePath: "_next/static/chunk.js" });
  });

  it("una peticion a un directorio resuelve a su index.html", () => {
    const resolucion = resolveAppUrl("app://letra-grande/secciones/", exportacionTipica);
    expect(resolucion).toEqual({ kind: "directoryIndex", relativePath: "secciones/index.html" });
  });

  it("una ruta desconocida cae al index.html para la navegacion del cliente", () => {
    const resolucion = resolveAppUrl("app://letra-grande/ruta-que-no-existe", exportacionTipica);
    expect(resolucion).toEqual({ kind: "fallbackIndex" });
  });

  it("un salto de directorio codificado se rechaza", () => {
    const resolucion = resolveAppUrl(
      "app://letra-grande/%2e%2e/%2e%2e/etc/passwd",
      exportacionTipica,
    );
    expect(resolucion).toEqual({ kind: "rejected" });
  });

  it("un salto de directorio con barra invertida codificada se rechaza", () => {
    const resolucion = resolveAppUrl(
      "app://letra-grande/%5C..%5C..%5Cwindows%5Cwin.ini",
      exportacionTipica,
    );
    expect(resolucion).toEqual({ kind: "rejected" });
  });

  it("un salto de directorio literal en la ruta se rechaza", () => {
    const resolucion = resolveAppUrl(
      "app://letra-grande/x/../../etc/passwd",
      existeEn(["../etc/passwd"]),
    );
    expect(resolucion).toEqual({ kind: "rejected" });
  });

  it("un host distinto del origen de la app se rechaza", () => {
    expect(resolveAppUrl("app://otro/index.html", exportacionTipica)).toEqual({
      kind: "rejected",
    });
  });

  it("una URL que no se puede analizar se rechaza", () => {
    expect(resolveAppUrl("no es una url", exportacionTipica)).toEqual({ kind: "rejected" });
  });

  it("un byte nulo codificado se rechaza", () => {
    expect(resolveAppUrl("app://letra-grande/index.html%00.js", exportacionTipica)).toEqual({
      kind: "rejected",
    });
  });
});

describe("isNavigationAllowed", () => {
  it("permite navegar dentro del origen app://letra-grande", () => {
    expect(isNavigationAllowed("app://letra-grande/facturas")).toBe(true);
    expect(isNavigationAllowed(`${APP_ORIGIN}/`)).toBe(true);
  });

  it("bloquea cualquier otro esquema u origen", () => {
    expect(isNavigationAllowed("https://ejemplo.com")).toBe(false);
    expect(isNavigationAllowed("http://ejemplo.com")).toBe(false);
    expect(isNavigationAllowed("file:///C:/Windows/win.ini")).toBe(false);
    expect(isNavigationAllowed("app://otro-host/")).toBe(false);
    expect(isNavigationAllowed("about:blank")).toBe(false);
    expect(isNavigationAllowed("data:text/html,hola")).toBe(false);
  });

  it("una URL rota se bloquea", () => {
    expect(isNavigationAllowed(":::")).toBe(false);
  });
});

describe("isPermissionAllowed", () => {
  it("deniega todo permiso cuando no hay nada permitido explicitamente", () => {
    for (const permiso of [
      "media",
      "geolocation",
      "notifications",
      "clipboard-read",
      "clipboard-sanitized-write",
      "fullscreen",
      "pointerLock",
      "openExternal",
      "display-capture",
    ]) {
      expect(isPermissionAllowed(permiso, NO_PERMISSIONS_ALLOWED)).toBe(false);
    }
  });

  it("concede solo el permiso incluido en la lista explicita", () => {
    const permitidos = new Set(["clipboard-sanitized-write"]);
    expect(isPermissionAllowed("clipboard-sanitized-write", permitidos)).toBe(true);
    expect(isPermissionAllowed("media", permitidos)).toBe(false);
  });
});

describe("buildCsp", () => {
  it("sin proxy configurado limita la conexion al propio origen", () => {
    expect(buildCsp(undefined)).toBe(
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; " +
        "base-uri 'self'; form-action 'none'; frame-ancestors 'none'",
    );
  });

  it("permite atributos style en linea: el renderer prerenderizado los usa", () => {
    expect(buildCsp(undefined)).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("con proxy configurado anade su origen https a connect-src y a nada mas", () => {
    const csp = buildCsp("https://proxy.ejemplo.com");
    expect(csp).toContain("connect-src 'self' https://proxy.ejemplo.com");
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("ignora un origen de proxy que no sea https", () => {
    expect(buildCsp("http://proxy.ejemplo.com")).toBe(buildCsp(undefined));
  });

  it("anade los hashes de los scripts en linea a script-src", () => {
    const csp = buildCsp(undefined, ["'sha256-AAA='", "'sha256-BBB='"]);
    expect(csp).toContain("script-src 'self' 'sha256-AAA=' 'sha256-BBB='");
  });

  it("sin hashes deja script-src solo con el propio origen", () => {
    expect(buildCsp(undefined)).toContain("script-src 'self';");
  });
});

describe("inlineScriptHashes", () => {
  function sha256Base64(contenido: string): string {
    return createHash("sha256").update(contenido).digest("base64");
  }

  it("calcula el hash de cada script en linea y no de los que llevan src", () => {
    const html =
      '<html><head><script src="/_next/static/chunks/main-app.js" async=""></script></head>' +
      '<body><script>self.__next_f.push([1,"payload"])</script>' +
      '<script>\nconsole.log("otro")\n</script></body></html>';
    expect(inlineScriptHashes(html)).toEqual([
      `'sha256-${sha256Base64('self.__next_f.push([1,"payload"])')}'`,
      `'sha256-${sha256Base64('\nconsole.log("otro")\n')}'`,
    ]);
  });

  it("ignora los scripts en linea vacios", () => {
    const html = "<html><body><script>   </script><script></script></body></html>";
    expect(inlineScriptHashes(html)).toEqual([]);
  });

  it("una pagina sin scripts en linea devuelve una lista vacia", () => {
    expect(inlineScriptHashes('<html><script src="/a.js"></script></html>')).toEqual([]);
  });

  it("un script en linea con atributos no se hashea y la CSP lo bloquea", () => {
    // Comportamiento deliberado: fallar cerrado. El extractor solo reconoce
    // <script> pelado, igual que la exportacion actual de Next; si algun dia
    // aparece un script en linea con atributos, no se autoriza y la CSP lo
    // bloquea en lugar de abrir la puerta sin calculo de hash.
    const html = '<script type="module">console.log("hola")</script>';
    expect(inlineScriptHashes(html)).toEqual([]);
    expect(buildCsp(undefined, inlineScriptHashes(html))).not.toContain("sha256-");
  });
});

describe("arranque de la ventana", () => {
  it("abre la pantalla de la aplicacion, no la landing", () => {
    expect(DESKTOP_START_PATH).toBe("/hoy/");
    expect(startUrl()).toBe(`${APP_ORIGIN}/hoy/`);
    expect(startUrl()).not.toBe(`${APP_ORIGIN}/`);
  });

  it("respeta el origen que se le pase", () => {
    expect(startUrl("app://otro")).toBe("app://otro/hoy/");
  });
});

describe("resolucion del arranque contra la exportacion", () => {
  it("la URL de arranque resuelve al indice de su carpeta", () => {
    // La exportacion de escritorio genera ruta/index.html (trailingSlash).
    const resolucion = resolveAppUrl(`${APP_ORIGIN}${DESKTOP_START_PATH}`, (rel) =>
      rel === "index.html" || rel === "hoy/index.html",
    );
    expect(resolucion).toEqual({ kind: "directoryIndex", relativePath: "hoy/index.html" });
  });
});

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// REF-QA-08-03: el vault pesa poco (2.9 KiB gzip) pero no tiene por que
// descargarse en nueve rutas que no lo usan. Este test ancla la decision, porque
// ningun otro la detecta: si alguien vuelve al import estatico, la build lo
// arrastra otra vez al bundle inicial y las pruebas de comportamiento siguen en
// verde.
const sesion = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "sesion.ts"),
  "utf8",
);
const PAQUETE = String.raw`['"]@letra-grande/vault['"]`;

describe("sesion de la carpeta y peso del vault", () => {
  it("no importa ningun valor del vault: solo tipos", () => {
    // Cubre comillas simples y dobles, imports multilinea y `export ... from`.
    const importsDeValor = [
      // Anclados a inicio de linea (flag m) para no arrancar desde un comentario
      // que mencione la palabra import.
      // Anclados a inicio de linea (flag m) para no arrancar desde un comentario,
      // y sin cruzar el fin de sentencia para no saltar de un import a otro.
      new RegExp(String.raw`^[ \t]*import\s+(?!type\b)[^;]*from\s+${PAQUETE}`, "gm"),
      new RegExp(String.raw`^[ \t]*export\s+[^;]*from\s+${PAQUETE}`, "gm"),
      new RegExp(String.raw`require\(\s*${PAQUETE}\s*\)`, "g"),
    ];
    for (const patron of importsDeValor) {
      expect(sesion.match(patron), `import de valor del vault: ${patron}`).toBeNull();
    }

    expect(sesion).toMatch(new RegExp(String.raw`import\s+type\s+\{[^}]*\}\s+from\s+${PAQUETE}`));
  });

  it("carga el vault con import() dentro de abrirSesion, no al cargar el modulo", () => {
    const cuerpo = sesion.slice(sesion.indexOf("async function abrirSesion"));
    const finDelCuerpo = cuerpo.indexOf("\n  }");

    expect(cuerpo.slice(0, finDelCuerpo)).toContain('await import("@letra-grande/vault")');
    // Un import() a nivel de modulo cargaria el vault al arrancar el shell, que
    // es justo la regresion que esto impide.
    const antesDeAbrir = sesion.slice(0, sesion.indexOf("async function abrirSesion"));
    expect(antesDeAbrir).not.toContain('import("@letra-grande/vault")');
  });
});

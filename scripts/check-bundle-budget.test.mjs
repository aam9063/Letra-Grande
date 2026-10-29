import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";
import { comprobarCaminoCritico, comprobarPresupuesto, leerPresupuesto, medirPrimeraCarga } from "./check-bundle-budget.mjs";

// Salida de build sintética: cada HTML de apps/web/.next/server/app es una ruta
// prerenderizada y solo cuentan los <script src="/_next/...js"> que referencia.
// No se usa un build real porque un test que depende de `next build` tarda
// minutos y cambia con cada PR de otro carril.
function buildSintetico(ficheros) {
  const dir = mkdtempSync(join(tmpdir(), "lg-bundle-"));
  for (const [ruta, contenido] of Object.entries(ficheros)) {
    const destino = join(dir, ruta);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, contenido);
  }
  return dir;
}

function htmlConScripts(...srcs) {
  const etiquetas = srcs.map((src) => `<script src="${src}" defer></script>`).join("");
  return `<!doctype html><html><body>${etiquetas}</body></html>`;
}

function chunk(dir, nombre, contenido) {
  const destino = join(dir, ".next", nombre);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, contenido);
  return gzipSync(contenido).length;
}

function conBuild(ficheros, fn) {
  const dir = buildSintetico(ficheros);
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const PRESUPUESTO = {
  porRuta: { "/": 1000, "/hoy": 2000 },
  totalGzip: 3000,
  caminoCritico: { prohibidos: ["tesseract", "pdfjs"] },
};

test("mide la primera carga en gzip sumando los scripts del HTML prerenderizado", () => {
  conBuild(
    {
      ".next/server/app/index.html": htmlConScripts("/_next/static/chunks/a.js"),
      ".next/server/app/hoy.html": htmlConScripts(
        "/_next/static/chunks/a.js",
        "/_next/static/chunks/b.js",
      ),
    },
    (dir) => {
      const a = chunk(dir, "static/chunks/a.js", "const a = 1;".repeat(50));
      const b = chunk(dir, "static/chunks/b.js", "const b = 2;".repeat(80));

      const medidas = medirPrimeraCarga({ buildDir: join(dir, ".next") });

      assert.deepEqual(Object.keys(medidas.rutas).sort(), ["/", "/hoy"]);
      // index.html es la raíz y hereda el script compartido; /hoy suma los dos.
      assert.equal(medidas.rutas["/"].gzip, a);
      assert.equal(medidas.rutas["/hoy"].gzip, a + b);
      assert.equal(medidas.rutas["/hoy"].ficheros.length, 2);
    },
  );
});

test("ignora las rutas internas de Next y las que no son HTML", () => {
  conBuild(
    {
      ".next/server/app/index.html": htmlConScripts("/_next/static/chunks/a.js"),
      ".next/server/app/_not-found.html": htmlConScripts("/_next/static/chunks/a.js"),
      ".next/server/app/_global-error.html": htmlConScripts("/_next/static/chunks/a.js"),
      ".next/server/app/hoy.meta": "no es html",
    },
    (dir) => {
      chunk(dir, "static/chunks/a.js", "const a = 1;");

      const medidas = medirPrimeraCarga({ buildDir: join(dir, ".next") });

      assert.deepEqual(Object.keys(medidas.rutas), ["/"]);
    },
  );
});

test("una ruta anidada conserva su ruta completa", () => {
  conBuild(
    {
      ".next/server/app/carpeta/factura.html": htmlConScripts("/_next/static/chunks/a.js"),
    },
    (dir) => {
      chunk(dir, "static/chunks/a.js", "const a = 1;");

      const medidas = medirPrimeraCarga({ buildDir: join(dir, ".next") });

      assert.deepEqual(Object.keys(medidas.rutas), ["/carpeta/factura"]);
    },
  );
});

test("cumple cuando todas las rutas y el total están dentro del presupuesto", () => {
  conBuild(
    {
      ".next/server/app/index.html": htmlConScripts("/_next/static/chunks/a.js"),
      ".next/server/app/hoy.html": htmlConScripts("/_next/static/chunks/a.js"),
    },
    (dir) => {
      chunk(dir, "static/chunks/a.js", "const a = 1;");
      const medidas = medirPrimeraCarga({ buildDir: join(dir, ".next") });

      const resultado = comprobarPresupuesto({ medidas, presupuesto: PRESUPUESTO });

      assert.equal(resultado.status, "pass");
      assert.deepEqual(resultado.violaciones, []);
    },
  );
});

test("falla y nombra la ruta cuando una ruta supera su presupuesto", () => {
  conBuild(
    {
      ".next/server/app/index.html": htmlConScripts("/_next/static/chunks/a.js"),
      ".next/server/app/hoy.html": htmlConScripts("/_next/static/chunks/a.js"),
    },
    (dir) => {
      chunk(dir, "static/chunks/a.js", "const a = 1;".repeat(500));
      const medidas = medirPrimeraCarga({ buildDir: join(dir, ".next") });

      const resultado = comprobarPresupuesto({
        medidas,
        presupuesto: { ...PRESUPUESTO, porRuta: { "/": 10, "/hoy": 10 } },
      });

      assert.equal(resultado.status, "fail");
      assert.match(resultado.message, /\/hoy/);
      assert.match(resultado.message, /presupuesto/);
    },
  );
});

test("falla cuando una ruta nueva no tiene presupuesto declarado", () => {
  conBuild(
    {
      ".next/server/app/index.html": htmlConScripts("/_next/static/chunks/a.js"),
      ".next/server/app/nueva.html": htmlConScripts("/_next/static/chunks/a.js"),
    },
    (dir) => {
      chunk(dir, "static/chunks/a.js", "const a = 1;");
      const medidas = medirPrimeraCarga({ buildDir: join(dir, ".next") });

      const resultado = comprobarPresupuesto({
        medidas,
        presupuesto: { ...PRESUPUESTO, porRuta: { "/": 1000 } },
      });

      assert.equal(resultado.status, "fail");
      assert.match(resultado.message, /\/nueva/);
      assert.match(resultado.message, /budget\.json/);
    },
  );
});

test("falla cuando falta el HTML de una ruta presupuestada", () => {
  conBuild({ ".next/server/app/index.html": htmlConScripts("/_next/static/chunks/a.js") }, (dir) => {
    chunk(dir, "static/chunks/a.js", "const a = 1;");
    const medidas = medirPrimeraCarga({ buildDir: join(dir, ".next") });

    const resultado = comprobarPresupuesto({ medidas, presupuesto: PRESUPUESTO });

    assert.equal(resultado.status, "fail");
    assert.match(resultado.message, /\/hoy/);
  });
});

test("falla cuando el total de gzip supera el total presupuestado", () => {
  conBuild(
    {
      ".next/server/app/index.html": htmlConScripts("/_next/static/chunks/a.js"),
      ".next/server/app/hoy.html": htmlConScripts("/_next/static/chunks/b.js"),
    },
    (dir) => {
      chunk(dir, "static/chunks/a.js", "const a = 1;");
      chunk(dir, "static/chunks/b.js", "const b = 2;");
      const medidas = medirPrimeraCarga({ buildDir: join(dir, ".next") });

      const resultado = comprobarPresupuesto({
        medidas,
        presupuesto: { ...PRESUPUESTO, porRuta: { "/": 1000, "/hoy": 1000 }, totalGzip: 1 },
      });

      assert.equal(resultado.status, "fail");
      assert.match(resultado.message, /total/i);
    },
  );
});

test("una salida de build ausente falla con un mensaje que dice qué hacer", () => {
  const dir = mkdtempSync(join(tmpdir(), "lg-bundle-vacio-"));
  try {
    const resultado = comprobarPresupuesto({
      medidas: medirPrimeraCarga({ buildDir: join(dir, ".next") }),
      presupuesto: PRESUPUESTO,
    });

    assert.equal(resultado.status, "fail");
    assert.match(resultado.message, /pnpm build/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("el camino crítico falla si un marcador prohibido aparece en la primera carga", () => {
  conBuild(
    {
      ".next/server/app/hoy.html": htmlConScripts("/_next/static/chunks/a.js"),
    },
    (dir) => {
      chunk(dir, "static/chunks/a.js", "const tesseract = require('tesseract.js');");
      const medidas = medirPrimeraCarga({ buildDir: join(dir, ".next") });

      const resultado = comprobarCaminoCritico({
        buildDir: join(dir, ".next"),
        medidas,
        prohibidos: PRESUPUESTO.caminoCritico.prohibidos,
      });

      assert.equal(resultado.status, "fail");
      assert.match(resultado.message, /tesseract/);
      assert.match(resultado.message, /\/hoy/);
    },
  );
});

test("el camino crítico cumple cuando ningún marcador aparece en la primera carga", () => {
  conBuild(
    {
      ".next/server/app/hoy.html": htmlConScripts("/_next/static/chunks/a.js"),
    },
    (dir) => {
      chunk(dir, "static/chunks/a.js", "const nombre = 'Letra Grande';");
      const medidas = medirPrimeraCarga({ buildDir: join(dir, ".next") });

      const resultado = comprobarCaminoCritico({
        buildDir: join(dir, ".next"),
        medidas,
        prohibidos: PRESUPUESTO.caminoCritico.prohibidos,
      });

      assert.equal(resultado.status, "pass");
    },
  );
});

test("falla cuando el HTML de una ruta no referencia ningun script", () => {
  // Si Next cambia la forma del HTML, el medidor no encuentra nada: una ruta de
  // 0 KiB no es un build perfecto, es una medida que no se hizo.
  conBuild({ ".next/server/app/hoy.html": "<!doctype html><html><body>sin scripts</body></html>" }, (dir) => {
    const medidas = medirPrimeraCarga({ buildDir: join(dir, ".next") });

    const resultado = comprobarPresupuesto({
      medidas,
      presupuesto: { ...PRESUPUESTO, porRuta: { "/hoy": 2000 } },
    });

    assert.equal(resultado.status, "fail");
    assert.match(resultado.message, /\/hoy/);
    assert.match(resultado.message, /no ha podido medir nada/);
  });
});

test("falla cuando una ruta referencia un chunk que no esta en la build", () => {
  conBuild(
    { ".next/server/app/hoy.html": htmlConScripts("/_next/static/chunks/falta.js") },
    (dir) => {
      const medidas = medirPrimeraCarga({ buildDir: join(dir, ".next") });

      const resultado = comprobarPresupuesto({
        medidas,
        presupuesto: { ...PRESUPUESTO, porRuta: { "/hoy": 2000 } },
      });

      assert.equal(resultado.status, "fail");
      assert.match(resultado.message, /falta\.js/);
    },
  );
});

// REF-QA-08-02: el bloque de polyfills va con noModule="" y un navegador que
// soporta módulos no lo descarga. Contarlo como primera carga inflaba cada ruta
// en 38.7 KiB gzip y regalaba ese margen a cualquier regresión real.
test("un script con noModule no suma a la primera carga y si al bloque legacy", () => {
  conBuild(
    {
      ".next/server/app/hoy.html": `<script src="/_next/static/chunks/a.js"></script><script src="/_next/static/chunks/polyfills.js" noModule=""></script>`,
    },
    (dir) => {
      const a = chunk(dir, "static/chunks/a.js", "const a = 1;");
      const polyfills = chunk(dir, "static/chunks/polyfills.js", "var legacy = 1;".repeat(80));

      const medidas = medirPrimeraCarga({ buildDir: join(dir, ".next") });

      assert.equal(medidas.rutas["/hoy"].gzip, a, "el polyfill no cuenta como primera carga");
      assert.equal(medidas.rutas["/hoy"].legacyGzip, polyfills, "pero si se mide aparte");
      assert.deepEqual(
        medidas.rutas["/hoy"].ficheros.map((f) => f.src),
        ["/_next/static/chunks/a.js"],
      );
    },
  );
});

test("un script moderno sigue contando: la guarda no se afloja", () => {
  conBuild(
    { ".next/server/app/hoy.html": htmlConScripts("/_next/static/chunks/a.js") },
    (dir) => {
      const a = chunk(dir, "static/chunks/a.js", "const a = 1;".repeat(100));
      const medidas = medirPrimeraCarga({ buildDir: join(dir, ".next") });

      assert.equal(medidas.rutas["/hoy"].gzip, a);
      assert.equal(medidas.rutas["/hoy"].legacyGzip, 0);
    },
  );
});

test("el bloque legacy tiene su propio limite y falla al superarse", () => {
  conBuild(
    {
      ".next/server/app/hoy.html": `<script src="/_next/static/chunks/a.js"></script><script src="/_next/static/chunks/polyfills.js" noModule=""></script>`,
    },
    (dir) => {
      chunk(dir, "static/chunks/a.js", "const a = 1;");
      chunk(dir, "static/chunks/polyfills.js", "var legacy = 1;".repeat(80));
      const medidas = medirPrimeraCarga({ buildDir: join(dir, ".next") });

      const excedido = comprobarPresupuesto({
        medidas,
        presupuesto: { ...PRESUPUESTO, porRuta: { "/hoy": 2000 }, maxLegacyGzipPorRuta: 10 },
      });
      assert.equal(excedido.status, "fail");
      assert.match(excedido.message, /legacy|polyfill/i);

      const dentro = comprobarPresupuesto({
        medidas,
        presupuesto: {
          ...PRESUPUESTO,
          porRuta: { "/hoy": 2000 },
          maxLegacyGzipPorRuta: 100000,
        },
      });
      assert.equal(dentro.status, "pass");
    },
  );
});

// El hallazgo del review de REF-QA-08-02: si el total presupuestado supera la
// suma de los maximos por ruta, la comprobacion del total no puede fallar y el
// crecimiento repartido entre rutas deja de estar vigilado. Este test es la
// guarda de esa relacion, no de unas cifras concretas.
test("el total presupuestado queda por debajo de la suma de maximos por ruta", () => {
  const presupuesto = leerPresupuesto();
  const suma = Object.values(presupuesto.porRuta).reduce((total, limite) => total + limite, 0);

  assert.ok(
    presupuesto.totalGzip < suma,
    `totalGzip (${presupuesto.totalGzip}) debe quedar por debajo de la suma de maximos por ruta (${suma})`,
  );
});

test("un chunk llamado nomodule no es legacy: el atributo manda, no el nombre", () => {
  conBuild(
    { ".next/server/app/hoy.html": htmlConScripts("/_next/static/chunks/page-nomodule-abc123.js") },
    (dir) => {
      const a = chunk(dir, "static/chunks/page-nomodule-abc123.js", "const a = 1;".repeat(50));

      const medidas = medirPrimeraCarga({ buildDir: join(dir, ".next") });

      assert.equal(medidas.rutas["/hoy"].gzip, a, "sin el atributo es primera carga");
      assert.equal(medidas.rutas["/hoy"].legacyGzip, 0);
    },
  );
});

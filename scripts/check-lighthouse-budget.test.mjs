import { test } from "node:test";
import assert from "node:assert/strict";
import { combinarInformes, comprobarLighthouse, mediana, normalizarRuta } from "./check-lighthouse-budget.mjs";

// Un informe de Lighthouse reducido a lo que se comprueba: categorías (0..1) y
// métricas de los audits, con valor numérico. Un informe real trae mucho más y
// nunca se versiona como fixture.
function informe({ categorias, metricas }) {
  const cats = {};
  for (const [nombre, score] of Object.entries(categorias)) cats[nombre] = { score };
  const audits = {};
  for (const [id, valor] of Object.entries(metricas)) audits[id] = { numericValue: valor };
  return { categories: cats, audits };
}

const PRESUPUESTO = {
  categorias: { performance: 0.85, accessibility: 1 },
  metricas: { "largest-contentful-paint": 4000, "total-blocking-time": 300 },
};

test("cumple cuando las categorías y métricas están dentro del presupuesto", () => {
  const resultado = comprobarLighthouse({
    ruta: "/hoy",
    informe: informe({
      categorias: { performance: 0.97, accessibility: 1 },
      metricas: { "largest-contentful-paint": 2100, "total-blocking-time": 30 },
    }),
    presupuesto: PRESUPUESTO,
  });

  assert.equal(resultado.status, "pass");
  assert.deepEqual(resultado.violaciones, []);
});

test("falla y nombra la categoría cuando baja del mínimo", () => {
  const resultado = comprobarLighthouse({
    ruta: "/hoy",
    informe: informe({
      categorias: { performance: 0.6, accessibility: 1 },
      metricas: { "largest-contentful-paint": 2100, "total-blocking-time": 30 },
    }),
    presupuesto: PRESUPUESTO,
  });

  assert.equal(resultado.status, "fail");
  assert.match(resultado.message, /performance/);
  assert.match(resultado.message, /\/hoy/);
});

test("falla y nombra la métrica cuando supera el máximo", () => {
  const resultado = comprobarLighthouse({
    ruta: "/hoy",
    informe: informe({
      categorias: { performance: 0.97, accessibility: 1 },
      metricas: { "largest-contentful-paint": 2100, "total-blocking-time": 1400 },
    }),
    presupuesto: PRESUPUESTO,
  });

  assert.equal(resultado.status, "fail");
  assert.match(resultado.message, /total-blocking-time/);
});

test("una categoría que falta en el informe falla en vez de darse por buena", () => {
  const resultado = comprobarLighthouse({
    ruta: "/hoy",
    informe: informe({
      categorias: { performance: 0.97 },
      metricas: { "largest-contentful-paint": 2100, "total-blocking-time": 30 },
    }),
    presupuesto: PRESUPUESTO,
  });

  assert.equal(resultado.status, "fail");
  assert.match(resultado.message, /accessibility/);
});

test("una métrica que falta en el informe falla en vez de darse por buena", () => {
  const resultado = comprobarLighthouse({
    ruta: "/hoy",
    informe: informe({
      categorias: { performance: 0.97, accessibility: 1 },
      metricas: { "largest-contentful-paint": 2100 },
    }),
    presupuesto: PRESUPUESTO,
  });

  assert.equal(resultado.status, "fail");
  assert.match(resultado.message, /total-blocking-time/);
});

test("una categoría marcada como no aplicable (null) falla: no se mide, no se aprueba", () => {
  const resultado = comprobarLighthouse({
    ruta: "/hoy",
    informe: { categories: { performance: { score: null }, accessibility: { score: 1 } }, audits: {} },
    presupuesto: { categorias: { performance: 0.85 }, metricas: {} },
  });

  assert.equal(resultado.status, "fail");
  assert.match(resultado.message, /performance/);
});

test("normaliza la ruta que Git Bash convierte en ruta de Windows", () => {
  // En Linux (la CI) el argumento llega intacto; en Git Bash llega con prefijo.
  assert.equal(normalizarRuta("/hoy"), "/hoy");
  assert.equal(normalizarRuta("C:/Program Files/Git/hoy"), "/hoy");
  assert.equal(normalizarRuta("C:/Program Files/Git/"), "/");
});

test("cumulative-layout-shift no se anuncia en milisegundos", () => {
  // "0 ms" con un CLS de 0.09 confunde: la métrica no tiene unidad.
  const resultado = comprobarLighthouse({
    ruta: "/hoy",
    informe: informe({ categorias: { performance: 0.97 }, metricas: { "cumulative-layout-shift": 0.09 } }),
    presupuesto: { categorias: { performance: 0.85 }, metricas: { "cumulative-layout-shift": 0.05 } },
  });

  assert.equal(resultado.status, "fail");
  assert.match(resultado.message, /0\.090/);
  assert.doesNotMatch(resultado.message, /0 ms/);
});

test("la mediana de un numero impar de valores es el del medio", () => {
  assert.equal(mediana([329, 12, 40]), 40);
  assert.equal(mediana([7]), 7);
});

test("la mediana de un numero par de valores promedia los dos del medio", () => {
  assert.equal(mediana([10, 20, 30, 40]), 25);
  assert.equal(mediana([1, 2]), 1.5);
});

test("la mediana ignora una corrida atipica en vez de dejar que decida", () => {
  // Caso real de la CI: TBT de 329 ms en una corrida y decenas en las otras.
  assert.equal(mediana([329, 28, 35]), 35);
});

test("combinar informes toma la mediana de categorias y metricas de todas las corridas", () => {
  const corridas = [
    informe({ categorias: { performance: 0.9 }, metricas: { "total-blocking-time": 300 } }),
    informe({ categorias: { performance: 0.98 }, metricas: { "total-blocking-time": 20 } }),
    informe({ categorias: { performance: 0.99 }, metricas: { "total-blocking-time": 30 } }),
  ];

  const combinado = combinarInformes(corridas);

  assert.equal(combinado.categories.performance.score, 0.98);
  assert.equal(combinado.audits["total-blocking-time"].numericValue, 30);
});

test("si una metrica falta en una corrida, se combinan las que si la midieron", () => {
  const corridas = [
    informe({ categorias: { performance: 0.9 }, metricas: { "total-blocking-time": 300 } }),
    informe({ categorias: { performance: 0.98 }, metricas: {} }),
    informe({ categorias: { performance: 0.99 }, metricas: { "total-blocking-time": 30 } }),
  ];

  const combinado = combinarInformes(corridas);

  // Dos medidas: 300 y 30. Mediana de dos: 165. La que falta no cuenta como 0.
  assert.equal(combinado.audits["total-blocking-time"].numericValue, 165);
});

test("si ninguna corrida mide una metrica, el combinado no la inventa", () => {
  const corridas = [
    informe({ categorias: { performance: 0.9 }, metricas: {} }),
    informe({ categorias: { performance: 0.98 }, metricas: {} }),
  ];

  const combinado = combinarInformes(corridas);

  assert.equal(combinado.audits["total-blocking-time"], undefined);
  const resultado = comprobarLighthouse({
    ruta: "/hoy",
    informe: combinado,
    presupuesto: { categorias: {}, metricas: { "total-blocking-time": 300 } },
  });
  assert.equal(resultado.status, "fail");
});

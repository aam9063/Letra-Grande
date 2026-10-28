import { test } from "node:test";
import assert from "node:assert/strict";
import { medirConReintentos, mensajeSinMedida } from "./lighthouse-reintentos.mjs";

// Caso real que motivó esto (PR #76): Lighthouse no arranca Chrome en `/` y sí
// en `/hoy`, en el mismo job. El reintento tiene que salvarlo sin tapar la falta
// de medida cuando no hay forma.

test("un intento que funciona da su resultado sin reintentar", async () => {
  let llamadas = 0;
  const resultado = await medirConReintentos({
    medir: async () => {
      llamadas += 1;
      return { ok: true };
    },
    intentos: 3,
  });

  assert.deepEqual(resultado, { ok: true });
  assert.equal(llamadas, 1);
});

test("un arranque fallido se reintenta y la segunda vez mide", async () => {
  let llamadas = 0;
  const avisos = [];
  const resultado = await medirConReintentos({
    medir: async () => {
      llamadas += 1;
      if (llamadas === 1) throw new Error("waiting for dynamic debugging port in chrome-err.log");
      return { ok: true };
    },
    intentos: 2,
    avisar: (intento) => avisos.push(intento),
  });

  assert.deepEqual(resultado, { ok: true });
  assert.equal(llamadas, 2);
  assert.deepEqual(avisos, [1], "el intento fallido se avisa para que quede en el log de la CI");
});

test("si no consigue medir en ningún intento, falla en vez de aprobar", async () => {
  let llamadas = 0;
  await assert.rejects(
    medirConReintentos({
      medir: async () => {
        llamadas += 1;
        throw new Error("sin navegador");
      },
      intentos: 3,
    }),
    /sin navegador/,
  );
  assert.equal(llamadas, 3);
});

test("un numero de intentos invalido no deja el job sin medir", async () => {
  for (const intentos of [0, -1, Number.NaN, undefined]) {
    let llamadas = 0;
    await medirConReintentos({
      medir: async () => {
        llamadas += 1;
        return "medido";
      },
      intentos,
    });
    assert.equal(llamadas, 1, `con intentos=${String(intentos)} se mide al menos una vez`);
  }
});

test("el mensaje de fallo dice que es infraestructura y no un presupuesto", () => {
  const mensaje = mensajeSinMedida({
    ruta: "/",
    intentos: 2,
    error: new Error("waiting for dynamic debugging port in chrome-err.log\nat checkReady"),
  });

  assert.match(mensaje, /No se pudo medir \//);
  assert.match(mensaje, /2 intento/);
  assert.match(mensaje, /waiting for dynamic debugging port/);
  // Solo la primera línea del error: el stack no aporta en el log del job.
  assert.doesNotMatch(mensaje, /at checkReady/);
  assert.match(mensaje, /infraestructura, no un presupuesto/);
});

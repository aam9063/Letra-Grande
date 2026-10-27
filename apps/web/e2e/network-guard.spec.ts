import { expect, test } from "@playwright/test";
import {
  guardNetwork,
  motivosDePeticion,
  motivosDeSocket,
  origenesPermitidos,
} from "./helpers/network-guard";

// El guardián solo sirve si detecta de verdad: este spec comprueba que anota
// peticiones a orígenes ajenos y cuerpos con datos personales, y que no da
// falsos positivos con lo que es del propio origen y no lleva datos.
test("detecta un origen ajeno y un documento en el cuerpo", async ({ page, baseURL }) => {
  const violaciones = guardNetwork(page, origenesPermitidos(baseURL!));

  // Origen ajeno interceptado: la petición se registra sin salir a la red real.
  await page.route("https://terceros.ejemplo.test/**", (route) =>
    route.fulfill({ status: 200, body: "ok" }),
  );

  // Origen propio: el guardián no debe dar falsos positivos con la portada.
  await page.goto("/");

  const cuerpo = JSON.stringify({ documento: "12345678Z", nombre: "Ana Ejemplo" });
  await page.evaluate(async (dato) => {
    await fetch("https://terceros.ejemplo.test/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: dato,
    });
  }, cuerpo);

  // Dos violaciones, ni una más: la del origen ajeno y la del documento en el cuerpo.
  expect(violaciones).toEqual([
    expect.stringContaining("Origen no permitido: POST https://terceros.ejemplo.test/api"),
    expect.stringContaining("Posible documento en el cuerpo de POST /api"),
  ]);
});

test("un cuerpo limpio y un origen permitido no son violación", () => {
  const permitidos = origenesPermitidos("http://localhost:3100");

  expect(motivosDePeticion("http://localhost:3100/hoy", "GET", null, permitidos)).toEqual([]);
  expect(
    motivosDePeticion(
      "http://localhost:3100/api/assistant",
      "POST",
      JSON.stringify({ texto: "Explícame una cláusula de permanencia." }),
      permitidos,
    ),
    "un texto sin datos personales no debe dar violación",
  ).toEqual([]);
});

test("la lista de orígenes permitidos solo añade el de la app y los declarados", () => {
  expect(origenesPermitidos("http://localhost:3100/")).toEqual(["http://localhost:3100"]);
  expect(origenesPermitidos("http://localhost:3100", ["https://ejemplo.test/x"])).toEqual([
    "http://localhost:3100",
    "https://ejemplo.test",
  ]);
});

test("un IBAN en el cuerpo también es violación, no solo un documento", () => {
  const permitidos = origenesPermitidos("http://localhost:3100");

  expect(
    motivosDePeticion(
      "http://localhost:3100/api/assistant",
      "POST",
      JSON.stringify({ texto: "Cóbralo en ES91 2100 0418 4502 0005 1332." }),
      permitidos,
    ),
  ).toEqual([expect.stringContaining("Posible iban en el cuerpo de POST /api/assistant")]);
});

test("un WebSocket a un origen ajeno es violación y uno propio no", () => {
  const permitidos = origenesPermitidos("http://localhost:3100");

  // En las pruebas la app va por http: un ws al mismo host es del propio
  // servidor y un wss a un servidor http no lo es.
  expect(motivosDeSocket("ws://localhost:3100/hoy", permitidos)).toEqual([]);
  expect(motivosDeSocket("wss://localhost:3100/hoy", permitidos)).toEqual([
    "Origen no permitido: WebSocket wss://localhost:3100",
  ]);
  // En producción la app va por https, y ahí sí vale el wss del mismo host.
  expect(motivosDeSocket("wss://ejemplo.test/socket", origenesPermitidos("https://ejemplo.test"))).toEqual([]);
  expect(motivosDeSocket("wss://terceros.ejemplo.test/socket", permitidos)).toEqual([
    "Origen no permitido: WebSocket wss://terceros.ejemplo.test",
  ]);
});

import { expect, test } from "@playwright/test";
import { guardNetwork } from "./helpers/network-guard";

// El guardián solo sirve si detecta de verdad: este spec comprueba que anota
// peticiones a orígenes ajenos y cuerpos con datos personales. Si alguna
// detección dejara de funcionar, el test tiene que ponerse en rojo.
test("el guardián de red detecta un origen ajeno y un documento en el cuerpo", async ({
  page,
  baseURL,
}) => {
  const violations = guardNetwork(page, [baseURL!]);

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
  expect(violations).toEqual([
    expect.stringContaining("Origen no permitido: POST https://terceros.ejemplo.test/api"),
    expect.stringContaining("Posible documento en el cuerpo de POST /api"),
  ]);
});

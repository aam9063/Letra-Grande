import { expect, test } from "@playwright/test";
import { origenesPermitidos, vigilarRed } from "./helpers/network-guard";

// Auditoría de privacidad (QA-01): la app recorre sus rutas principales con el
// guardián puesto y no puede salir del propio origen ni mandar datos personales.
const RUTAS = ["/", "/hoy", "/ajustes", "/carpeta", "/onboarding"];

test("las rutas principales no hablan con ningún origen ajeno ni mandan datos personales", async ({
  context,
  baseURL,
}) => {
  const vigilancia = vigilarRed(context, origenesPermitidos(baseURL!));

  for (const ruta of RUTAS) {
    const page = await context.newPage();
    await page.goto(ruta, { waitUntil: "load" });
    await page.close();
  }

  // Un guardián que no ve nada daría verde siempre: que haya visto algo.
  expect(
    vigilancia.peticiones,
    "el guardián no ha visto ninguna petición: el test no probaría nada",
  ).toBeGreaterThan(0);
  expect(vigilancia.violaciones).toEqual([]);
});

test("el guardián ve las peticiones de otras páginas del mismo contexto", async ({
  context,
  baseURL,
}) => {
  // Este es el hueco de REF-OPS-04: mirar solo la página deja fuera lo que
  // piden otras pestañas y el service worker.
  const vigilancia = vigilarRed(context, origenesPermitidos(baseURL!));
  await context.route("https://terceros.ejemplo.test/**", (route) =>
    route.fulfill({ status: 200, body: "ok" }),
  );

  const primera = await context.newPage();
  await primera.goto("/hoy");

  // Una navegación de la segunda página a un origen ajeno: es la petición más
  // fiable en los tres motores, y prueba lo mismo, que el guardián mira el
  // contexto entero y no solo la pestaña que abrió el test.
  const segunda = await context.newPage();
  await segunda.goto("https://terceros.ejemplo.test/");

  expect(vigilancia.violaciones).toEqual([
    expect.stringContaining("Origen no permitido: GET https://terceros.ejemplo.test/"),
  ]);
});

test("el guardián ve las peticiones del service worker donde el navegador lo expone", async ({
  context,
  baseURL,
  browserName,
}) => {
  // Medido: la app registra el service worker en los cuatro navegadores de la
  // suite, pero Playwright solo lo expone en Chromium (Firefox y WebKit lo
  // registran y no lo publican, así que sus peticiones no se pueden atribuir).
  test.skip(browserName !== "chromium", "Playwright solo expone el service worker en Chromium");

  const vigilancia = vigilarRed(context, origenesPermitidos(baseURL!));
  const page = await context.newPage();
  await page.goto("/hoy", { waitUntil: "load" });

  // Espera a que el service worker esté activo y sirve la recarga.
  await page.waitForFunction(async () => {
    const registro = await navigator.serviceWorker.getRegistration();
    return registro?.active !== null && registro?.active !== undefined;
  });
  await page.reload({ waitUntil: "load" });

  expect(
    vigilancia.delServiceWorker.length,
    "el service worker no ha pedido nada: el guardián no lo estaría viendo",
  ).toBeGreaterThan(0);
  expect(vigilancia.violaciones).toEqual([]);
});

test("el guardián anota un documento en el cuerpo de una petición del propio origen", async ({
  context,
  baseURL,
}) => {
  const vigilancia = vigilarRed(context, origenesPermitidos(baseURL!));
  const page = await context.newPage();
  await page.goto("/hoy");

  await page.evaluate(async () => {
    await fetch("/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ texto: "Mi documento es 12345678Z, revisad la factura." }),
    });
  });

  expect(vigilancia.violaciones).toEqual([
    expect.stringContaining("Posible documento en el cuerpo de POST /api/assistant"),
  ]);
});

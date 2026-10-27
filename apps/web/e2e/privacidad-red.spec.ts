import { expect, test } from "@playwright/test";
import { guardNetwork, origenesPermitidos } from "./helpers/network-guard";

// Auditoría de privacidad (QA-01): la app recorre sus rutas principales con el
// guardián puesto y no puede salir del propio origen ni mandar datos personales.
const RUTAS = ["/", "/hoy", "/ajustes", "/carpeta", "/onboarding"];

test("las rutas principales no hablan con ningún origen ajeno ni mandan datos personales", async ({
  context,
  baseURL,
}) => {
  const violaciones = guardNetwork(context, origenesPermitidos(baseURL!));
  let peticionesVistas = 0;
  context.on("request", () => {
    peticionesVistas += 1;
  });

  for (const ruta of RUTAS) {
    const page = await context.newPage();
    await page.goto(ruta, { waitUntil: "load" });
    await page.close();
  }

  // Un guardián que no ve nada daría verde siempre: que haya visto algo.
  expect(
    peticionesVistas,
    "el guardián no ha visto ninguna petición: el test no probaría nada",
  ).toBeGreaterThan(0);
  expect(violaciones).toEqual([]);
});

test("el guardián ve también las peticiones de otras páginas del mismo contexto", async ({
  context,
  baseURL,
}) => {
  // Este es el hueco de REF-OPS-04: mirar solo la página deja fuera lo que
  // piden otras pestañas y el service worker.
  const violaciones = guardNetwork(context, origenesPermitidos(baseURL!));
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

  expect(violaciones).toEqual([
    expect.stringContaining("Origen no permitido: GET https://terceros.ejemplo.test/"),
  ]);
});

test("el guardián anota un documento en el cuerpo de una petición del propio origen", async ({
  context,
  baseURL,
}) => {
  const violaciones = guardNetwork(context, origenesPermitidos(baseURL!));
  const page = await context.newPage();
  await page.goto("/hoy");

  await page.evaluate(async () => {
    await fetch("/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ texto: "Mi documento es 12345678Z, revisad la factura." }),
    });
  });

  expect(violaciones).toEqual([expect.stringContaining("Posible documento en el cuerpo de POST /api/assistant")]);
});

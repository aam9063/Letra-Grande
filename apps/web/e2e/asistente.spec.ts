import { expect, test } from "@playwright/test";

// Asistente (AI-03): preguntar, ver los bloques con su cita y ver el estado
// vacío honesto. El servidor corre con AI_PROVIDER=mock, que es determinista.
//
// Lo que la cadena real con el mock puede y no puede dar (verificado con
// sondas contra el servidor en dev y en producción):
//
// - La tabla fija del mock responde con texto plano, y el proxy solo acepta el
//   JSON del catálogo cerrado de bloques (AI-02). El reintento del handler añade
//   el prompt de corrección como último mensaje y el mock, que solo lee el
//   último mensaje, no encuentra la pregunta y lanza LlmError: la cadena real
//   con el mock acaba en 503, no en outOfScope. Ese comportamiento se ancla en
//   el segundo test: ejercita el traductor de errores de la pantalla de punta a
//   punta. La incompatibilidad mock/reintento queda registrada en
//   odd/tasks/ai-03-chat.md para decisión posterior (con un proveedor real como
//   nan el reintento sí funciona y degrada a outOfScope).
//
// - Por eso los dos casos de respuesta (bloques y outOfScope) se prueban
//   interceptando POST /api/assistant y respondiendo con el mismo cuerpo que
//   produce el proxy real (AssistantOkBody y el fallback outOfScope): así el
//   spec prueba la pantalla completa con las dos formas que puede devolver el
//   endpoint. Los DNI de los tests son ficticios y nunca salen del navegador
//   sin enmascarar: el primer test lo comprueba sobre la petición interceptada.

const FUENTE = {
  titulo: "Comercialización y suministro eléctrico | CNMC",
  url: "https://www.cnmc.es/facil-para-ti/que-hace-la-cnmc-para-consumidores/comercializacion-y-suministro-electrico",
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("lg-onboarding-hecho", "1");
    // Sin service worker en estas pruebas: en WebKit, cualquier petición que
    // atraviesa el SW (aunque sw.js no responda a los POST, que deja pasar)
    // escapa a la intercepción de page.route, y el spec necesita sustituir
    // /api/assistant. El registro fallido lo captura ServiceWorkerRegistrar y
    // la app no lo nota.
    navigator.serviceWorker.register = () =>
      Promise.reject(new Error("sin service worker en las pruebas del asistente"));
  });
});

test("la pregunta sale enmascarada y la respuesta pinta los bloques con su cita", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 720 });

  await page.route("**/api/assistant", async (route) => {
    const cuerpo = route.request().postDataJSON() as { question: string };
    // La pantalla debe enmascarar antes de enviar: el DNI ficticio no sale.
    expect(cuerpo.question).toContain("{{documento_1}}");
    expect(cuerpo.question).not.toContain("12345678Z");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        answer: {
          question: cuerpo.question,
          outOfScope: false,
          blocks: [
            {
              kind: "fact",
              claim: "La empresa tiene que contestar en un máximo de quince días hábiles.",
              citations: [{ sourceId: "cnmc-electrico", quote: "quince días hábiles" }],
            },
          ],
        },
        fuentes: { "cnmc-electrico": FUENTE },
      }),
    });
  });

  await page.goto("/asistente");
  // Webkit necesita la página asentada antes de interactuar: fill antes de la
  // hidratación deja el estado de React sin actualizar y el botón sin habilitar.
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Tu pregunta").fill("Mi DNI es 12345678Z, ¿cuánto tardan en contestar?");
  await page.getByRole("button", { name: "Enviar pregunta" }).click();

  // La pregunta queda en la lista tal como la escribió la persona.
  await expect(page.getByText("Mi DNI es 12345678Z, ¿cuánto tardan en contestar?")).toBeVisible();
  await expect(
    page.getByText("La empresa tiene que contestar en un máximo de quince días hábiles."),
  ).toBeVisible();
  const cita = page.getByRole("link", { name: FUENTE.titulo });
  await expect(cita).toBeVisible();
  await expect(cita).toHaveAttribute("href", FUENTE.url);
});

test("la respuesta sin fuentes pinta el estado vacío honesto", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });

  // Cuerpo exacto del fallback outOfScope que produce el proxy real (AI-02)
  // cuando ninguna respuesta del modelo valida contra las fuentes.
  await page.route("**/api/assistant", async (route) => {
    const cuerpo = route.request().postDataJSON() as { question: string };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        answer: { question: cuerpo.question, outOfScope: true, blocks: [] },
        fuentes: {},
      }),
    });
  });

  await page.goto("/asistente");
  // Webkit necesita la página asentada antes de interactuar: fill antes de la
  // hidratación deja el estado de React sin actualizar y el botón sin habilitar.
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Tu pregunta").fill("¿Quién ganará mi reclamación?");
  await page.getByRole("button", { name: "Enviar pregunta" }).click();

  await expect(page.getByText(/No tengo una fuente para responder/)).toBeVisible();
  await expect(page.getByText(/oficina municipal de consumo/)).toBeVisible();
  await expect(page.getByText(/Fuente:/)).toHaveCount(0);
});

test("por la cadena real con el mock, un fallo del proveedor muestra el error explicado", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto("/asistente");
  // Webkit necesita la página asentada antes de interactuar: fill antes de la
  // hidratación deja el estado de React sin actualizar y el botón sin habilitar.
  await page.waitForLoadState("networkidle");

  // "hola" está en la tabla fija del mock, que responde prosa: el proxy la
  // rechaza, reintenta y el mock, que solo lee el último mensaje, lanza
  // LlmError. El handler degrada a 503 y la pantalla lo traduce. Sin
  // interceptar: es la cadena real de punta a punta.
  await page.getByLabel("Tu pregunta").fill("hola");
  await page.getByRole("button", { name: "Enviar pregunta" }).click();

  await expect(
    page.getByText("El asistente no está disponible ahora mismo. Prueba de nuevo más tarde."),
  ).toBeVisible();
  await expect(page.getByText(/Fuente:/)).toHaveCount(0);
});

test("la página del asistente no tiene scroll horizontal a 375 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto("/asistente");
  // Webkit necesita la página asentada antes de interactuar: fill antes de la
  // hidratación deja el estado de React sin actualizar y el botón sin habilitar.
  await page.waitForLoadState("networkidle");

  const desbordamiento = await page.evaluate(() => {
    const documento = document.scrollingElement ?? document.documentElement;
    return documento.scrollWidth - document.documentElement.clientWidth;
  });

  expect(desbordamiento).toBeLessThanOrEqual(0);
});

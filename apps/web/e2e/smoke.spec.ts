import { expect, test } from "@playwright/test";

// La landing es la portada pública de Letra Grande y debe funcionar en la build
// de producción: héroe, aviso de independencia y salida a la app, sin ninguna
// interacción previa.
test("la portada muestra el titular, el aviso de independencia y enlaza a la app", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /Los trámites, en letra grande/ }),
  ).toBeVisible();
  await expect(
    page.getByText(/No tiene relación con la Administración ni con ninguna de las empresas/),
  ).toBeVisible();

  const abrir = page.getByRole("link", { name: "Abrir Letra Grande" }).first();
  await expect(abrir).toHaveAttribute("href", "/hoy");
});

test("la landing no tiene scroll horizontal a 375 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto("/");

  const desbordamiento = await page.evaluate(() => {
    const documento = document.scrollingElement ?? document.documentElement;
    return documento.scrollWidth - document.documentElement.clientWidth;
  });

  expect(desbordamiento).toBeLessThanOrEqual(0);
});

test("las preguntas frecuentes se despliegan y muestran la respuesta", async ({ page }) => {
  await page.goto("/");

  const primera = page.getByRole("heading", { name: "Preguntas frecuentes" });
  await primera.scrollIntoViewIfNeeded();

  const detalle = page.locator("details").first();
  await detalle.locator("summary").click();

  await expect(detalle.locator("p")).toBeVisible();
});

import { expect, test } from "@playwright/test";

// El shell responsive (UI-04): barra flotante glass en móvil, sidebar en
// escritorio y hoja «Más» accesible. Se fija el viewport en cada prueba para
// que los cuatro proyectos de navegador midan lo mismo.
test("en móvil la barra flotante muestra cuatro destinos y Más abre la hoja", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto("/hoy");

  const barra = page.getByRole("navigation", { name: "Secciones" });
  await expect(barra).toBeVisible();
  const rutas = await barra.getByRole("link").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  expect(rutas).toEqual(["/hoy", "/asistente", "/carpeta", "/reclamar"]);

  // Objetivo táctil AA: ningún enlace de la barra baja de 44 px.
  const lados = await barra
    .getByRole("link")
    .evaluateAll((as) =>
      as.map((a) => {
        const caja = a.getBoundingClientRect();
        return Math.min(caja.width, caja.height);
      }),
    );
  for (const lado of lados) {
    expect(lado).toBeGreaterThanOrEqual(44);
  }

  await page.getByRole("button", { name: "Más" }).click();

  const hoja = page.getByRole("dialog", { name: "Más módulos" });
  await expect(hoja).toBeVisible();
  await expect(hoja.getByRole("link", { name: "Datos abiertos" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(hoja).toBeHidden();
});

test("en escritorio la sidebar sustituye a la barra flotante", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/hoy");

  const sidebar = page.getByRole("navigation", { name: "Principal" });
  await expect(sidebar).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Reclamar y bajas" })).toBeVisible();
  await expect(page.getByText("Carpeta cifrada.")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Secciones" })).toBeHidden();
});

test("la hoja Más lleva a Ajustes y a un módulo del grupo", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto("/hoy");

  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("dialog", { name: "Más módulos" }).getByRole("link", { name: "Ajustes" }).click();

  await expect(page).toHaveURL("/ajustes");
  await expect(page.getByRole("heading", { name: "Ajustes", exact: true })).toBeVisible();
});

test("el shell no tiene scroll horizontal a 375 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto("/hoy");

  const desbordamiento = await page.evaluate(() => {
    const documento = document.scrollingElement ?? document.documentElement;
    return documento.scrollWidth - document.documentElement.clientWidth;
  });

  expect(desbordamiento).toBeLessThanOrEqual(0);
});

import { expect, test } from "@playwright/test";

// Ajustes (UI-06): tamaño de letra funcional, borrado total con confirmación
// y página responsive. El onboarding ya se vio: la bandera es la misma de
// UI-05. Las contraseñas de los tests son ficticias.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lg-onboarding-hecho", "1"));
});

test("cambiar el tamaño de letra lo aplica al html y persiste tras recargar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto("/ajustes");

  await expect(page.getByRole("heading", { name: "Ajustes", exact: true })).toBeVisible();
  expect(await htmlFontSize(page)).toBe("100%");

  await page.getByRole("radio", { name: /Grande \(/ }).check();
  expect(await htmlFontSize(page)).toBe("112.5%");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Ajustes", exact: true })).toBeVisible();
  expect(await htmlFontSize(page)).toBe("112.5%");
  await expect(page.getByRole("radio", { name: /Grande \(/ })).toBeChecked();
});

test("el borrado con contraseña incorrecta muestra el error y no borra", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto("/ajustes");

  // Primera purga con la contraseña buena: crea el vault y lo purga. La app
  // queda como recién instalada y el tamaño vuelve a Normal.
  await page.getByRole("button", { name: "Borrar todos mis datos" }).click();
  await expect(page.getByText("Importante")).toBeVisible();
  await page.getByLabel("Contraseña de la carpeta").fill("clave-ficticia-correcta");
  await page.getByRole("button", { name: "Borrar todo definitivamente" }).click();
  await expect(page.getByText("Datos borrados")).toBeVisible();
  expect(await htmlFontSize(page)).toBe("100%");

  // Recarga: la sección vuelve a su estado inicial para repetir el flujo.
  await page.reload();
  await expect(page.getByRole("button", { name: "Borrar todos mis datos" })).toBeVisible();
  await page.getByRole("button", { name: "Borrar todos mis datos" }).click();
  await page.getByLabel("Contraseña de la carpeta").fill("clave-ficticia-erronea");
  await page.getByRole("button", { name: "Borrar todo definitivamente" }).click();

  await expect(page.getByText("La contraseña no es correcta.")).toBeVisible();
  await expect(page.getByText("Datos borrados")).toHaveCount(0);
});

test("la página de ajustes no tiene scroll horizontal a 375 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto("/ajustes");

  const desbordamiento = await page.evaluate(() => {
    const documento = document.scrollingElement ?? document.documentElement;
    return documento.scrollWidth - document.documentElement.clientWidth;
  });

  expect(desbordamiento).toBeLessThanOrEqual(0);
});

function htmlFontSize(page: import("@playwright/test").Page): Promise<string> {
  return page.evaluate(() => document.documentElement.style.fontSize || "100%");
}

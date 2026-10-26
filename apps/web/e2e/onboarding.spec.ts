import { expect, test } from "@playwright/test";

// Onboarding de primer arranque (UI-05): cada prueba arranca con un contexto
// nuevo, así que el onboarding está pendiente sin tocar nada.
test("la primera visita a la app salta al onboarding", async ({ page }) => {
  await page.goto("/hoy");

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { name: "Los trámites, claros" })).toBeVisible();
});

test("avanza por los cuatro pasos y termina en /hoy, donde no vuelve", async ({ page }) => {
  await page.goto("/onboarding");

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: /Por qué no ChatGPT/ })).toBeVisible();

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByText("datos tuyos han llegado a la IA")).toBeVisible();

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "Ponla en tu pantalla de inicio" })).toBeVisible();
  await expect(page.getByText("En iPhone", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page).toHaveURL(/\/hoy$/);

  await page.goto("/hoy");
  await expect(page).toHaveURL(/\/hoy$/);
  await expect(page.getByRole("heading", { name: "Hoy", exact: true })).toBeVisible();
});

test("Saltar lleva a /hoy y el onboarding no vuelve a aparecer", async ({ page }) => {
  await page.goto("/onboarding");

  await page.getByRole("button", { name: "Saltar" }).click();
  await expect(page).toHaveURL(/\/hoy$/);

  await page.reload();
  await expect(page).toHaveURL(/\/hoy$/);
});

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

  // Sin evento de instalación (Firefox, Safari de escritorio): solo la salida.
  await expect(page.getByRole("button", { name: "Ahora no" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Instalar la app" })).toBeHidden();
  await page.getByRole("button", { name: "Ahora no" }).click();
  await expect(page).toHaveURL(/\/hoy$/);

  await page.goto("/hoy");
  await expect(page).toHaveURL(/\/hoy$/);
  await expect(page.getByRole("heading", { name: "Hoy", exact: true })).toBeVisible();
});

test("con beforeinstallprompt, el paso final ofrece instalar", async ({ page }) => {
  await page.goto("/onboarding");

  // Un clic de React (hidratación completa) antes de lanzar el evento: en
  // WebKit el HTML estático es visible antes de que los oyentes existan.
  await page.getByRole("button", { name: "Siguiente" }).click();

  await page.evaluate(() => {
    const evento = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    evento.prompt = () => Promise.resolve();
    evento.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(evento);
  });

  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("button", { name: "Instalar la app" })).toBeVisible();
});

test("el onboarding no tiene scroll horizontal a 375 px en ningún paso", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto("/onboarding");

  for (let i = 0; i < 4; i++) {
    const desbordamiento = await page.evaluate(() => {
      const documento = document.scrollingElement ?? document.documentElement;
      return documento.scrollWidth - document.documentElement.clientWidth;
    });
    expect(desbordamiento).toBeLessThanOrEqual(0);

    const siguiente = page.getByRole("button", { name: "Siguiente" });
    if (await siguiente.isVisible()) {
      await siguiente.click();
    }
  }
});

test("Saltar lleva a /hoy y el onboarding no vuelve a aparecer", async ({ page }) => {
  await page.goto("/onboarding");

  await page.getByRole("button", { name: "Saltar" }).click();
  await expect(page).toHaveURL(/\/hoy$/);

  await page.reload();
  await expect(page).toHaveURL(/\/hoy$/);
});

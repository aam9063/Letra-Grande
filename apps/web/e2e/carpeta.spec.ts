import { expect, test, type Page } from "@playwright/test";
import { guardNetwork } from "./helpers/network-guard";

// Carpeta privada (UI-07): crear, desbloquear y bloquear. El vault es local:
// con el guard de red comprobamos que no sale nada del dispositivo. Las
// contraseñas de los tests son ficticias.
const CLAVE = "frase-larga-de-prueba";
const CLAVE_OTRA = "otra-frase-larga-de-prueba";

test.beforeEach(async ({ page }) => {
  // El onboarding ya se vio: la bandera es la misma de UI-05 y UI-06.
  await page.addInitScript(() => localStorage.setItem("lg-onboarding-hecho", "1"));
});

async function crearCarpeta(page: Page): Promise<void> {
  await page.goto("/carpeta");
  await page.getByLabel("Contraseña", { exact: true }).fill(CLAVE);
  await page.getByLabel("Repite la contraseña").fill(CLAVE);
  await page.getByLabel("Entiendo que no se puede recuperar").check();
  await page.getByRole("button", { name: "Crear carpeta" }).click();
  await expect(page.getByRole("heading", { name: "Tu carpeta está abierta" })).toBeVisible();
}

function sinScrollHorizontal(page: Page): Promise<number> {
  return page.evaluate(() => {
    const documento = document.scrollingElement ?? document.documentElement;
    return documento.scrollWidth - document.documentElement.clientWidth;
  });
}

test("crear con contraseñas distintas avisa; con la misma deja la carpeta abierta", async ({
  page,
}) => {
  const violaciones = guardNetwork(page, [process.env.baseURL ?? "http://localhost:3100"]);
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto("/carpeta");

  await expect(page.getByRole("heading", { name: "Crea tu carpeta privada" })).toBeVisible();
  await expect(
    page.getByText("Aquí guardarás tus facturas, contratos y cartas. Solo tú podrás abrirla."),
  ).toBeVisible();

  await page.getByLabel("Contraseña", { exact: true }).fill(CLAVE);
  await page.getByLabel("Repite la contraseña").fill(CLAVE_OTRA);
  await page.getByLabel("Entiendo que no se puede recuperar").check();
  await page.getByRole("button", { name: "Crear carpeta" }).click();

  await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tu carpeta está abierta" })).toHaveCount(0);

  await page.getByLabel("Repite la contraseña").fill(CLAVE);
  await page.getByRole("button", { name: "Crear carpeta" }).click();

  await expect(page.getByRole("heading", { name: "Tu carpeta está abierta" })).toBeVisible();
  expect(violaciones).toEqual([]);
});

test("bloquear desde la sidebar pide la contraseña y desbloquear con error honesto", async ({
  page,
}) => {
  const violaciones = guardNetwork(page, [process.env.baseURL ?? "http://localhost:3100"]);
  // La sidebar es de escritorio: fijamos el viewport como en shell.spec.
  await page.setViewportSize({ width: 1280, height: 800 });
  await crearCarpeta(page);

  // La sidebar de escritorio tiene Ajustes y Bloquear en la fila del pie.
  await page.locator(".lg-sidebar").getByRole("button", { name: "Bloquear" }).click();

  await expect(page).toHaveURL(/\/carpeta$/);
  await expect(page.getByRole("heading", { name: "Desbloquea tu carpeta" })).toBeVisible();

  await page.getByLabel("Contraseña", { exact: true }).fill(CLAVE_OTRA);
  await page.getByRole("button", { name: "Desbloquear" }).click();
  await expect(page.getByText("La contraseña no es correcta.")).toBeVisible();

  await page.getByLabel("Contraseña", { exact: true }).fill(CLAVE);
  await page.getByRole("button", { name: "Desbloquear" }).click();
  await expect(page.getByRole("heading", { name: "Tu carpeta está abierta" })).toBeVisible();
  expect(violaciones).toEqual([]);
});

test("bloquear desde la carpeta cierra la sesión", async ({ page }) => {
  await crearCarpeta(page);

  await page.getByRole("main").getByRole("button", { name: "Bloquear" }).click();

  await expect(page.getByRole("heading", { name: "Desbloquea tu carpeta" })).toBeVisible();
});

test("desbloquear entra en la ruta solicitada", async ({ page }) => {
  await crearCarpeta(page);
  await page.getByRole("main").getByRole("button", { name: "Bloquear" }).click();
  await expect(page.getByRole("heading", { name: "Desbloquea tu carpeta" })).toBeVisible();

  await page.goto("/carpeta?next=/hoy");
  // Espera a que la vista resuelva a desbloquear: el campo se llama "Contraseña"
  // y el de crear carpeta "Repite la contraseña", así que el selector va exacto.
  await expect(page.getByRole("heading", { name: "Desbloquea tu carpeta" })).toBeVisible();
  await page.getByLabel("Contraseña", { exact: true }).fill(CLAVE);
  await page.getByRole("button", { name: "Desbloquear" }).click();

  await expect(page).toHaveURL(/\/hoy$/);
  await expect(page.getByRole("heading", { name: "Hoy", exact: true })).toBeVisible();
});

test("las pantallas de la carpeta no tienen scroll horizontal a 375 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto("/carpeta");

  expect(await sinScrollHorizontal(page)).toBeLessThanOrEqual(0);

  await crearCarpeta(page);
  expect(await sinScrollHorizontal(page)).toBeLessThanOrEqual(0);

  await page.getByRole("main").getByRole("button", { name: "Bloquear" }).click();
  await expect(page.getByRole("heading", { name: "Desbloquea tu carpeta" })).toBeVisible();
  expect(await sinScrollHorizontal(page)).toBeLessThanOrEqual(0);
});

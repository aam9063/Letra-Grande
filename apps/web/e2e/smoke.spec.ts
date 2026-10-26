import { expect, test } from "@playwright/test";

// La portada debe funcionar en la build de producción: encabezado y aviso de
// independencia visibles sin ninguna interacción previa.
test("la portada muestra el título y el aviso de independencia", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Letra Grande", exact: true })).toBeVisible();
  await expect(
    page.getByText(/proyecto independiente, sin vinculación con ninguna empresa/),
  ).toBeVisible();
});

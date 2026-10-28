import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Accesibilidad AA comprobada con axe sobre la app real (QA-02).
//
// Tres decisiones que importan:
//
// - Nivel AA y no "best practices": el proyecto promete AA, y con las etiquetas
//   de mejores prácticas la lista crece con cosas que no son un requisito.
// - Se comprueban las rutas, no una: una pantalla nueva entra por aquí sin que
//   nadie tenga que acordarse de añadir su test.
// - El spec se comprueba a sí mismo: axe podría estar mirando un DOM a medio
//   montar y aprobar sin analizar nada. El test "axe detecta una violación de
//   verdad" inyecta un HTML roto conocido y exige que lo detecte, igual que el
//   guardián de red de QA-01 exige ver peticiones antes de dar verde.
//
// Cuando una regla de axe sea un falso positivo, se desactiva aquí con el motivo
// escrito al lado. Nunca para tapar una violación real: si molesta, se corrige.

const RUTAS = [
  { ruta: "/", nombre: "portada" },
  { ruta: "/hoy", nombre: "hoy" },
  { ruta: "/carpeta", nombre: "carpeta" },
  { ruta: "/asistente", nombre: "asistente" },
  { ruta: "/ayudas", nombre: "ayudas" },
  { ruta: "/datos", nombre: "datos" },
  { ruta: "/familia", nombre: "familia" },
  { ruta: "/reclamar", nombre: "reclamar" },
  { ruta: "/vida", nombre: "vida" },
  { ruta: "/ajustes", nombre: "ajustes" },
  { ruta: "/onboarding", nombre: "onboarding" },
];

/**
 * Abre una ruta y espera a que la pantalla esté pintada del todo.
 *
 * No basta con navegar y esperar a la red: una respuesta de error de Next pinta
 * una página mínima que pasaría axe con cero violaciones, y `networkidle` mide
 * la red, no la hidratación. Por eso se exige un 2xx y el título ya visible,
 * que es el marcador de que la pantalla ha montado.
 */
async function abrir(page: Page, ruta: string): Promise<void> {
  const respuesta = await page.goto(ruta);
  expect(respuesta?.ok(), `${ruta} no respondió bien (${respuesta?.status() ?? "sin respuesta"})`).toBe(
    true,
  );
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1 }).first(), `${ruta} no muestra su título`).toBeVisible();
}

/** Deja el análisis en una lista legible cuando falla. */
function detalleViolaciones(violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]) {
  return violations
    .map((v) => {
      const nodos = v.nodes.map((n) => `      ${n.target.join(" ")}`).join("\n");
      return `  - [${v.impact ?? "sin impacto"}] ${v.id}: ${v.help}\n${nodos}`;
    })
    .join("\n");
}

for (const { ruta, nombre } of RUTAS) {
  test(`la ${nombre} no tiene violaciones AA de axe`, async ({ page }) => {
    await abrir(page, ruta);

    const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();

    expect(
      resultado.violations,
      resultado.violations.length > 0
        ? `Violaciones AA en ${ruta}:\n${detalleViolaciones(resultado.violations)}`
        : `Sin violaciones AA en ${ruta}`,
    ).toEqual([]);
  });
}

test("axe detecta una violación de verdad en esta configuración", async ({ page }) => {
  // Si el motor o el nivel estuvieran mal configurados, este test fallaría y el
  // verde del resto no valdría nada. Imagen sin alt y botón sin nombre: dos
  // violaciones de nivel A que axe tiene que ver.
  await page.setContent(`
    <html lang="es"><head><title>Prueba</title></head><body><main>
      <h1>Prueba</h1>
      <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="10" height="10">
      <button type="button"></button>
    </main></body></html>
  `);

  const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const reglas = resultado.violations.map((v) => v.id);

  expect(reglas).toContain("image-alt");
  expect(reglas).toContain("button-name");
});

// Zoom al 200 %: WCAG 1.4.4 pide que el texto escale al doble sin perder
// contenido ni funcionalidad. Con zoom al 200 % en un escritorio de 1280 px, el
// navegador calcula el layout con 640 px de ancho en CSS, así que se prueba ese
// ancho en lugar de manipular el zoom del navegador, que no es estándar en todos
// los motores. En móvil el suelo real del proyecto son 375 px: pedir 200 % ahí
// daría 187 px, que ningún teléfono tiene.
const ANCHOS_DE_ZOOM = [
  { ancho: 640, alto: 900, nombre: "escritorio al 200 %" },
  { ancho: 375, alto: 812, nombre: "móvil a 375 px" },
];

for (const { ancho, alto, nombre } of ANCHOS_DE_ZOOM) {
  test(`sin scroll horizontal y con el titulo dentro del ancho en ${nombre}`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });

    for (const { ruta } of RUTAS) {
      await abrir(page, ruta);

      // 1. Nada se sale a lo ancho: sin scroll horizontal.
      const desborde = await page.evaluate(() => ({
        documento: document.documentElement.scrollWidth,
        cuerpo: document.body.scrollWidth,
        ventana: window.innerWidth,
      }));
      expect(
        desborde.documento,
        `${ruta} tiene scroll horizontal a ${ancho} px (${desborde.documento} > ${desborde.ventana})`,
      ).toBeLessThanOrEqual(desborde.ventana + 1);
      expect(desborde.cuerpo, `${ruta} desborda el cuerpo a ${ancho} px`).toBeLessThanOrEqual(
        desborde.ventana + 1,
      );

      // 2. El título sigue visible y dentro del ancho: el contenido no se corta.
      const titulo = page.locator("h1").first();
      await expect(titulo, `${ruta} no muestra su título a ${ancho} px`).toBeVisible();
      const caja = await titulo.boundingBox();
      expect(caja, `${ruta} no tiene caja de título a ${ancho} px`).not.toBeNull();
      expect(caja!.x, `el título de ${ruta} se sale por la izquierda`).toBeGreaterThanOrEqual(0);
      expect(caja!.x + caja!.width, `el título de ${ruta} se sale por la derecha`).toBeLessThanOrEqual(
        desborde.ventana + 1,
      );
    }
  });
}

// Movimiento reducido: quien pide menos movimiento en su sistema no debe ver
// animaciones ni transiciones con duración perceptible. globals.css ya trae la
// media query; este test la ancla a la realidad del DOM, que es donde una
// animación nueva se cuela sin pasar por ella.
test("con movimiento reducido no queda ninguna animación perceptible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const { ruta } of RUTAS) {
    await abrir(page, ruta);

    const lentos = await page.evaluate(() => {
      const resultados: string[] = [];
      const aSegundos = (valor: string) =>
        valor.split(",").map((parte) => {
          const texto = parte.trim();
          const numero = Number.parseFloat(texto);
          if (Number.isNaN(numero)) return 0;
          return texto.endsWith("ms") ? numero / 1000 : numero;
        });

      for (const elemento of Array.from(document.querySelectorAll("*"))) {
        const estilo = getComputedStyle(elemento);
        const duraciones = [
          ...aSegundos(estilo.animationDuration),
          ...aSegundos(estilo.transitionDuration),
        ];
        // La regla global de globals.css deja 0.01 ms. Aquí el umbral es 0.01 s
        // (10 ms) para no dar falso rojo si un motor redondea: sigue siendo
        // imperceptible, y cualquier animación de verdad lo supera de largo.
        if (duraciones.some((segundos) => segundos > 0.01)) {
          const nombre = elemento.tagName.toLowerCase();
          const clase = elemento.className && typeof elemento.className === "string"
            ? `.${elemento.className.trim().split(/\s+/).join(".")}`
            : "";
          resultados.push(`${nombre}${clase}`);
        }
      }
      return resultados.slice(0, 10);
    });

    expect(lentos, `${ruta} sigue animando con movimiento reducido`).toEqual([]);
  }
});

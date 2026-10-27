import { describe, expect, it } from "vitest";
import { RENDERER_DIST_ENV_VAR, rendererDistOverride } from "./config.js";

describe("sobrecarga de la raiz del renderer", () => {
  it("se ignora en la app empaquetada aunque la variable este definida", () => {
    const resultado = rendererDistOverride({
      isPackaged: true,
      env: { [RENDERER_DIST_ENV_VAR]: "/tmp/otro-renderer" },
    });
    expect(resultado).toBeUndefined();
  });

  it("se aplica en desarrollo, recortando espacios", () => {
    const resultado = rendererDistOverride({
      isPackaged: false,
      env: { [RENDERER_DIST_ENV_VAR]: "  /tmp/renderer  " },
    });
    expect(resultado).toBe("/tmp/renderer");
  });
});

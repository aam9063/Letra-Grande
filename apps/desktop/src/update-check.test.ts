import { describe, expect, it } from "vitest";
import {
  UPDATES_OFF_VALUE,
  UPDATES_TOGGLE_ENV_VAR,
  shouldCheckForUpdates,
  updateCheckResult,
} from "./update-check.js";

describe("cuando se comprueba si hay actualizaciones", () => {
  it("no se comprueba en desarrollo, aunque no haya nada que lo prohiba", () => {
    expect(shouldCheckForUpdates({ isPackaged: false })).toBe(false);
  });

  it("se comprueba en la app empaquetada", () => {
    expect(shouldCheckForUpdates({ isPackaged: true })).toBe(true);
  });

  it("la app empaquetada no comprueba si LG_UPDATES vale off", () => {
    expect(
      shouldCheckForUpdates({
        isPackaged: true,
        env: { [UPDATES_TOGGLE_ENV_VAR]: UPDATES_OFF_VALUE },
      }),
    ).toBe(false);
  });

  it("cualquier otro valor de la variable no desactiva la comprobacion", () => {
    expect(
      shouldCheckForUpdates({ isPackaged: true, env: { [UPDATES_TOGGLE_ENV_VAR]: "on" } }),
    ).toBe(true);
    expect(shouldCheckForUpdates({ isPackaged: true, env: {} })).toBe(true);
  });
});

describe("resultado del modo diagnostico --check-updates", () => {
  it("con version nueva imprime una linea y sale sin error", () => {
    const resultado = updateCheckResult({ kind: "available", version: "0.0.2" });
    expect(resultado.line).toBe("actualizacion disponible: 0.0.2");
    expect(resultado.exitCode).toBe(0);
  });

  it("sin version nueva imprime una linea y sale sin error", () => {
    const resultado = updateCheckResult({ kind: "none" });
    expect(resultado.line).toBe("sin actualizaciones");
    expect(resultado.exitCode).toBe(0);
  });

  it("ante un fallo imprime el motivo y sale con error", () => {
    const resultado = updateCheckResult({ kind: "error", message: "sin red" });
    expect(resultado.line).toBe("error: sin red");
    expect(resultado.exitCode).toBe(1);
  });
});

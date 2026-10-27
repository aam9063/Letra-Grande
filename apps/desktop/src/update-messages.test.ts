import { describe, expect, it } from "vitest";
import { downloadErrorText, updateAvailableText, updateReadyText } from "./update-messages.js";

describe("texto del dialogo de actualizacion disponible", () => {
  it("nombra las dos versiones y pregunta antes de descargar", () => {
    const texto = updateAvailableText("0.0.1", "0.0.2");
    expect(texto.title).toContain("Letra Grande");
    expect(texto.message).toContain("0.0.2");
    expect(texto.message).toContain("0.0.1");
    expect(texto.message).toContain("¿Descargar ahora?");
  });

  it("deja claro que nada se instala sin consentimiento", () => {
    const texto = updateAvailableText("0.0.1", "0.0.2");
    expect(texto.message).toContain("No se instala nada sin que lo aceptes");
  });
});

describe("texto del dialogo de actualizacion lista para instalar", () => {
  it("nombra la version y pregunta antes de reiniciar", () => {
    const texto = updateReadyText("0.0.2");
    expect(texto.title).toContain("Letra Grande");
    expect(texto.message).toContain("0.0.2");
    expect(texto.message).toContain("¿Reiniciar ahora");
  });
});

describe("texto del aviso de fallo de descarga", () => {
  it("explica el fallo y pide reintentar mas tarde, sin promesas", () => {
    const texto = downloadErrorText();
    expect(texto.title).toContain("Letra Grande");
    expect(texto.message).toBe("No se pudo descargar la actualización. Prueba más tarde.");
  });
});

describe("ningun texto promete una instalacion automatica", () => {
  it("los dos dialogos evitan frases de instalacion sin permiso", () => {
    const textos = [updateAvailableText("0.0.1", "0.0.2"), updateReadyText("0.0.2")];
    for (const texto of textos) {
      const completo = `${texto.title} ${texto.message}`.toLowerCase();
      expect(completo).not.toMatch(/automatic/);
      expect(completo).not.toMatch(/se instalara/);
      expect(completo).not.toMatch(/se va a instalar/);
      // Todo dialogo termina en una pregunta que la persona responde.
      expect(completo).toContain("¿");
    }
  });
});

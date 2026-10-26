import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Limpieza del DOM entre tests para que no se contaminen entre sí.
afterEach(() => {
  cleanup();
});

// Regla "html-has-lang" de axe necesita el idioma del documento.
document.documentElement.lang = "es";

import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceWorkerRegistrar } from "./ServiceWorkerRegistrar";

const registrar = vi.fn(() => Promise.resolve());

beforeEach(() => {
  registrar.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ServiceWorkerRegistrar", () => {
  it("registra el service worker del shell desde el cliente", async () => {
    vi.stubGlobal("navigator", { serviceWorker: { register: registrar } });

    render(<ServiceWorkerRegistrar />);

    await vi.waitFor(() => {
      expect(registrar).toHaveBeenCalledWith("/sw.js");
    });
  });

  it("no falla cuando el navegador no soporta service workers", () => {
    vi.stubGlobal("navigator", {});

    expect(() => render(<ServiceWorkerRegistrar />)).not.toThrow();
    expect(registrar).not.toHaveBeenCalled();
  });
});

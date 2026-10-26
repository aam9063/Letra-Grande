import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GateOnboarding } from "./GateOnboarding";
import { CLAVE_ONBOARDING } from "./primer-arranque";

const { reemplazar } = vi.hoisted(() => ({ reemplazar: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: reemplazar }) }));

// El gate vive en el layout de la app: si el onboarding está pendiente, la
// primera visita a cualquier ruta de la app salta a /onboarding.
describe("GateOnboarding", () => {
  beforeEach(() => {
    localStorage.clear();
    reemplazar.mockClear();
  });

  it("con el onboarding pendiente, redirige a /onboarding", () => {
    render(<GateOnboarding />);

    expect(reemplazar).toHaveBeenCalledWith("/onboarding");
  });

  it("con el onboarding hecho, no redirige", () => {
    localStorage.setItem(CLAVE_ONBOARDING, "1");
    render(<GateOnboarding />);

    expect(reemplazar).not.toHaveBeenCalled();
  });
});

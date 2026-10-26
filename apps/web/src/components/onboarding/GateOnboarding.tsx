"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { verOnboardingPendiente } from "./primer-arranque";

/**
 * Puerta de primer arranque (UI-05): montada en el layout de la app. Si el
 * onboarding está pendiente, la primera visita salta a /onboarding. Sin datos
 * personales: solo la bandera local.
 */
export function GateOnboarding() {
  const router = useRouter();

  useEffect(() => {
    if (verOnboardingPendiente()) {
      router.replace("/onboarding");
    }
  }, [router]);

  return null;
}

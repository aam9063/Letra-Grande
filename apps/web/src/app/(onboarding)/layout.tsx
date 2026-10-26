import type { ReactNode } from "react";

// Pantalla completa de primer arranque: sin shell, sin navegación, solo el
// onboarding. La salida siempre es explícita (Saltar o Empezar).
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return children;
}

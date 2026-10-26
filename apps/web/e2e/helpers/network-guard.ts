import type { Page, Request } from "@playwright/test";

const PII_PATTERNS: Record<string, RegExp> = {
  documento: /\b(?:\d{8}-?[A-Z]|[XYZ]\d{7}[A-Z])\b/,
  iban: /\bES\d{2}(?:\s?\d{4}){5}\b/,
  cups: /\bES\d{16}[A-Z]{2}/,
  email: /[\w.+-]+@[\w-]+\.[\w.-]+/,
};

/** Devuelve la lista (viva) de violaciones. Compruébala vacía al final del test. */
export function guardNetwork(page: Page, allowedOrigins: string[]): string[] {
  const violations: string[] = [];
  page.on("request", (req: Request) => {
    const url = new URL(req.url());
    if (url.protocol === "data:" || url.protocol === "blob:") return;
    if (!allowedOrigins.includes(url.origin)) {
      violations.push(`Origen no permitido: ${req.method()} ${url.origin}${url.pathname}`);
    }
    const body = req.postData();
    if (!body) return;
    for (const [name, re] of Object.entries(PII_PATTERNS)) {
      if (re.test(body)) violations.push(`Posible ${name} en el cuerpo de ${req.method()} ${url.pathname}`);
    }
  });
  return violations;
}

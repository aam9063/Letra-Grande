// Identificador anónimo para la cuota de peticiones (AI-01, T4).
// Limitación documentada: se deriva de cabeceras de la petición. Si la plataforma
// de hosting no sobrescribe X-Forwarded-For, un cliente puede rotar esa cabecera
// y cambiar de identidad; y varios usuarios detrás del mismo proxy comparten cubo.
// No es autenticación, solo un freno barato contra el abuso.
import { createHash } from "node:crypto";

export function deriveAnonymousId(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "sin-ip";
  const userAgent = headers.get("user-agent") ?? "";
  const language = headers.get("accept-language") ?? "";
  return createHash("sha256").update(`${ip}|${userAgent}|${language}`).digest("hex").slice(0, 32);
}

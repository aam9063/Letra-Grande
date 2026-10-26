// Único endpoint de la app que habla con la IA (AI-01).
// Runtime de Node: la capa de proveedor (@letra-grande/ai) y su guarda de servidor
// están pensadas para Node, y así el fetch, el hash y las variables de entorno
// tienen el mismo comportamiento en desarrollo y en producción.
import { createDefaultDeps } from "./deps";
import { handleAssistant } from "./handler";

export const runtime = "nodejs";

const deps = createDefaultDeps();

export async function POST(request: Request): Promise<Response> {
  return handleAssistant(request, deps);
}

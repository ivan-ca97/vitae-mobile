import { apiFetch, userFetch } from "./client";
import type {
  EstimateMealRequest,
  EstimateMealResponse,
  AiMonthlyUsage,
  SelfLimitRequest,
} from "@/lib/types/ai";

// Estima una comida desde fotos/texto. Devuelve un borrador, no persiste nada.
export function estimateMeal(data: EstimateMealRequest): Promise<EstimateMealResponse> {
  return userFetch<EstimateMealResponse>("/ai/meals/estimate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getMyAiUsage(): Promise<AiMonthlyUsage> {
  return apiFetch<AiMonthlyUsage>("/ai/me/usage");
}

export function setAiSelfLimit(data: SelfLimitRequest): Promise<AiMonthlyUsage> {
  return apiFetch<AiMonthlyUsage>("/ai/me/self-limit", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

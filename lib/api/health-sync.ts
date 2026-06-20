import { userFetch } from "./client";
import type { HealthPayload } from "@/lib/health/health-connect";

export interface ImportTypeResult {
  created: number;
  skipped: number;
  blocked: number;
}

// Respuesta de POST /users/{userId}/import/health-connect
export interface ImportResponse {
  weight: ImportTypeResult;
  exercise: ImportTypeResult;
  steps: ImportTypeResult;
  sleep: ImportTypeResult;
  heart_rate: ImportTypeResult;
}

export function importHealthConnect(payload: HealthPayload): Promise<ImportResponse> {
  return userFetch<ImportResponse>("/import/health-connect", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

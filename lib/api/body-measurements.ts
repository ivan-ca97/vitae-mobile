import { userFetch } from "./client";
import type { BodyMeasurement, UpsertBodyMeasurementRequest } from "@/lib/types/body-measurement";

export function getBodyMeasurements(
  params: { from?: string; to?: string; type?: string } = {}
): Promise<{ items: BodyMeasurement[] }> {
  const search = new URLSearchParams();
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.type) search.set("type", params.type);
  const qs = search.toString();
  return userFetch<{ items: BodyMeasurement[] }>(`/body-measurements${qs ? `?${qs}` : ""}`);
}

export function upsertBodyMeasurement(
  date: string,
  type: string,
  data: UpsertBodyMeasurementRequest
): Promise<BodyMeasurement> {
  return userFetch<BodyMeasurement>(`/body-measurements/${date}/${type}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteBodyMeasurement(date: string, type: string): Promise<void> {
  return userFetch<void>(`/body-measurements/${date}/${type}`, { method: "DELETE" });
}

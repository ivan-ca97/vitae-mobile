import { userFetch } from "./client";
import type {
  DailySummary,
  DailySummaryRangeResponse,
  DayClosureResponse,
} from "@/lib/types/daily";

export function getDailySummary(date: string): Promise<DailySummary> {
  return userFetch<DailySummary>(`/daily/summary?date=${date}`);
}

export function getDailySummaryRange(
  from: string,
  to: string
): Promise<DailySummaryRangeResponse> {
  return userFetch<DailySummaryRangeResponse>(`/daily/summary/range?from=${from}&to=${to}`);
}

export function closeDay(date: string): Promise<DayClosureResponse> {
  return userFetch<DayClosureResponse>("/daily/closure", {
    method: "PUT",
    body: JSON.stringify({ date }),
  });
}

export function openDay(date: string): Promise<void> {
  return userFetch<void>(`/daily/closure?date=${date}`, { method: "DELETE" });
}

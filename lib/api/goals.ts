import { userFetch } from "./client";
import type { Goal, UpsertGoalRequest, GoalProgress } from "@/lib/types/goal";

export function getGoals(): Promise<Goal> {
  return userFetch<Goal>("/goals");
}

export function getGoalProgress(from: string, to: string): Promise<GoalProgress> {
  return userFetch<GoalProgress>(`/goals/progress?from=${from}&to=${to}`);
}

export function upsertGoals(data: UpsertGoalRequest): Promise<Goal> {
  return userFetch<Goal>("/goals", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

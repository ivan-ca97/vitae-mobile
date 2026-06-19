import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import * as goalsApi from "@/lib/api/goals";
import { ApiError } from "@/lib/api/client";
import type { Goal, UpsertGoalRequest, GoalProgress } from "@/lib/types/goal";

export function useGoals() {
  return useQuery<Goal | null>({
    queryKey: ["goals"],
    // El backend devuelve 404 si el usuario aun no configuro metas:
    // lo tratamos como "sin metas" (null) en vez de error.
    queryFn: async () => {
      try {
        return await goalsApi.getGoals();
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    retry: false,
  });
}

export function useGoalProgress(from: string, to: string) {
  return useQuery<GoalProgress | null>({
    queryKey: ["goal-progress", from, to],
    // 404 = el usuario no tiene metas configuradas -> "sin progreso" (null).
    queryFn: async () => {
      try {
        return await goalsApi.getGoalProgress(from, to);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    retry: false,
    placeholderData: keepPreviousData,
  });
}

export function useUpsertGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertGoalRequest) => goalsApi.upsertGoals(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["daily"] });
    },
  });
}

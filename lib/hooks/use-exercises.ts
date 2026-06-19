import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as exercisesApi from "@/lib/api/exercises";
import type { CreateExerciseRequest, UpdateExerciseRequest } from "@/lib/types/exercise";

export function useExercises(date: string) {
  return useQuery({
    queryKey: ["exercises", date],
    queryFn: () => exercisesApi.getExercises({ date }),
  });
}

export function useExercise(id: string) {
  return useQuery({
    queryKey: ["exercise", id],
    queryFn: () => exercisesApi.getExercise(id),
    enabled: !!id,
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExerciseRequest) => exercisesApi.createExercise(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
      qc.invalidateQueries({ queryKey: ["daily"] });
    },
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExerciseRequest }) =>
      exercisesApi.updateExercise(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
      qc.invalidateQueries({ queryKey: ["exercise"] });
      qc.invalidateQueries({ queryKey: ["daily"] });
    },
  });
}

export function useEstimateCalories() {
  return useMutation({
    mutationFn: (steps: number) =>
      exercisesApi.estimateCalories({ type: "steps", value: steps }),
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => exercisesApi.deleteExercise(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
      qc.invalidateQueries({ queryKey: ["daily"] });
    },
  });
}

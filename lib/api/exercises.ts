import { userFetch } from "./client";
import type {
  Exercise,
  ExercisePage,
  CreateExerciseRequest,
  UpdateExerciseRequest,
  CalorieEstimateRequest,
  CalorieEstimateResponse,
} from "@/lib/types/exercise";

export function getExercises(params: {
  date?: string;
  limit?: number;
  offset?: number;
}): Promise<ExercisePage> {
  const search = new URLSearchParams();
  if (params.date) search.set("date", params.date);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.offset) search.set("offset", String(params.offset));
  return userFetch<ExercisePage>(`/exercises?${search}`);
}

export function getExercise(id: string): Promise<Exercise> {
  return userFetch<Exercise>(`/exercises/${id}`);
}

export function createExercise(data: CreateExerciseRequest): Promise<Exercise> {
  return userFetch<Exercise>("/exercises", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateExercise(id: string, data: UpdateExerciseRequest): Promise<Exercise> {
  return userFetch<Exercise>(`/exercises/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteExercise(id: string): Promise<void> {
  return userFetch<void>(`/exercises/${id}`, { method: "DELETE" });
}

export function estimateCalories(data: CalorieEstimateRequest): Promise<CalorieEstimateResponse> {
  return userFetch<CalorieEstimateResponse>("/activity/calorie-estimate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

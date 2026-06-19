import type { PaginatedResponse } from "./api";

export type ExerciseType =
  | "weightlifting"
  | "walking"
  | "cycling"
  | "running"
  | "other"
  | "manual_adjustment";

export interface Exercise {
  id: string;
  date: string;
  type: ExerciseType;
  name: string;
  started_at?: string;
  duration_seconds?: number;
  estimated_calories_burned?: number;
  steps?: number;
  distance_meters?: number;
  average_speed_kmh?: number;
  max_speed_kmh?: number;
  average_pace_min_per_km?: number;
  elevation_gain_meters?: number;
  average_heart_rate?: number;
  max_heart_rate?: number;
  total_volume_kg?: number;
  total_sets?: number;
  tags: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export type ExercisePage = PaginatedResponse<Exercise>;

export interface CreateExerciseRequest {
  date: string;
  type: string;
  name: string;
  started_at?: string;
  duration_seconds?: number;
  estimated_calories_burned?: number;
  steps?: number;
  distance_meters?: number;
  max_speed_kmh?: number;
  elevation_gain_meters?: number;
  average_heart_rate?: number;
  max_heart_rate?: number;
  total_volume_kg?: number;
  total_sets?: number;
  tags?: string[];
  notes: string;
}

export type UpdateExerciseRequest = Partial<CreateExerciseRequest>;

export interface CalorieEstimateRequest {
  type: "steps";
  value: number;
}

export interface CalorieEstimateResponse {
  type: string;
  value: number;
  estimated_calories: number;
  weight_kg: number;
}

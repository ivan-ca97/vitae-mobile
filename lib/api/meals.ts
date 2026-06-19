import { userFetch } from "./client";
import type {
  Meal,
  MealPage,
  CreateMealRequest,
  UpdateMealRequest,
  MealTypesResponse,
  MealPreviewRequest,
  MealPreviewResponse,
} from "@/lib/types/meal";

export interface MealFilters {
  date?: string;
  from?: string;
  to?: string;
  type?: string;
  tag?: string;
  food_id?: string;
  min_calories?: number;
  max_calories?: number;
  min_protein?: number;
  max_protein?: number;
  min_carbs?: number;
  max_carbs?: number;
  min_fat?: number;
  max_fat?: number;
  min_fiber?: number;
  max_fiber?: number;
  limit?: number;
  offset?: number;
}

export function getMeals(params: MealFilters): Promise<MealPage> {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null) search.set(k, String(v));
  }
  return userFetch<MealPage>(`/meals?${search}`);
}

export function getMeal(id: string): Promise<Meal> {
  return userFetch<Meal>(`/meals/${id}`);
}

export function createMeal(data: CreateMealRequest): Promise<Meal> {
  return userFetch<Meal>("/meals", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateMeal(id: string, data: UpdateMealRequest): Promise<Meal> {
  return userFetch<Meal>(`/meals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteMeal(id: string): Promise<void> {
  return userFetch<void>(`/meals/${id}`, { method: "DELETE" });
}

export function getMealTypes(hour?: number): Promise<MealTypesResponse> {
  const search = hour !== undefined ? `?hour=${hour}` : "";
  return userFetch<MealTypesResponse>(`/meals/types${search}`);
}

export function previewMealMacros(data: MealPreviewRequest): Promise<MealPreviewResponse> {
  return userFetch<MealPreviewResponse>("/meals/preview", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

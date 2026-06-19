import { apiFetch, userFetch } from "./client";
import type {
  Food,
  FoodPage,
  UnitsListResponse,
  CreateFoodRequest,
  UpdateFoodRequest,
} from "@/lib/types/food";

export function getFoods(params: {
  q?: string;
  tag?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}): Promise<FoodPage> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.tag) search.set("tag", params.tag);
  if (params.sort) search.set("sort", params.sort);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.offset) search.set("offset", String(params.offset));
  return userFetch<FoodPage>(`/foods?${search}`);
}

export function getFood(id: string): Promise<Food> {
  return userFetch<Food>(`/foods/${id}`);
}

export function createFood(data: CreateFoodRequest): Promise<Food> {
  return userFetch<Food>("/foods", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateFood(id: string, data: UpdateFoodRequest): Promise<Food> {
  return userFetch<Food>(`/foods/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteFood(id: string): Promise<void> {
  return userFetch<void>(`/foods/${id}`, { method: "DELETE" });
}

/** Ruta global — sin prefijo de userId. */
export function getUnits(): Promise<UnitsListResponse> {
  return apiFetch<UnitsListResponse>("/foods/units");
}

/** Ruta global — explorar alimentos publicos. */
export function getCommunityFoods(params: {
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<FoodPage> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.offset) search.set("offset", String(params.offset));
  return apiFetch<FoodPage>(`/foods/community?${search}`);
}

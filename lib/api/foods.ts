import { apiFetch, userFetch } from "./client";
import type {
  Food,
  FoodPage,
  Portion,
  UnitsListResponse,
  CreateFoodRequest,
  UpdateFoodRequest,
  PortionRequest,
  UpdatePortionRequest,
} from "@/lib/types/food";

export function getFoods(params: {
  q?: string;
  tag?: string;
  sort?: string;
  /** Solo los alimentos compartidos con todos, o solo los que no. */
  public?: boolean;
  limit?: number;
  offset?: number;
}): Promise<FoodPage> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.tag) search.set("tag", params.tag);
  if (params.sort) search.set("sort", params.sort);
  if (params.public !== undefined) search.set("public", String(params.public));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.offset) search.set("offset", String(params.offset));
  return userFetch<FoodPage>(`/foods?${search}`);
}

/** Alimentos que el usuario puede usar en comidas: los propios y los compartidos con el o con todos. */
export function getUsableFoods(params: { q?: string; limit?: number; offset?: number }): Promise<FoodPage> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.offset) search.set("offset", String(params.offset));
  return userFetch<FoodPage>(`/foods/usable?${search}`);
}

/** Una ruta de los alimentos propios, o de los del dueno cuando el alimento es de otro. */
function foodFetch<T>(ownerId: string | undefined, path: string, options?: RequestInit): Promise<T> {
  return ownerId ? apiFetch<T>(`/users/${ownerId}${path}`, options) : userFetch<T>(path, options);
}

export function getFood(id: string, ownerId?: string): Promise<Food> {
  return foodFetch<Food>(ownerId, `/foods/${id}`);
}

export function createFood(data: CreateFoodRequest): Promise<Food> {
  return userFetch<Food>("/foods", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateFood(id: string, data: UpdateFoodRequest, ownerId?: string): Promise<Food> {
  return foodFetch<Food>(ownerId, `/foods/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteFood(id: string): Promise<void> {
  return userFetch<void>(`/foods/${id}`, { method: "DELETE" });
}

export function addFoodPortion(foodId: string, data: PortionRequest, ownerId?: string): Promise<Portion> {
  return foodFetch<Portion>(ownerId, `/foods/${foodId}/portions`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateFoodPortion(
  foodId: string,
  portionId: string,
  data: UpdatePortionRequest,
  ownerId?: string,
): Promise<Portion> {
  return foodFetch<Portion>(ownerId, `/foods/${foodId}/portions/${portionId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteFoodPortion(foodId: string, portionId: string, ownerId?: string): Promise<void> {
  return foodFetch<void>(ownerId, `/foods/${foodId}/portions/${portionId}`, { method: "DELETE" });
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

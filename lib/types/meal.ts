import type { PaginatedResponse } from "./api";

export interface MealItem {
  id: string;
  food_id: string;
  food_name: string;
  input_quantity: number;
  input_unit: string;
  normalized_quantity: number;
  normalized_unit: string;
  calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  fiber_grams: number | null;
  measurement_method?: string;
  notes: string;
}

export interface MealPhoto {
  id: string;
  url: string;
  is_primary: boolean;
  meal_item_id?: string;
}

export type MealStatus = "complete" | "pending";

export interface Meal {
  id: string;
  date: string;
  type: string;
  name: string;
  status: MealStatus;
  photos: MealPhoto[];
  eaten_at?: string;
  calories?: number;
  protein_grams?: number;
  carbs_grams?: number;
  fat_grams?: number;
  fiber_grams?: number;
  tags: string[];
  items: MealItem[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export type MealPage = PaginatedResponse<Meal>;

export interface MealItemRequest {
  food_id: string;
  quantity: number;
  unit: string;
  measurement_method?: string;
  notes?: string;
}

export interface MealPhotoRequest {
  url: string;
  is_primary: boolean;
  meal_item_id?: string;
  item_food_id?: string;
}

export interface CreateMealRequest {
  date: string;
  type: string;
  name?: string;
  status?: MealStatus;
  photos?: MealPhotoRequest[];
  eaten_at?: string;
  calories?: number;
  protein_grams?: number;
  carbs_grams?: number;
  fat_grams?: number;
  fiber_grams?: number;
  tags: string[];
  items: MealItemRequest[];
  notes: string;
}

export type UpdateMealRequest = Partial<CreateMealRequest>;

export interface MealTypesResponse {
  types: string[];
}

export interface MealPreviewItem {
  food_id: string;
  quantity: number;
  unit: string;
}

export interface MealPreviewRequest {
  items: MealPreviewItem[];
}

export interface MealPreviewItemResponse {
  food_id: string;
  calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  fiber_grams: number | null;
}

export interface MealPreviewResponse {
  items: MealPreviewItemResponse[];
  calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  fiber_grams: number | null;
}

import type { PaginatedResponse } from "./api";

export type MeasurementType = "mass" | "volume" | "unit";

export interface VolumeConversion {
  grams_per_ml: number;
  note?: string;
}

export interface UnitConversion {
  base_equivalent: number;
  note?: string;
}

export interface Portion {
  id: string;
  name: string;
  base_equivalent: number;
}

export interface Ingredient {
  id: string;
  name: string;
}

export interface Food {
  id: string;
  user_id: string;
  name: string;
  measurement_type: MeasurementType;
  base_quantity: number;
  base_unit: string;
  default_calories?: number;
  default_protein_grams?: number;
  default_carbs_grams?: number;
  default_fat_grams?: number;
  default_fiber_grams?: number;
  public: boolean;
  photo_url?: string;
  volume_conversion?: VolumeConversion;
  unit_conversion?: UnitConversion;
  portions: Portion[];
  tags: string[];
  ingredients: Ingredient[];
  created_at: string;
  updated_at: string;
}

export type FoodPage = PaginatedResponse<Food>;

export interface ConversionsRequest {
  volume_conversion?: { grams_per_ml: number; note?: string };
  unit_conversion?: { base_equivalent: number; note?: string };
}

export interface PortionRequest {
  name: string;
  base_equivalent: number;
}

export interface CreateFoodRequest {
  name: string;
  measurement_type: MeasurementType;
  base_quantity?: number;
  base_unit: string;
  default_calories?: number;
  default_protein_grams?: number;
  default_carbs_grams?: number;
  default_fat_grams?: number;
  default_fiber_grams?: number;
  public?: boolean;
  photo_url?: string;
  conversions?: ConversionsRequest;
  portions?: PortionRequest[];
  tags?: string[];
  ingredients?: string[];
}

export type UpdateFoodRequest = Partial<CreateFoodRequest>;

export interface UnitsListResponse {
  mass: string[];
  volume: string[];
  unit: string[];
}

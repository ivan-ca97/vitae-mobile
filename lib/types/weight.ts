import type { PaginatedResponse } from "./api";

export interface WeightEntry {
  id: string;
  date: string;
  weight_kg: number;
  body_fat_percentage?: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type WeightPage = PaginatedResponse<WeightEntry>;

export interface CreateWeightRequest {
  date: string;
  weight_kg: number;
  body_fat_percentage?: number;
  notes?: string;
}

export type UpdateWeightRequest = Partial<CreateWeightRequest>;

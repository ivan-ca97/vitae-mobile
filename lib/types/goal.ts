export interface Goal {
  id: string;
  daily_calories?: number;
  daily_protein_grams?: number;
  daily_carbs_grams?: number;
  daily_fat_grams?: number;
  daily_fiber_grams?: number;
  daily_steps?: number;
  daily_exercise_minutes?: number;
  target_weight_kg?: number;
  started_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GoalMetric {
  target: number;
  average: number;
  days_met: number;
  days_tracked: number;
  days_total: number;
}

export interface WeightProgress {
  target_kg: number;
  current_kg?: number;
}

export interface GoalProgress {
  from: string;
  to: string;
  days_total: number;
  goal?: Goal;
  daily_calories?: GoalMetric;
  daily_protein_grams?: GoalMetric;
  daily_carbs_grams?: GoalMetric;
  daily_fat_grams?: GoalMetric;
  daily_fiber_grams?: GoalMetric;
  daily_steps?: GoalMetric;
  daily_exercise_minutes?: GoalMetric;
  weight_progress?: WeightProgress;
}

export interface UpsertGoalRequest {
  daily_calories?: number;
  daily_protein_grams?: number;
  daily_carbs_grams?: number;
  daily_fat_grams?: number;
  daily_fiber_grams?: number;
  daily_steps?: number;
  daily_exercise_minutes?: number;
  target_weight_kg?: number;
  started_at?: string;
}

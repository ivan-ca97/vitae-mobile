export interface MealsSummary {
  total_calories: number;
  total_protein_grams: number;
  total_carbs_grams: number;
  total_fat_grams: number;
  total_fiber_grams: number;
  count: number;
}

export interface ExerciseSummary {
  total_calories_burned: number;
  total_steps: number;
  total_duration_seconds: number;
  total_distance_meters: number;
  count: number;
}

export interface WeightSummary {
  weight_kg?: number;
  body_fat_percentage?: number;
}

export interface GoalsSummary {
  daily_calories?: number;
  daily_protein_grams?: number;
  daily_carbs_grams?: number;
  daily_fat_grams?: number;
  daily_fiber_grams?: number;
  daily_steps?: number;
  daily_exercise_minutes?: number;
  target_weight_kg?: number;
}

export interface DailySummary {
  date: string;
  closed: boolean;
  meals: MealsSummary;
  exercise: ExerciseSummary;
  weight?: WeightSummary;
  goals?: GoalsSummary;
  estimated_bmr?: number;
  steps_calories_burned?: number;
  caloric_balance?: number;
}

export interface DailySummaryRangeResponse {
  data: DailySummary[];
}

export interface DayClosureResponse {
  date: string;
  closed: boolean;
}

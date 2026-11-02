import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import * as mealsApi from "@/lib/api/meals";
import type {
  CreateMealRequest,
  UpdateMealRequest,
  MealPreviewItem,
} from "@/lib/types/meal";

export function useMeals(date: string) {
  return useQuery({
    queryKey: ["meals", date],
    queryFn: () => mealsApi.getMeals({ date }),
  });
}

export function useMeal(id: string) {
  return useQuery({
    queryKey: ["meal", id],
    queryFn: () => mealsApi.getMeal(id),
    enabled: !!id,
  });
}

export function useMealTypes(hour?: number) {
  return useQuery({
    queryKey: ["meal-types", hour],
    queryFn: () => mealsApi.getMealTypes(hour),
  });
}

/** Macros en vivo para una lista de items. Solo consulta items con quantity > 0. */
/** Con mealId, la vista previa de editar esa comida. */
export function useMealPreview(items: MealPreviewItem[], mealId?: string) {
  // Un item se mide en una unidad o en una porcion del alimento.
  const valid = items.filter((i) => i.food_id && i.quantity > 0 && (i.unit || i.portion_id));
  return useQuery({
    queryKey: ["meal-preview", mealId ?? "new", valid],
    queryFn: () => mealsApi.previewMealMacros({ items: valid }, mealId),
    enabled: valid.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useCreateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMealRequest) => mealsApi.createMeal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals"] });
      qc.invalidateQueries({ queryKey: ["daily"] });
    },
  });
}

export function useUpdateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMealRequest }) =>
      mealsApi.updateMeal(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals"] });
      qc.invalidateQueries({ queryKey: ["meal"] });
      qc.invalidateQueries({ queryKey: ["daily"] });
    },
  });
}

export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mealsApi.deleteMeal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals"] });
      qc.invalidateQueries({ queryKey: ["daily"] });
    },
  });
}

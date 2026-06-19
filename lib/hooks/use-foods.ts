import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import * as foodsApi from "@/lib/api/foods";
import type { CreateFoodRequest, UpdateFoodRequest } from "@/lib/types/food";

export function useFoods(q: string) {
  return useQuery({
    queryKey: ["foods", q],
    queryFn: () => foodsApi.getFoods({ q: q || undefined, limit: 30 }),
    placeholderData: keepPreviousData,
  });
}

export function useFood(id: string) {
  return useQuery({
    queryKey: ["food", id],
    queryFn: () => foodsApi.getFood(id),
    enabled: !!id,
  });
}

export function useCreateFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFoodRequest) => foodsApi.createFood(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["foods"] }),
  });
}

export function useUpdateFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFoodRequest }) =>
      foodsApi.updateFood(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["foods"] });
      qc.invalidateQueries({ queryKey: ["food"] });
    },
  });
}

export function useDeleteFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => foodsApi.deleteFood(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["foods"] }),
  });
}

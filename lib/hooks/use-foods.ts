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

/** Un alimento propio, o el de otro usuario cuando se da su dueno. */
export function useFood(id: string, ownerId?: string) {
  return useQuery({
    queryKey: ["food", id, ownerId ?? "own"],
    queryFn: () => foodsApi.getFood(id, ownerId),
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
    mutationFn: ({ id, data, ownerId }: { id: string; data: UpdateFoodRequest; ownerId?: string }) =>
      foodsApi.updateFood(id, data, ownerId),
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

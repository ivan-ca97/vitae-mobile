import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as weightApi from "@/lib/api/weight";
import type { CreateWeightRequest } from "@/lib/types/weight";

export function useWeightEntries() {
  return useQuery({
    queryKey: ["weight"],
    queryFn: () => weightApi.getWeightEntries({ limit: 30 }),
  });
}

export function useCreateWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWeightRequest) => weightApi.createWeightEntry(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weight"] });
      qc.invalidateQueries({ queryKey: ["daily"] });
    },
  });
}

export function useDeleteWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => weightApi.deleteWeightEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weight"] });
      qc.invalidateQueries({ queryKey: ["daily"] });
    },
  });
}

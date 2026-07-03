import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as aiApi from "@/lib/api/ai";
import type { EstimateMealRequest } from "@/lib/types/ai";

export function useEstimateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EstimateMealRequest) => aiApi.estimateMeal(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-usage", "me"] }),
  });
}

export function useMyAiUsage() {
  return useQuery({
    queryKey: ["ai-usage", "me"],
    queryFn: () => aiApi.getMyAiUsage(),
    retry: false, // si la feature está off (404) no reintentar
  });
}

export function useSetAiSelfLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (selfLimitUsd: number | null) =>
      aiApi.setAiSelfLimit({ self_limit_usd: selfLimitUsd }),
    onSuccess: (usage) => qc.setQueryData(["ai-usage", "me"], usage),
  });
}

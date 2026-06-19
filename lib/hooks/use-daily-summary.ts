import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import * as dailyApi from "@/lib/api/daily";

export function useDailySummary(date: string) {
  return useQuery({
    queryKey: ["daily", date],
    queryFn: () => dailyApi.getDailySummary(date),
  });
}

export function useDailySummaryRange(from: string, to: string) {
  return useQuery({
    queryKey: ["daily-range", from, to],
    queryFn: () => dailyApi.getDailySummaryRange(from, to),
    placeholderData: keepPreviousData,
  });
}

function invalidateDaily(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["daily"] });
  qc.invalidateQueries({ queryKey: ["daily-range"] });
}

export function useCloseDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => dailyApi.closeDay(date),
    onSuccess: () => invalidateDaily(qc),
  });
}

export function useOpenDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => dailyApi.openDay(date),
    onSuccess: () => invalidateDaily(qc),
  });
}

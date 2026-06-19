import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import * as api from "@/lib/api/body-measurements";
import type { UpsertBodyMeasurementRequest } from "@/lib/types/body-measurement";

export function useBodyMeasurements(params: { from?: string; to?: string; type?: string }) {
  return useQuery({
    queryKey: ["body-measurements", params],
    queryFn: () => api.getBodyMeasurements(params),
    enabled: !!(params.from || params.to || params.type),
    placeholderData: keepPreviousData,
  });
}

export function useUpsertBodyMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, type, data }: { date: string; type: string; data: UpsertBodyMeasurementRequest }) =>
      api.upsertBodyMeasurement(date, type, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["body-measurements"] }),
  });
}

export function useDeleteBodyMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, type }: { date: string; type: string }) =>
      api.deleteBodyMeasurement(date, type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["body-measurements"] }),
  });
}

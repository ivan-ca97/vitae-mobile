import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as photosApi from "@/lib/api/daily-photos";

export function useDailyPhotos(date: string) {
  return useQuery({
    queryKey: ["daily-photos", date],
    queryFn: () => photosApi.getDailyPhotos(date),
  });
}

/** Registra una foto del dia ya subida (URL publica). */
export function useCreateDailyPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ url, date, name }: { url: string; date: string; name?: string }) =>
      photosApi.createDailyPhoto({ url, date, name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily-photos"] }),
  });
}

export function useDeleteDailyPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => photosApi.deleteDailyPhoto(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily-photos"] }),
  });
}

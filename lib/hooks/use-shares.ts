import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as sharesApi from "@/lib/api/shares";
import type { CreateShareRequest } from "@/lib/types/share";

export function useOwnedShares() {
  return useQuery({
    queryKey: ["shares", "owned"],
    queryFn: () => sharesApi.getOwnedShares(),
  });
}

export function useReceivedShares() {
  return useQuery({
    queryKey: ["shares", "received"],
    queryFn: () => sharesApi.getReceivedShares(),
  });
}

export function useCreateShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateShareRequest) => sharesApi.createShare(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shares"] }),
  });
}

export function useUpdateShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, canWrite }: { id: string; canWrite: boolean }) =>
      sharesApi.updateShare(id, { can_write: canWrite }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shares"] }),
  });
}

export function useDeleteShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sharesApi.deleteShare(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shares"] }),
  });
}

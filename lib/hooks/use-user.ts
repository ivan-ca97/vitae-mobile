import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as userApi from "@/lib/api/user";
import type { UpdateUserRequest } from "@/lib/types/user";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => userApi.getProfile(),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserRequest) => userApi.updateProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["daily"] });
    },
  });
}

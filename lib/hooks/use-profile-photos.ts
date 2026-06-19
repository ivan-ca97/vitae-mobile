import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as profilePhotosApi from "@/lib/api/profile-photos";

export function useProfilePhotos() {
  return useQuery({
    queryKey: ["profile-photos"],
    queryFn: () => profilePhotosApi.getProfilePhotos({ limit: 20 }),
  });
}

/** Registra una foto de perfil ya subida (URL publica). Actualiza el perfil del usuario. */
export function useCreateProfilePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => profilePhotosApi.createProfilePhoto({ url }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["profile-photos"] });
    },
  });
}

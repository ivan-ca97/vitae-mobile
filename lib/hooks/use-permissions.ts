import { useQuery } from "@tanstack/react-query";
import { getMyPermissions } from "@/lib/api/permissions";

/** Los permisos que el usuario puede compartir. */
export function useShareablePermissions() {
  return useQuery({
    queryKey: ["permissions", "shareable"],
    queryFn: () => getMyPermissions(true),
    staleTime: 5 * 60 * 1000,
  });
}

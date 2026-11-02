import { userFetch } from "./client";
import type { PermissionDefinition } from "@/lib/types/permission";

/** Lo que los roles del usuario le permiten hacer; con shareable, solo lo que puede compartir. */
export function getMyPermissions(shareable: boolean): Promise<{ items: PermissionDefinition[] }> {
  const query = shareable ? "?shareable=true" : "";
  return userFetch<{ items: PermissionDefinition[] }>(`/permissions${query}`);
}

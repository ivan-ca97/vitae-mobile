import { apiFetch } from "./client";
import type { PublicUser } from "@/lib/types/user";

/** Usuarios que eligieron que los encuentren y cuyo username contiene el texto. */
export function searchUsers(text: string): Promise<{ items: PublicUser[] }> {
  return apiFetch<{ items: PublicUser[] }>(`/users/search?q=${encodeURIComponent(text)}&limit=8`);
}

/** El username de un usuario que el actual puede ver; no encontrado para cualquier otro. */
export function getUserProfile(id: string): Promise<PublicUser> {
  return apiFetch<PublicUser>(`/users/${id}/profile`);
}

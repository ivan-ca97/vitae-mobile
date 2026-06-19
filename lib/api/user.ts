import { userFetch } from "./client";
import type { User, UpdateUserRequest } from "@/lib/types/user";

export function getProfile(): Promise<User> {
  return userFetch<User>("");
}

export function updateProfile(data: UpdateUserRequest): Promise<User> {
  return userFetch<User>("", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

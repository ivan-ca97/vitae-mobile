import { userFetch } from "./client";
import type {
  ProfilePhoto,
  ProfilePhotoPage,
  CreateProfilePhotoRequest,
} from "@/lib/types/profile-photo";

export function getProfilePhotos(params?: { limit?: number; offset?: number }): Promise<ProfilePhotoPage> {
  const search = new URLSearchParams();
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.offset) search.set("offset", String(params.offset));
  return userFetch<ProfilePhotoPage>(`/profile-photos?${search}`);
}

export function createProfilePhoto(data: CreateProfilePhotoRequest): Promise<ProfilePhoto> {
  return userFetch<ProfilePhoto>("/profile-photos", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

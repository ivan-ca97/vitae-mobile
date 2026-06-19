import type { PaginatedResponse } from "./api";

export interface ProfilePhoto {
  id: string;
  url: string;
  created_at: string;
}

export type ProfilePhotoPage = PaginatedResponse<ProfilePhoto>;

export interface CreateProfilePhotoRequest {
  url: string;
}

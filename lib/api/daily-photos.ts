import { userFetch } from "./client";
import type {
  DailyPhoto,
  DailyPhotoListResponse,
  CreateDailyPhotoRequest,
  UpdateDailyPhotoRequest,
} from "@/lib/types/daily-photo";

export function getDailyPhotos(date: string): Promise<DailyPhotoListResponse> {
  return userFetch<DailyPhotoListResponse>(`/daily/photos?date=${date}`);
}

export function createDailyPhoto(data: CreateDailyPhotoRequest): Promise<DailyPhoto> {
  return userFetch<DailyPhoto>("/daily/photos", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateDailyPhoto(id: string, data: UpdateDailyPhotoRequest): Promise<DailyPhoto> {
  return userFetch<DailyPhoto>(`/daily/photos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteDailyPhoto(id: string): Promise<void> {
  return userFetch<void>(`/daily/photos/${id}`, { method: "DELETE" });
}

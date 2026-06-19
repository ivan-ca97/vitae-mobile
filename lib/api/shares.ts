import { userFetch } from "./client";
import type {
  Share,
  ShareListResponse,
  CreateShareRequest,
  UpdateShareRequest,
} from "@/lib/types/share";

export function getOwnedShares(): Promise<ShareListResponse> {
  return userFetch<ShareListResponse>("/shares");
}

export function getReceivedShares(): Promise<ShareListResponse> {
  return userFetch<ShareListResponse>("/shares/received");
}

export function createShare(data: CreateShareRequest): Promise<Share> {
  return userFetch<Share>("/shares", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateShare(id: string, data: UpdateShareRequest): Promise<Share> {
  return userFetch<Share>(`/shares/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteShare(id: string): Promise<void> {
  return userFetch<void>(`/shares/${id}`, { method: "DELETE" });
}

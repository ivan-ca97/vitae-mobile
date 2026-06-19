import * as FileSystem from "expo-file-system/legacy";
import { userFetch } from "./client";
import type { UploadURLRequest, UploadURLResponse } from "@/lib/types/media";

export function getUploadUrl(data: UploadURLRequest): Promise<UploadURLResponse> {
  return userFetch<UploadURLResponse>("/media/upload-url", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

function normalizeContentType(mimeType?: string): string {
  if (mimeType === "image/png") return "image/png";
  if (mimeType === "image/webp") return "image/webp";
  if (mimeType === "image/heic" || mimeType === "image/heif") return mimeType;
  return "image/jpeg";
}

function extFor(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/heic") return "heic";
  if (contentType === "image/heif") return "heif";
  return "jpg";
}

/**
 * Sube un archivo local (uri `file://...` del image picker) a R2 via PUT presignado.
 * Devuelve la URL publica del objeto. NO usa userFetch para el PUT: la URL ya viene firmada.
 */
export async function uploadImageAsync(
  uri: string,
  mimeType?: string,
  fileName?: string | null
): Promise<string> {
  const contentType = normalizeContentType(mimeType);
  const filename = fileName || `photo.${extFor(contentType)}`;

  const { upload_url, public_url } = await getUploadUrl({ filename, content_type: contentType });

  // En React Native no se puede armar un Blob desde un file:// para el PUT.
  // Usamos expo-file-system, que sube el binario del archivo directamente.
  const res = await FileSystem.uploadAsync(upload_url, uri, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": contentType },
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`No se pudo subir la imagen (${res.status})`);
  }
  return public_url;
}

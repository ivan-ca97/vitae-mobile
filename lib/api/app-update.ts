import { API_BASE } from "./client";

// Info de la ultima version nativa publicada (APK). La sirve el backend en
// GET /api/v1/app/latest?platform=android. Contrato:
//   { "version": "1.1.0", "apk_url": "https://.../vitae-1.1.0.apk",
//     "notes": "opcional", "mandatory": false }
// El endpoint NO requiere auth (se consulta antes/independiente del login).
export interface LatestRelease {
  version: string;
  apk_url: string;
  notes?: string;
  mandatory?: boolean;
}

export async function fetchLatestRelease(): Promise<LatestRelease | null> {
  const res = await fetch(`${API_BASE}/api/v1/app/latest?platform=android`);
  if (!res.ok) return null;
  const data = (await res.json()) as Partial<LatestRelease>;
  if (!data.version || !data.apk_url) return null;
  return data as LatestRelease;
}

// true si `latest` es una version semver mayor que `current` (ej: "1.2.0" > "1.1.9").
// Ignora sufijos no numericos por segmento (ej: "1.0.0-rc1" -> 1.0.0).
export function isNewerVersion(latest: string, current: string): boolean {
  const a = latest.split(".").map((n) => parseInt(n, 10) || 0);
  const b = current.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

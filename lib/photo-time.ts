import type * as ImagePicker from "expo-image-picker";

/** Cuando se saco una foto, en hora de Argentina. */
export interface PhotoTime {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
}

const AR_OFFSET_MS = 3 * 60 * 60 * 1000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Los telefonos nombran las fotos con la fecha y hora: "20261102_134510.jpg"
// (Samsung y la mayoria, en hora local) o "PXL_20261102_164510123.jpg" (Pixel, en UTC).
function fromFileName(fileName: string): PhotoTime | null {
  const match = fileName.match(/(\d{4})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  if (Number(h) > 23 || Number(mi) > 59 || Number(mo) > 12 || Number(d) > 31) return null;
  if (/^PXL_/i.test(fileName)) {
    const utc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
    const ar = new Date(utc - AR_OFFSET_MS);
    return {
      date: `${ar.getUTCFullYear()}-${pad(ar.getUTCMonth() + 1)}-${pad(ar.getUTCDate())}`,
      time: `${pad(ar.getUTCHours())}:${pad(ar.getUTCMinutes())}`,
    };
  }
  return { date: `${y}-${mo}-${d}`, time: `${h}:${mi}` };
}

// EXIF guarda la hora de la camara, que es la local: "2026:11:02 13:45:10".
function fromExif(exif: Record<string, unknown> | null | undefined): PhotoTime | null {
  const raw = exif?.DateTimeOriginal ?? exif?.DateTimeDigitized ?? exif?.DateTime;
  if (typeof raw !== "string") return null;
  const match = raw.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  return { date: `${y}-${mo}-${d}`, time: `${h}:${mi}` };
}

/** La foto mas temprana entre las elegidas, por su nombre o, si no lo dice, por su EXIF. */
export function earliestPhotoTime(assets: ImagePicker.ImagePickerAsset[]): PhotoTime | null {
  let earliest: PhotoTime | null = null;
  for (const asset of assets) {
    const taken =
      (asset.fileName ? fromFileName(asset.fileName) : null) ??
      fromExif(asset.exif as Record<string, unknown> | null | undefined);
    if (!taken) continue;
    if (!earliest || `${taken.date}T${taken.time}` < `${earliest.date}T${earliest.time}`) earliest = taken;
  }
  return earliest;
}

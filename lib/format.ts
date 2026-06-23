export function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

export function fmtNumber(n: number, decimals = 0): string {
  return n.toFixed(decimals);
}

// ─────────────────────────── Fecha/hora ───────────────────────────
// Convención: los datetime (eaten_at, started_at, created_at, etc.) se manejan
// en UTC explícito y se MUESTRAN en hora de Argentina (UTC-3, sin horario de verano).
const AR_OFFSET_MS = 3 * 60 * 60 * 1000;

// Parsea un ISO tratándolo como UTC explícito si no trae zona (Z u offset).
function parseUtc(iso: string): Date {
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(hasTz ? iso : `${iso}Z`);
}

// Instante corrido a la hora de pared argentina (leer con getUTC*).
function arParts(iso: string): Date {
  return new Date(parseUtc(iso).getTime() - AR_OFFSET_MS);
}

function arNow(): Date {
  return new Date(Date.now() - AR_OFFSET_MS);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// "HH:MM" en hora de Argentina a partir de un datetime UTC.
export function fmtTime(utcIso?: string | null): string {
  if (!utcIso) return "";
  const a = arParts(utcIso);
  return `${pad(a.getUTCHours())}:${pad(a.getUTCMinutes())}`;
}

// "dd/mm/yyyy HH:MM" en hora de Argentina.
export function fmtDateTime(utcIso?: string | null): string {
  if (!utcIso) return "";
  const a = arParts(utcIso);
  return `${pad(a.getUTCDate())}/${pad(a.getUTCMonth() + 1)}/${a.getUTCFullYear()} ${pad(a.getUTCHours())}:${pad(a.getUTCMinutes())}`;
}

// Hora del día (0-23) en Argentina — para sugerencias por horario.
export function nowHourAR(): number {
  return arNow().getUTCHours();
}

// Etiqueta de un día calendario (YYYY-MM-DD).
export function fmtDate(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// Día de hoy (YYYY-MM-DD) en hora de Argentina.
export function todayStr(): string {
  const a = arNow();
  return `${a.getUTCFullYear()}-${pad(a.getUTCMonth() + 1)}-${pad(a.getUTCDate())}`;
}

// YYYY-MM-DD de hace n días, en hora de Argentina.
export function daysAgoStr(n: number): string {
  const a = arNow();
  a.setUTCDate(a.getUTCDate() - n);
  return `${a.getUTCFullYear()}-${pad(a.getUTCMonth() + 1)}-${pad(a.getUTCDate())}`;
}

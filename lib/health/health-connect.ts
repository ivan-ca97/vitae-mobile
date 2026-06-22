import {
  initialize,
  getSdkStatus,
  requestPermission,
  getGrantedPermissions,
  readRecords,
  openHealthConnectSettings,
  SdkAvailabilityStatus,
  type Permission,
} from "react-native-health-connect";

// ─────────────────────────── Tipos del payload (= contrato backend) ───────────────────────────
// Coincide con POST /users/{userId}/import/health-connect (ver companion-app Kotlin).
export interface HcWeight {
  id: string;
  kilograms: number;
  time: string;
}
export interface HcExercise {
  id: string;
  type: string;
  start_time: string;
  end_time: string;
  duration_seconds: number | null;
  distance_meters: number | null;
  title: string;
}
export interface HcSteps {
  id: string;
  count: number;
  start_time: string;
  end_time: string;
}
export interface HcSleepStage {
  stage: string;
  start_time: string;
  end_time: string;
}
export interface HcSleep {
  id: string;
  start_time: string;
  end_time: string;
  stages: HcSleepStage[];
}
export interface HcHeartRateSample {
  time: string;
  bpm: number;
}
export interface HcHeartRate {
  id: string;
  samples: HcHeartRateSample[];
}

export interface HealthPayload {
  synced_at: string;
  app_version: string;
  weight: HcWeight[];
  exercise_sessions: HcExercise[];
  steps: HcSteps[];
  sleep: HcSleep[];
  heart_rate: HcHeartRate[];
}

export interface RawRecords {
  weight: any[];
  exercise: any[];
  steps: any[];
  sleep: any[];
  heartRate: any[];
}

// ─────────────────────────── Permisos ───────────────────────────
export const READ_PERMISSIONS: Permission[] = [
  { accessType: "read", recordType: "Weight" },
  { accessType: "read", recordType: "ExerciseSession" },
  { accessType: "read", recordType: "Steps" },
  { accessType: "read", recordType: "SleepSession" },
  { accessType: "read", recordType: "HeartRate" },
  { accessType: "read", recordType: "Distance" },
];

export { initialize, getSdkStatus, requestPermission, getGrantedPermissions, openHealthConnectSettings };

export function sdkStatusLabel(status: number): string {
  switch (status) {
    case SdkAvailabilityStatus.SDK_AVAILABLE:
      return "Disponible";
    case SdkAvailabilityStatus.SDK_UNAVAILABLE:
      return "No disponible (Health Connect no instalado)";
    case SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED:
      return "Requiere actualizar Health Connect";
    default:
      return `Desconocido (${status})`;
  }
}

// ─────────────────────────── Mapeos (portados de HealthMappers.kt) ───────────────────────────
// Constantes de ExerciseSessionRecord de Health Connect.
const EXERCISE_TYPE_MAP: Record<number, string> = {
  56: "running", // RUNNING
  57: "running", // RUNNING_TREADMILL
  79: "walking", // WALKING
  35: "walking", // HIKING
  8: "cycling", // BIKING
  9: "cycling", // BIKING_STATIONARY
  70: "weightlifting", // STRENGTH_TRAINING
  81: "weightlifting", // WEIGHTLIFTING
};
function mapExerciseType(t: number): string {
  return EXERCISE_TYPE_MAP[t] ?? "other";
}

// Constantes de SleepSessionRecord (stage types).
const SLEEP_STAGE_MAP: Record<number, string> = {
  1: "awake", // AWAKE
  7: "awake", // AWAKE_IN_BED
  3: "out_of_bed", // OUT_OF_BED
  4: "light", // LIGHT
  5: "deep", // DEEP
  6: "rem", // REM
  2: "sleeping", // SLEEPING
};
function mapSleepStage(s: number): string {
  return SLEEP_STAGE_MAP[s] ?? "unknown";
}

// ─────────────────────────── Dedup de pasos por fuente ───────────────────────────
// Health Connect puede tener varias fuentes escribiendo pasos solapados (ej. app
// Samsung Health + reloj Galaxy). Sumar todas duplica el conteo. Cada fuente por
// separado ≈ el conteo real, asi que si hay >1 fuente nos quedamos con UNA.
export interface StepsOriginInfo {
  origins: Record<string, { records: number; steps: number }>;
  primary: string | null;
}

function summarizeOrigins(records: any[]): Record<string, { records: number; steps: number }> {
  const out: Record<string, { records: number; steps: number }> = {};
  for (const r of records) {
    const pkg = r.metadata?.dataOrigin || "desconocido";
    if (!out[pkg]) out[pkg] = { records: 0, steps: 0 };
    out[pkg].records += 1;
    out[pkg].steps += r.count ?? 0;
  }
  return out;
}

function pickPrimaryStepsOrigin(summary: Record<string, { records: number; steps: number }>): string | null {
  const origins = Object.keys(summary);
  if (origins.length === 0) return null;
  if (origins.length === 1) return origins[0];
  // Preferir Samsung Health si esta presente (cubre los pasos del reloj).
  const samsung = origins.find((o) => /shealth|samsung/i.test(o));
  if (samsung) return samsung;
  // Si no, la fuente con mas registros (mas granular = normalmente la app del telefono).
  return origins.reduce((a, b) => (summary[b].records > summary[a].records ? b : a));
}

function durationSeconds(start: string, end: string): number | null {
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (isNaN(s) || isNaN(e)) return null;
  const sec = Math.round((e - s) / 1000);
  return sec > 0 ? sec : null;
}

// ─────────────────────────── Lectura ───────────────────────────
async function readAll(recordType: string, startTime: string, endTime: string): Promise<any[]> {
  const out: any[] = [];
  let pageToken: string | undefined;
  do {
    const res: any = await readRecords(recordType as any, {
      timeRangeFilter: { operator: "between", startTime, endTime },
      pageToken,
      pageSize: 1000,
    });
    out.push(...(res.records ?? []));
    pageToken = res.pageToken;
  } while (pageToken);
  return out;
}

/**
 * Lee todos los tipos en la ventana [startTime, endTime] (ISO) y arma el payload
 * exacto que espera el backend, ademas de devolver los registros crudos para debug.
 */
export async function readWindow(
  startTime: string,
  endTime: string,
  appVersion: string
): Promise<{ raw: RawRecords; payload: HealthPayload; stepsDebug: StepsOriginInfo }> {
  const [weight, exercise, steps, sleep, heartRate] = await Promise.all([
    readAll("Weight", startTime, endTime),
    readAll("ExerciseSession", startTime, endTime),
    readAll("Steps", startTime, endTime),
    readAll("SleepSession", startTime, endTime),
    readAll("HeartRate", startTime, endTime),
  ]);

  // Filtrar pasos a una sola fuente para no duplicar (ver arriba).
  const stepsOrigins = summarizeOrigins(steps);
  const stepsPrimary = pickPrimaryStepsOrigin(stepsOrigins);
  const stepsUsed =
    stepsPrimary && Object.keys(stepsOrigins).length > 1
      ? steps.filter((r) => (r.metadata?.dataOrigin || "desconocido") === stepsPrimary)
      : steps;

  const payload: HealthPayload = {
    synced_at: new Date().toISOString(),
    app_version: appVersion,
    weight: weight.map((r) => ({
      id: r.metadata?.id,
      kilograms: r.weight?.inKilograms,
      time: r.time,
    })),
    exercise_sessions: exercise.map((r) => ({
      id: r.metadata?.id,
      type: mapExerciseType(r.exerciseType),
      start_time: r.startTime,
      end_time: r.endTime,
      duration_seconds: durationSeconds(r.startTime, r.endTime),
      distance_meters: null,
      title: r.title ?? "",
    })),
    steps: stepsUsed.map((r) => ({
      id: r.metadata?.id,
      count: r.count,
      start_time: r.startTime,
      end_time: r.endTime,
    })),
    sleep: sleep.map((r) => ({
      id: r.metadata?.id,
      start_time: r.startTime,
      end_time: r.endTime,
      stages: (r.stages ?? []).map((st: any) => ({
        stage: mapSleepStage(st.stage),
        start_time: st.startTime,
        end_time: st.endTime,
      })),
    })),
    heart_rate: heartRate.map((r) => ({
      id: r.metadata?.id,
      samples: (r.samples ?? []).map((s: any) => ({ time: s.time, bpm: s.beatsPerMinute })),
    })),
  };

  return {
    raw: { weight, exercise, steps: stepsUsed, sleep, heartRate },
    payload,
    stepsDebug: { origins: stepsOrigins, primary: stepsPrimary },
  };
}

import {
  initialize,
  getSdkStatus,
  requestPermission,
  getGrantedPermissions,
  readRecords,
  aggregateRecord,
  aggregateGroupByPeriod,
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
  steps: number | null; // pasos en la ventana de la sesion (agregado HC); util en caminatas
  title: string;
  data_origin: string; // package que escribio la sesion (ej. "hevy", "com.sec...shealth")
}
export interface HcSteps {
  id: string;
  count: number;
  start_time: string;
  end_time: string;
}
// Total diario deduplicado por HC (modelo correcto, ver BACKEND_STEPS_DAILY.md).
export interface HcStepsDaily {
  date: string; // YYYY-MM-DD
  count: number;
  source: string; // "health_connect"
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
  steps: HcSteps[]; // crudo (deprecado, se mantiene por compatibilidad)
  steps_daily: HcStepsDaily[]; // total diario deduplicado (modelo nuevo)
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
  aggregateTotal: number | null; // total dedup nativo de HC (ground truth)
  dailySource: string | null; // origen preferido usado para steps_daily (app de salud)
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

function pickPrimaryStepsOrigin(
  summary: Record<string, { records: number; steps: number }>,
  aggregateTotal: number | null
): string | null {
  const origins = Object.keys(summary);
  if (origins.length === 0) return null;
  if (origins.length === 1) return origins[0];
  // Las fuentes pueden tener totales MUY distintos (una parcial, otra completa).
  // La verdad es el agregado dedup de HC: elegimos la fuente cuyo total se le acerca.
  if (aggregateTotal != null && aggregateTotal > 0) {
    return origins.reduce((a, b) =>
      Math.abs(summary[b].steps - aggregateTotal) < Math.abs(summary[a].steps - aggregateTotal) ? b : a
    );
  }
  // Sin agregado: la fuente con mas pasos (la mas completa).
  return origins.reduce((a, b) => (summary[b].steps > summary[a].steps ? b : a));
}

export const HC_SOURCE = "health_connect";

// Totales de pasos por dia, deduplicados por HC (combina todas las fuentes por su
// prioridad). Es el numero correcto: ninguna fuente individual cubre todos los dias.
async function dailyStepTotals(
  startTime: string,
  endTime: string,
  dataOriginFilter?: string[]
): Promise<HcStepsDaily[]> {
  try {
    const req: any = {
      recordType: "Steps",
      timeRangeFilter: { operator: "between", startTime, endTime },
      timeRangeSlicer: { period: "DAYS", length: 1 },
    };
    if (dataOriginFilter && dataOriginFilter.length) req.dataOriginFilter = dataOriginFilter;
    const groups: any[] = await aggregateGroupByPeriod(req);
    return groups
      .map((g) => ({
        date: (g.startTime || "").slice(0, 10),
        count: g.result?.COUNT_TOTAL ?? 0,
        source: HC_SOURCE,
      }))
      .filter((d) => d.date && d.count > 0);
  } catch {
    return [];
  }
}

// Origen de la "app de salud" del teléfono (Samsung Health, etc.) que escribe el
// total diario que ve el usuario. Es el que hay que preferir para que coincida.
function preferredHealthAppOrigin(
  origins: Record<string, { records: number; steps: number }>
): string | null {
  return Object.keys(origins).find((o) => /shealth|samsung/i.test(o)) ?? null;
}

// Distancia total (m) en una ventana, via agregado de HC (deduplicado entre fuentes).
async function aggregateDistanceMeters(startTime: string, endTime: string): Promise<number | null> {
  try {
    const res: any = await aggregateRecord({
      recordType: "Distance",
      timeRangeFilter: { operator: "between", startTime, endTime },
    });
    const m = res?.DISTANCE?.inMeters;
    return typeof m === "number" && m > 0 ? Math.round(m) : null;
  } catch {
    return null;
  }
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

  // Total de pasos segun el agregado nativo de HC (ground truth, deduplicado por
  // prioridad de fuentes). Lo usamos para elegir la fuente correcta.
  let stepsAggregateTotal: number | null = null;
  try {
    const agg: any = await aggregateRecord({
      recordType: "Steps",
      timeRangeFilter: { operator: "between", startTime, endTime },
    });
    stepsAggregateTotal = typeof agg?.COUNT_TOTAL === "number" ? agg.COUNT_TOTAL : null;
  } catch {
    // sin permiso/datos
  }

  // Filtrar pasos a una sola fuente para no duplicar: la mas cercana al agregado HC.
  const stepsOrigins = summarizeOrigins(steps);
  const stepsPrimary = pickPrimaryStepsOrigin(stepsOrigins, stepsAggregateTotal);
  const stepsUsed =
    stepsPrimary && Object.keys(stepsOrigins).length > 1
      ? steps.filter((r) => (r.metadata?.dataOrigin || "desconocido") === stepsPrimary)
      : steps;

  // No enviamos las caminatas auto-detectadas: se solapan con el total diario de
  // pasos ("Caminata cotidiana") y no aportan pasos confiables. Mantenemos los
  // workouts deliberados (ciclismo, running, pesas, etc.).
  const exerciseToSend = exercise.filter((r) => mapExerciseType(r.exerciseType) !== "walking");

  // Distancia por sesion de ejercicio (agregado HC, dedup entre fuentes).
  const exerciseDistances = await Promise.all(
    exerciseToSend.map((r) => aggregateDistanceMeters(r.startTime, r.endTime))
  );

  // Pasos diarios. Preferimos el total de la app de salud del telefono (ej. Samsung
  // Health) porque coincide EXACTO con lo que ve el usuario; si un dia no tiene esa
  // fuente en HC, caemos al agregado de todas las fuentes.
  const allDaily = await dailyStepTotals(startTime, endTime);
  const prefOrigin = preferredHealthAppOrigin(stepsOrigins);
  let stepsDaily = allDaily;
  if (prefOrigin) {
    const prefDaily = await dailyStepTotals(startTime, endTime, [prefOrigin]);
    const prefByDate: Record<string, number> = {};
    for (const d of prefDaily) prefByDate[d.date] = d.count;
    stepsDaily = allDaily.map((d) =>
      prefByDate[d.date] != null ? { ...d, count: prefByDate[d.date] } : d
    );
  }

  const payload: HealthPayload = {
    synced_at: new Date().toISOString(),
    app_version: appVersion,
    weight: weight.map((r) => ({
      id: r.metadata?.id,
      kilograms: r.weight?.inKilograms,
      time: r.time,
    })),
    exercise_sessions: exerciseToSend.map((r, i) => ({
      id: r.metadata?.id,
      type: mapExerciseType(r.exerciseType),
      start_time: r.startTime,
      end_time: r.endTime,
      duration_seconds: durationSeconds(r.startTime, r.endTime),
      distance_meters: exerciseDistances[i],
      // HC no da pasos por-sesion confiables (Samsung solo guarda total diario;
      // la ventana solo capta el sensor del telefono, que subcuenta). Ver steps_daily.
      steps: null,
      title: r.title ?? "",
      data_origin: r.metadata?.dataOrigin ?? "",
    })),
    steps: stepsUsed.map((r) => ({
      id: r.metadata?.id,
      count: r.count,
      start_time: r.startTime,
      end_time: r.endTime,
    })),
    steps_daily: stepsDaily,
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
    // raw.steps queda SIN filtrar (todas las fuentes) para inspeccion/export;
    // el payload.steps si va deduplicado a una sola fuente.
    raw: { weight, exercise, steps, sleep, heartRate },
    payload,
    stepsDebug: {
      origins: stepsOrigins,
      primary: stepsPrimary,
      aggregateTotal: stepsAggregateTotal,
      dailySource: prefOrigin,
    },
  };
}

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Application from "expo-application";
import {
  initialize,
  getSdkStatus,
  requestPermission,
  getGrantedPermissions,
  openHealthConnectSettings,
  readWindow,
  sdkStatusLabel,
  READ_PERMISSIONS,
  type RawRecords,
  type HealthPayload,
  type StepsOriginInfo,
} from "@/lib/health/health-connect";
import { importHealthConnect, type ImportResponse } from "@/lib/api/health-sync";
import { useColors, type Palette } from "@/lib/theme";

const WINDOWS = [
  { label: "1 día", days: 1 },
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
];

export default function HealthDebugScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<number | null>(null);
  const [granted, setGranted] = useState<string[]>([]);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    raw: RawRecords;
    payload: HealthPayload;
    stepsDebug: StepsOriginInfo;
  } | null>(null);
  const [readMs, setReadMs] = useState<number | null>(null);
  const [syncResp, setSyncResp] = useState<ImportResponse | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    const t = new Date().toISOString().slice(11, 19);
    setLog((prev) => [`${t}  ${msg}`, ...prev].slice(0, 50));
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const ok = await initialize();
      addLog(`initialize() → ${ok}`);
      const s = await getSdkStatus();
      setStatus(s);
      addLog(`getSdkStatus() → ${s} (${sdkStatusLabel(s)})`);
    } catch (e: any) {
      addLog(`ERROR status: ${e?.message ?? e}`);
    }
  }, [addLog]);

  const refreshGranted = useCallback(async () => {
    try {
      const perms = await getGrantedPermissions();
      setGranted(perms.map((p: any) => `${p.accessType}:${p.recordType}`));
      addLog(`getGrantedPermissions() → ${perms.length}`);
    } catch (e: any) {
      addLog(`ERROR granted: ${e?.message ?? e}`);
    }
  }, [addLog]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    refreshStatus().then(refreshGranted);
  }, [refreshStatus, refreshGranted]);

  async function askPermissions() {
    try {
      setBusy(true);
      const perms = await requestPermission(READ_PERMISSIONS);
      addLog(`requestPermission() → otorgados ${perms.length}/${READ_PERMISSIONS.length}`);
      await refreshGranted();
    } catch (e: any) {
      addLog(`ERROR requestPermission: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function read() {
    try {
      setBusy(true);
      setSyncResp(null);
      const end = new Date();
      const start = new Date(end.getTime() - days * 86400000);
      const t0 = Date.now();
      const r = await readWindow(
        start.toISOString(),
        end.toISOString(),
        Application.nativeApplicationVersion ?? "0.0.0"
      );
      setReadMs(Date.now() - t0);
      setResult(r);
      const p = r.payload;
      addLog(
        `readWindow ${days}d → W:${p.weight.length} E:${p.exercise_sessions.length} ` +
          `S:${p.steps.length} Sl:${p.sleep.length} HR:${p.heart_rate.length}`
      );
    } catch (e: any) {
      addLog(`ERROR readWindow: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function sync() {
    if (!result) return;
    try {
      setBusy(true);
      const resp = await importHealthConnect(result.payload);
      setSyncResp(resp);
      addLog("import OK → ver resultados abajo");
    } catch (e: any) {
      addLog(`ERROR import: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  const payload = result?.payload;
  const counts = payload
    ? [
        ["weight", payload.weight.length],
        ["exercise", payload.exercise_sessions.length],
        ["steps", payload.steps.length],
        ["sleep", payload.sleep.length],
        ["heart_rate", payload.heart_rate.length],
      ]
    : [];

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.headerBack}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Connect · debug</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {Platform.OS !== "android" ? (
          <Text style={styles.note}>Health Connect solo está disponible en Android.</Text>
        ) : (
          <>
            {/* Estado SDK */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>SDK</Text>
              <Row k="Estado" v={status == null ? "—" : `${status} · ${sdkStatusLabel(status)}`} />
              <Row k="App version" v={Application.nativeApplicationVersion ?? "—"} />
              <View style={styles.btnRow}>
                <Btn label="Refrescar" onPress={refreshStatus} colors={colors} />
                <Btn label="Abrir HC" onPress={() => openHealthConnectSettings()} colors={colors} ghost />
              </View>
            </View>

            {/* Permisos */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Permisos otorgados ({granted.length})</Text>
              {granted.length === 0 ? (
                <Text style={styles.dim}>Ninguno todavía.</Text>
              ) : (
                granted.map((g) => (
                  <Text key={g} style={styles.mono}>
                    • {g}
                  </Text>
                ))
              )}
              <View style={styles.btnRow}>
                <Btn label="Pedir permisos" onPress={askPermissions} colors={colors} />
              </View>
            </View>

            {/* Ventana + lectura */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Lectura</Text>
              <View style={styles.btnRow}>
                {WINDOWS.map((w) => (
                  <Btn
                    key={w.days}
                    label={w.label}
                    onPress={() => setDays(w.days)}
                    colors={colors}
                    active={days === w.days}
                  />
                ))}
              </View>
              <View style={styles.btnRow}>
                <Btn label="Leer datos" onPress={read} colors={colors} />
              </View>
              {readMs != null && <Row k="Tiempo lectura" v={`${readMs} ms`} />}
              {counts.map(([k, v]) => (
                <Row key={k as string} k={k as string} v={String(v)} />
              ))}
            </View>

            {/* Fuentes de pasos (dedup) */}
            {result?.stepsDebug && Object.keys(result.stepsDebug.origins).length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Fuentes de pasos</Text>
                {Object.entries(result.stepsDebug.origins).map(([pkg, info]) => (
                  <Row
                    key={pkg}
                    k={pkg === result.stepsDebug.primary ? `✓ ${pkg}` : pkg}
                    v={`${info.records} regs · ${info.steps} pasos`}
                  />
                ))}
                {Object.keys(result.stepsDebug.origins).length > 1 && (
                  <Text style={styles.dim}>
                    Múltiples fuentes detectadas → se usa solo «{result.stepsDebug.primary}»
                    para no duplicar; el resto se descarta.
                  </Text>
                )}
              </View>
            )}

            {/* Payload / raw */}
            {payload && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>{showRaw ? "Registros crudos" : "Payload backend"}</Text>
                  <TouchableOpacity onPress={() => setShowRaw((s) => !s)} hitSlop={8}>
                    <Text style={styles.link}>{showRaw ? "Ver payload" : "Ver crudo"}</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal style={styles.jsonBox}>
                  <Text style={styles.mono} selectable>
                    {JSON.stringify(showRaw ? result?.raw : payload, null, 2)}
                  </Text>
                </ScrollView>
                <View style={styles.btnRow}>
                  <Btn label="Sincronizar al backend" onPress={sync} colors={colors} />
                </View>
              </View>
            )}

            {/* Resultado del sync */}
            {syncResp && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Resultado import</Text>
                {Object.entries(syncResp).map(([k, v]) => (
                  <Row
                    key={k}
                    k={k}
                    v={`creados ${v.created} · omitidos ${v.skipped} · bloqueados ${v.blocked}`}
                  />
                ))}
              </View>
            )}

            {/* Log */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Log</Text>
              {log.length === 0 ? (
                <Text style={styles.dim}>—</Text>
              ) : (
                log.map((l, i) => (
                  <Text key={i} style={styles.mono}>
                    {l}
                  </Text>
                ))
              )}
            </View>
          </>
        )}

        {busy && (
          <View style={styles.busy}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Text style={styles.rowK}>{k}</Text>
      <Text style={styles.rowV} numberOfLines={2}>
        {v}
      </Text>
    </View>
  );
}

function Btn({
  label,
  onPress,
  colors,
  active,
  ghost,
}: {
  label: string;
  onPress: () => void;
  colors: Palette;
  active?: boolean;
  ghost?: boolean;
}) {
  const bg = ghost ? colors.card : active ? colors.primary : colors.primary;
  const fg = ghost ? colors.foreground : colors.primaryForeground;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: bg,
        opacity: active === false ? 0.5 : 1,
        borderWidth: ghost ? 1 : 0,
        borderColor: colors.border,
      }}
    >
      <Text style={{ color: fg, fontWeight: "600", fontSize: 14 }}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerBack: { fontSize: 15, color: colors.primary, width: 60 },
    headerTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
    content: { padding: 16, gap: 12, paddingBottom: 48 },
    note: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", marginTop: 40 },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      gap: 8,
    },
    cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    cardTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground },
    row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
    rowK: { fontSize: 13, color: colors.mutedForeground },
    rowV: { fontSize: 13, color: colors.foreground, flexShrink: 1, textAlign: "right" },
    dim: { fontSize: 13, color: colors.mutedForeground },
    link: { fontSize: 13, color: colors.primary, fontWeight: "600" },
    mono: {
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
      fontSize: 11,
      color: colors.foreground,
    },
    jsonBox: {
      maxHeight: 280,
      backgroundColor: colors.muted,
      borderRadius: 8,
      padding: 10,
    },
    btnRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    busy: { paddingVertical: 20, alignItems: "center" },
  });

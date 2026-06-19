import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors, type Palette } from "@/lib/theme";
import type { GoalMetric, GoalProgress } from "@/lib/types/goal";

const METRICS: { key: keyof GoalProgress; label: string; unit: string }[] = [
  { key: "daily_calories", label: "Calorias", unit: "kcal" },
  { key: "daily_protein_grams", label: "Proteinas", unit: "g" },
  { key: "daily_carbs_grams", label: "Carbohidratos", unit: "g" },
  { key: "daily_fat_grams", label: "Grasas", unit: "g" },
  { key: "daily_fiber_grams", label: "Fibra", unit: "g" },
  { key: "daily_steps", label: "Pasos", unit: "" },
  { key: "daily_exercise_minutes", label: "Ejercicio", unit: "min" },
];

function MetricRow({ metric, label, unit }: { metric: GoalMetric; label: string; unit: string }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const pct = metric.days_tracked > 0 ? Math.round((metric.days_met / metric.days_tracked) * 100) : 0;
  const suffix = unit ? ` ${unit}` : "";

  return (
    <View style={styles.metric}>
      <View style={styles.metricTop}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>
          {metric.average.toFixed(0)}
          {suffix} / {metric.target.toFixed(0)}
          {suffix}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%` }]} />
      </View>
      <View style={styles.metricBottom}>
        <Text style={styles.metricDays}>
          {metric.days_met}/{metric.days_tracked} dias cumplidos
        </Text>
        <Text style={styles.metricPct}>{pct}%</Text>
      </View>
    </View>
  );
}

export function GoalProgressCard({ progress }: { progress: GoalProgress }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const activeMetrics = METRICS.filter((m) => progress[m.key] != null);
  if (activeMetrics.length === 0 && !progress.weight_progress) return null;

  const wp = progress.weight_progress;
  const diff = wp?.current_kg != null ? wp.current_kg - wp.target_kg : null;
  const atGoal = diff != null && Math.abs(diff) < 0.5;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Progreso de metas ({progress.days_total} dias)</Text>

      {activeMetrics.map((m) => (
        <MetricRow
          key={String(m.key)}
          metric={progress[m.key] as GoalMetric}
          label={m.label}
          unit={m.unit}
        />
      ))}

      {wp && (
        <View style={styles.weightRow}>
          {wp.current_kg != null ? (
            <Text style={styles.weightText}>
              <Text style={styles.weightLabel}>Peso: </Text>
              {wp.current_kg.toFixed(1)} kg → {wp.target_kg.toFixed(1)} kg{" "}
              {atGoal ? (
                <Text style={styles.atGoal}>✓ en objetivo</Text>
              ) : (
                <Text style={styles.weightDiff}>
                  ({diff! > 0 ? "-" : "+"}
                  {Math.abs(diff!).toFixed(1)} kg)
                </Text>
              )}
            </Text>
          ) : (
            <Text style={styles.weightText}>
              <Text style={styles.weightLabel}>Peso objetivo: </Text>
              {wp.target_kg.toFixed(1)} kg (sin registro reciente)
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      gap: 6,
    },
    title: { fontSize: 15, fontWeight: "700", color: colors.foreground, marginBottom: 4 },
    metric: { paddingVertical: 6 },
    metricTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    metricLabel: { fontSize: 14, fontWeight: "600", color: colors.foreground },
    metricValue: { fontSize: 12, color: colors.mutedForeground, fontVariant: ["tabular-nums"] },
    barTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.muted,
      overflow: "hidden",
      marginTop: 6,
    },
    barFill: { height: "100%", borderRadius: 4, backgroundColor: colors.primary },
    metricBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
    },
    metricDays: { fontSize: 12, color: colors.mutedForeground },
    metricPct: { fontSize: 12, fontWeight: "600", color: colors.foreground, fontVariant: ["tabular-nums"] },
    weightRow: {
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    weightText: { fontSize: 14, color: colors.foreground },
    weightLabel: { fontWeight: "600" },
    weightDiff: { fontSize: 12, color: colors.mutedForeground },
    atGoal: { fontSize: 13, color: colors.fiber, fontWeight: "600" },
  });

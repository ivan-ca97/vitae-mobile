import { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { daysAgoStr as daysAgo } from "@/lib/format";
import { useDailySummaryRange } from "@/lib/hooks/use-daily-summary";
import { useGoalProgress } from "@/lib/hooks/use-goals";
import { useColors, type Palette } from "@/lib/theme";
import { ScreenHeader } from "@/components/screen-header";
import { GoalProgressCard } from "@/components/goal-progress-card";
import { LineChart, type ChartPoint } from "@/components/charts/line-chart";
import { BarChart } from "@/components/charts/bar-chart";
import type { DailySummary, GoalsSummary } from "@/lib/types/daily";

const RANGES = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function EstadisticasScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [days, setDays] = useState(30);
  const range = useMemo(() => ({ from: daysAgo(days - 1), to: daysAgo(0) }), [days]);
  const { data, isLoading } = useDailySummaryRange(range.from, range.to);
  const { data: goalProgress } = useGoalProgress(range.from, range.to);

  const summaries: DailySummary[] = data?.data ?? [];

  // Metas: tomar las del dia mas reciente que las tenga.
  const goals: GoalsSummary | undefined = useMemo(() => {
    for (let i = summaries.length - 1; i >= 0; i--) {
      if (summaries[i].goals) return summaries[i].goals;
    }
    return undefined;
  }, [summaries]);

  const label = (s: DailySummary) => s.date.slice(5); // MM-DD

  const caloriePoints: ChartPoint[] = summaries.map((s) => ({
    label: label(s),
    values: {
      consumed: s.meals.total_calories || 0,
      burned: (s.exercise.total_calories_burned || 0) + (s.steps_calories_burned || 0),
      bmr: s.estimated_bmr ?? null,
    },
  }));

  const balanceData = summaries.map((s) => ({
    label: label(s),
    value: s.caloric_balance ?? null,
  }));

  const macroPoints: ChartPoint[] = summaries.map((s) => ({
    label: label(s),
    values: {
      protein: s.meals.total_protein_grams || 0,
      carbs: s.meals.total_carbs_grams || 0,
      fat: s.meals.total_fat_grams || 0,
    },
  }));

  const fiberPoints: ChartPoint[] = summaries.map((s) => ({
    label: label(s),
    values: { fiber: s.meals.total_fiber_grams || 0 },
  }));

  const weightPoints: ChartPoint[] = summaries.map((s) => ({
    label: label(s),
    values: { weight: s.weight?.weight_kg ?? null },
  }));
  const hasWeight = weightPoints.some((p) => p.values.weight != null);

  const stepPoints: ChartPoint[] = summaries.map((s) => ({
    label: label(s),
    values: { steps: s.exercise.total_steps || 0 },
  }));
  const hasSteps = stepPoints.some((p) => (p.values.steps ?? 0) > 0);

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Estadisticas" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.rangeRow}>
          {RANGES.map((r) => {
            const active = r.days === days;
            return (
              <TouchableOpacity
                key={r.days}
                style={[styles.rangeChip, active && styles.rangeChipActive]}
                onPress={() => setDays(r.days)}
                activeOpacity={0.7}
              >
                <Text style={[styles.rangeText, active && styles.rangeTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoading && !data ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : summaries.length === 0 ? (
          <Text style={styles.empty}>No hay datos para este periodo.</Text>
        ) : (
          <>
            {goalProgress && <GoalProgressCard progress={goalProgress} />}

            <Card title="Calorias">
              <LineChart
                data={caloriePoints}
                series={[
                  { key: "consumed", label: "Consumidas", color: colors.carbs },
                  { key: "burned", label: "Quemadas", color: colors.fat },
                  { key: "bmr", label: "Metabolismo", color: colors.mutedForeground },
                ]}
                goal={
                  goals?.daily_calories
                    ? { value: goals.daily_calories, color: colors.primary, label: "Meta" }
                    : undefined
                }
              />
            </Card>

            <Card title="Balance calorico">
              <BarChart data={balanceData} />
              <Text style={styles.hint}>Superavit (rosa) / Deficit (verde)</Text>
            </Card>

            <Card title="Macronutrientes (g)">
              <LineChart
                data={macroPoints}
                series={[
                  { key: "protein", label: "Proteina", color: colors.protein },
                  { key: "carbs", label: "Carbos", color: colors.carbs },
                  { key: "fat", label: "Grasa", color: colors.fat },
                ]}
              />
            </Card>

            <Card title="Fibra (g)">
              <LineChart
                data={fiberPoints}
                series={[{ key: "fiber", label: "Fibra", color: colors.fiber }]}
                goal={
                  goals?.daily_fiber_grams
                    ? { value: goals.daily_fiber_grams, color: colors.primary, label: "Meta" }
                    : undefined
                }
              />
            </Card>

            {hasWeight && (
              <Card title="Peso (kg)">
                <LineChart
                  data={weightPoints}
                  series={[{ key: "weight", label: "Peso", color: colors.primary }]}
                  goal={
                    goals?.target_weight_kg
                      ? { value: goals.target_weight_kg, color: colors.fiber, label: "Objetivo" }
                      : undefined
                  }
                  formatY={(n) => n.toFixed(1)}
                />
              </Card>
            )}

            {hasSteps && (
              <Card title="Pasos">
                <LineChart
                  data={stepPoints}
                  series={[{ key: "steps", label: "Pasos", color: colors.carbs }]}
                  goal={
                    goals?.daily_steps
                      ? { value: goals.daily_steps, color: colors.primary, label: "Meta" }
                      : undefined
                  }
                />
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  rangeRow: { flexDirection: "row", gap: 8 },
  rangeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  rangeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rangeText: { fontSize: 14, color: colors.foreground },
  rangeTextActive: { color: colors.primaryForeground, fontWeight: "600" },
  empty: { textAlign: "center", color: colors.mutedForeground, marginTop: 40, fontSize: 14 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  hint: { fontSize: 12, color: colors.mutedForeground },
});

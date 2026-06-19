import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useGoals, useUpsertGoals } from "@/lib/hooks/use-goals";
import { useColors, type Palette } from "@/lib/theme";
import { ScreenHeader } from "@/components/screen-header";
import type { UpsertGoalRequest } from "@/lib/types/goal";

function toOptNum(s: string): number | undefined {
  if (s.trim() === "") return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : n;
}

const FIELDS: { key: keyof UpsertGoalRequest; label: string; integer?: boolean }[] = [
  { key: "daily_calories", label: "Calorias diarias (kcal)" },
  { key: "daily_protein_grams", label: "Proteinas (g)" },
  { key: "daily_carbs_grams", label: "Carbohidratos (g)" },
  { key: "daily_fat_grams", label: "Grasas (g)" },
  { key: "daily_fiber_grams", label: "Fibra (g)" },
];

const EXERCISE_FIELDS: { key: keyof UpsertGoalRequest; label: string }[] = [
  { key: "daily_steps", label: "Pasos diarios" },
  { key: "daily_exercise_minutes", label: "Minutos de ejercicio" },
];

export default function MetasScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { data: goals, isLoading } = useGoals();
  const mutation = useUpsertGoals();

  const [values, setValues] = useState<Record<string, string>>({});

  // Cargar valores cuando llegan las metas.
  useEffect(() => {
    if (!goals) return;
    setValues({
      daily_calories: goals.daily_calories?.toString() ?? "",
      daily_protein_grams: goals.daily_protein_grams?.toString() ?? "",
      daily_carbs_grams: goals.daily_carbs_grams?.toString() ?? "",
      daily_fat_grams: goals.daily_fat_grams?.toString() ?? "",
      daily_fiber_grams: goals.daily_fiber_grams?.toString() ?? "",
      daily_steps: goals.daily_steps?.toString() ?? "",
      daily_exercise_minutes: goals.daily_exercise_minutes?.toString() ?? "",
      target_weight_kg: goals.target_weight_kg?.toString() ?? "",
    });
  }, [goals]);

  function set(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function handleSave() {
    const req: UpsertGoalRequest = {
      daily_calories: toOptNum(values.daily_calories ?? ""),
      daily_protein_grams: toOptNum(values.daily_protein_grams ?? ""),
      daily_carbs_grams: toOptNum(values.daily_carbs_grams ?? ""),
      daily_fat_grams: toOptNum(values.daily_fat_grams ?? ""),
      daily_fiber_grams: toOptNum(values.daily_fiber_grams ?? ""),
      daily_steps: toOptNum(values.daily_steps ?? ""),
      daily_exercise_minutes: toOptNum(values.daily_exercise_minutes ?? ""),
      target_weight_kg: toOptNum(values.target_weight_kg ?? ""),
    };
    mutation.mutate(req, {
      onSuccess: () => router.back(),
      onError: (err: any) => Alert.alert("Error", err.message ?? "No se pudo guardar"),
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader
        title="Metas"
        right={
          <TouchableOpacity onPress={handleSave} hitSlop={8} disabled={mutation.isPending}>
            <Text style={[styles.save, mutation.isPending && { opacity: 0.5 }]}>Guardar</Text>
          </TouchableOpacity>
        }
      />

      {isLoading && !goals ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.cardTitle}>Alimentacion</Text>
          <View style={styles.card}>
            {FIELDS.map((f) => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={values[f.key] ?? ""}
                  onChangeText={(v) => set(f.key, v)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ))}
          </View>

          <Text style={styles.cardTitle}>Ejercicio</Text>
          <View style={styles.card}>
            {EXERCISE_FIELDS.map((f) => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={values[f.key] ?? ""}
                  onChangeText={(v) => set(f.key, v)}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ))}
          </View>

          <Text style={styles.cardTitle}>Peso objetivo</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Peso objetivo (kg)</Text>
              <TextInput
                style={styles.input}
                value={values.target_weight_kg ?? ""}
                onChangeText={(v) => set("target_weight_kg", v)}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  save: { fontSize: 15, fontWeight: "700", color: colors.primary },
  content: { padding: 16, gap: 8, paddingBottom: 48 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.foreground,
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  field: { gap: 6 },
  label: { fontSize: 13, color: colors.mutedForeground },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.foreground,
  },
});

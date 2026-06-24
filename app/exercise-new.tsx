import { useEffect, useMemo, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDate } from "@/lib/date-context";
import { fmtTime, arLocalToUtc } from "@/lib/format";
import {
  useCreateExercise,
  useUpdateExercise,
  useExercise,
  useEstimateCalories,
} from "@/lib/hooks/use-exercises";
import { useColors, type Palette } from "@/lib/theme";
import type { CreateExerciseRequest } from "@/lib/types/exercise";

const TYPE_OPTIONS = [
  { value: "weightlifting", label: "Pesas" },
  { value: "walking", label: "Caminata" },
  { value: "running", label: "Running" },
  { value: "cycling", label: "Ciclismo" },
  { value: "other", label: "Otro" },
  { value: "manual_adjustment", label: "Ajuste manual" },
];

const LABELS: Record<string, string> = Object.fromEntries(
  TYPE_OPTIONS.map((o) => [o.value, o.label])
);

// Que campos mostrar segun el tipo.
interface FieldSet {
  duration: boolean;
  calories: boolean;
  steps: boolean;
  distance: boolean;
  volume: boolean;
  sets: boolean;
}
function fieldsFor(type: string): FieldSet {
  switch (type) {
    case "weightlifting":
      return { duration: true, calories: true, steps: false, distance: false, volume: true, sets: true };
    case "walking":
      return { duration: true, calories: true, steps: true, distance: true, volume: false, sets: false };
    case "running":
    case "cycling":
      return { duration: true, calories: true, steps: false, distance: true, volume: false, sets: false };
    case "manual_adjustment":
      return { duration: false, calories: true, steps: false, distance: false, volume: false, sets: false };
    default: // other
      return { duration: true, calories: true, steps: false, distance: false, volume: false, sets: false };
  }
}

function numOrUndef(s: string): number | undefined {
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

export default function ExerciseNewScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { date } = useDate();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const createMutation = useCreateExercise();
  const updateMutation = useUpdateExercise();
  const estimateMutation = useEstimateCalories();
  const { data: existing } = useExercise(id ?? "");

  const [type, setType] = useState("walking");
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState(() => fmtTime(new Date().toISOString())); // HH:MM en AR
  const [durationMin, setDurationMin] = useState("");
  const [calories, setCalories] = useState("");
  const [steps, setSteps] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [volumeKg, setVolumeKg] = useState("");
  const [sets, setSets] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Prefill en modo edicion (una sola vez cuando llegan los datos).
  useEffect(() => {
    if (!isEdit || hydrated || !existing) return;
    setType(existing.type);
    setName(existing.name);
    if (existing.started_at) setStartTime(fmtTime(existing.started_at));
    setDurationMin(existing.duration_seconds ? String(existing.duration_seconds / 60) : "");
    setCalories(
      existing.estimated_calories_burned != null
        ? String(existing.estimated_calories_burned)
        : ""
    );
    setSteps(existing.steps ? String(existing.steps) : "");
    setDistanceKm(existing.distance_meters ? String(existing.distance_meters / 1000) : "");
    setVolumeKg(existing.total_volume_kg ? String(existing.total_volume_kg) : "");
    setSets(existing.total_sets ? String(existing.total_sets) : "");
    setHydrated(true);
  }, [isEdit, hydrated, existing]);

  const fields = fieldsFor(type);
  const saving = createMutation.isPending || updateMutation.isPending;

  function handleEstimate() {
    const s = parseInt(steps, 10);
    if (isNaN(s) || s <= 0) {
      Alert.alert("Pasos invalidos", "Ingresa la cantidad de pasos primero.");
      return;
    }
    estimateMutation.mutate(s, {
      onSuccess: (res) => setCalories(String(Math.round(res.estimated_calories))),
      onError: (err: any) => Alert.alert("Error", err.message ?? "No se pudo estimar"),
    });
  }

  function handleSave() {
    const req: CreateExerciseRequest = {
      date: existing?.date ?? date,
      type,
      name: name.trim() || LABELS[type] || "Ejercicio",
      tags: existing?.tags ?? [],
      notes: existing?.notes ?? "",
    };

    // Hora de inicio especificada por el usuario (AR) → UTC.
    const startedAt = arLocalToUtc(req.date, startTime);
    if (startedAt) req.started_at = startedAt;

    // En edicion enviamos los campos visibles aunque esten vacios (para poder limpiarlos);
    // en alta solo enviamos los que tengan valor.
    const min = numOrUndef(durationMin);
    if (fields.duration && (isEdit || (min != null && min > 0)))
      req.duration_seconds = min != null && min > 0 ? Math.round(min * 60) : 0;

    const cal = numOrUndef(calories);
    if (fields.calories && (isEdit || cal != null))
      req.estimated_calories_burned = cal ?? 0;

    const s = parseInt(steps, 10);
    if (fields.steps && (isEdit || (!isNaN(s) && s > 0)))
      req.steps = !isNaN(s) && s > 0 ? s : 0;

    const km = numOrUndef(distanceKm);
    if (fields.distance && (isEdit || (km != null && km > 0)))
      req.distance_meters = km != null && km > 0 ? Math.round(km * 1000) : 0;

    const v = numOrUndef(volumeKg);
    if (fields.volume && (isEdit || (v != null && v > 0)))
      req.total_volume_kg = v != null && v > 0 ? v : 0;

    const st = parseInt(sets, 10);
    if (fields.sets && (isEdit || (!isNaN(st) && st > 0)))
      req.total_sets = !isNaN(st) && st > 0 ? st : 0;

    const opts = {
      onSuccess: () => router.back(),
      onError: (err: any) => Alert.alert("Error", err.message ?? "No se pudo guardar"),
    };

    if (isEdit && id) updateMutation.mutate({ id, data: req }, opts);
    else createMutation.mutate(req, opts);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.headerCancel}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? "Editar ejercicio" : "Nuevo ejercicio"}</Text>
        <TouchableOpacity onPress={handleSave} hitSlop={8} disabled={saving}>
          <Text style={[styles.headerSave, saving && { opacity: 0.5 }]}>Guardar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Tipo</Text>
        <View style={styles.chipRow}>
          {TYPE_OPTIONS.map((opt) => {
            const active = opt.value === type;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setType(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          placeholder={LABELS[type]}
          placeholderTextColor={colors.mutedForeground}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Hora de inicio (HH:MM)</Text>
        <TextInput
          style={styles.input}
          placeholder="HH:MM"
          placeholderTextColor={colors.mutedForeground}
          value={startTime}
          onChangeText={setStartTime}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {fields.duration && (
          <Field label="Duracion (min)" value={durationMin} onChange={setDurationMin} />
        )}

        {fields.steps && (
          <>
            <Text style={styles.label}>Pasos</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                value={steps}
                onChangeText={setSteps}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={styles.estimateBtn}
                onPress={handleEstimate}
                disabled={estimateMutation.isPending}
                activeOpacity={0.8}
              >
                {estimateMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.estimateText}>Estimar kcal</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {fields.distance && (
          <Field label="Distancia (km)" value={distanceKm} onChange={setDistanceKm} />
        )}

        {fields.volume && (
          <Field label="Volumen total (kg)" value={volumeKg} onChange={setVolumeKg} />
        )}

        {fields.sets && (
          <Field label="Series" value={sets} onChange={setSets} integer />
        )}

        {fields.calories && (
          <Field label="Calorias quemadas (kcal)" value={calories} onChange={setCalories} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  integer,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  integer?: boolean;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder="0"
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChange}
        keyboardType={integer ? "number-pad" : "decimal-pad"}
      />
    </>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCancel: { fontSize: 15, color: colors.mutedForeground },
  headerTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  headerSave: { fontSize: 15, fontWeight: "700", color: colors.primary },
  content: { padding: 16, gap: 8, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.foreground,
  },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  estimateBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  estimateText: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.foreground },
  chipTextActive: { color: colors.primaryForeground, fontWeight: "600" },
});

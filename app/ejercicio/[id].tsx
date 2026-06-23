import { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useExercise, useDeleteExercise } from "@/lib/hooks/use-exercises";
import { fmtDuration, fmtNumber, fmtTime } from "@/lib/format";
import { useColors, type Palette } from "@/lib/theme";
import { ScreenHeader } from "@/components/screen-header";
import type { Exercise } from "@/lib/types/exercise";

const TYPE_LABELS: Record<string, string> = {
  weightlifting: "Pesas",
  walking: "Caminata",
  cycling: "Ciclismo",
  running: "Running",
  other: "Otro",
  manual_adjustment: "Ajuste manual",
};

function stats(ex: Exercise): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  if (ex.estimated_calories_burned)
    out.push({ label: "Calorias", value: `${fmtNumber(ex.estimated_calories_burned)} kcal` });
  if (ex.duration_seconds) out.push({ label: "Duracion", value: fmtDuration(ex.duration_seconds) });
  if (ex.steps) out.push({ label: "Pasos", value: fmtNumber(ex.steps) });
  if (ex.distance_meters)
    out.push({ label: "Distancia", value: `${(ex.distance_meters / 1000).toFixed(1)} km` });
  if (ex.total_volume_kg) out.push({ label: "Volumen", value: `${fmtNumber(ex.total_volume_kg)} kg` });
  if (ex.total_sets) out.push({ label: "Series", value: fmtNumber(ex.total_sets) });
  if (ex.average_heart_rate) out.push({ label: "FC media", value: `${fmtNumber(ex.average_heart_rate)} bpm` });
  if (ex.max_heart_rate) out.push({ label: "FC max", value: `${fmtNumber(ex.max_heart_rate)} bpm` });
  return out;
}

export default function ExerciseDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: ex, isLoading } = useExercise(id);
  const deleteMutation = useDeleteExercise();

  function handleDelete() {
    Alert.alert("Eliminar ejercicio", "Se eliminara permanentemente.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () =>
          deleteMutation.mutate(id, {
            onSuccess: () => router.back(),
            onError: (err: any) => Alert.alert("Error", err.message),
          }),
      },
    ]);
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title={ex?.name || (ex ? TYPE_LABELS[ex.type] ?? ex.type : "Ejercicio")}
        right={
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push(`/exercise-new?id=${id}`)} hitSlop={8}>
              <Text style={styles.edit}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} hitSlop={8}>
              <Text style={styles.delete}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {isLoading && !ex ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : ex ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{TYPE_LABELS[ex.type] ?? ex.type}</Text>
            </View>
            {ex.started_at ? <Text style={styles.time}>{fmtTime(ex.started_at)}</Text> : null}
            {ex.tags.map((t) => (
              <View key={t} style={styles.tagBadge}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>

          <View style={styles.statsCard}>
            {stats(ex).map((s) => (
              <View key={s.label} style={styles.stat}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {ex.notes ? (
            <>
              <Text style={styles.sectionTitle}>Notas</Text>
              <View style={styles.notesCard}>
                <Text style={styles.notesText}>{ex.notes}</Text>
              </View>
            </>
          ) : null}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>No se encontro el ejercicio.</Text>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  headerActions: { flexDirection: "row", gap: 16, alignItems: "center" },
  edit: { fontSize: 15, fontWeight: "600", color: colors.primary },
  delete: { fontSize: 15, fontWeight: "600", color: colors.destructive },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  badge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 12, fontWeight: "600", color: colors.foreground },
  time: { fontSize: 13, color: colors.mutedForeground, fontVariant: ["tabular-nums"] },
  tagBadge: { backgroundColor: colors.muted, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { fontSize: 12, color: colors.mutedForeground },
  statsCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
  stat: { minWidth: 80 },
  statValue: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  statLabel: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground, marginTop: 4 },
  notesCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  notesText: { fontSize: 14, color: colors.foreground },
  empty: { textAlign: "center", color: colors.mutedForeground, marginTop: 40 },
});

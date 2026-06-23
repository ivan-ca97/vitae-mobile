import { useState, useCallback, useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useDate } from "@/lib/date-context";
import { useExercises, useDeleteExercise } from "@/lib/hooks/use-exercises";
import { fmtDuration, fmtTime } from "@/lib/format";
import { useColors, type Palette } from "@/lib/theme";
import { DateNav } from "@/components/date-nav";
import type { Exercise } from "@/lib/types/exercise";

const TYPE_LABELS: Record<string, string> = {
  weightlifting: "Pesas",
  walking: "Caminata",
  cycling: "Ciclismo",
  running: "Running",
  other: "Otro",
  manual_adjustment: "Ajuste manual",
};

function ExerciseCard({
  exercise,
  onPress,
  onDelete,
}: {
  exercise: Exercise;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  function handleLongPress() {
    Alert.alert(
      "Eliminar ejercicio",
      `Se eliminara "${exercise.name}" permanentemente.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => onDelete(exercise.id) },
      ]
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(exercise.id)}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardType}>{TYPE_LABELS[exercise.type] ?? exercise.type}</Text>
        {exercise.started_at && (
          <Text style={styles.cardTime}>{fmtTime(exercise.started_at)}</Text>
        )}
      </View>
      <Text style={styles.cardName}>{exercise.name}</Text>

      <View style={styles.statsRow}>
        {exercise.estimated_calories_burned != null && exercise.estimated_calories_burned > 0 && (
          <Stat label="Calorias" value={`${exercise.estimated_calories_burned.toFixed(0)} kcal`} />
        )}
        {exercise.duration_seconds != null && exercise.duration_seconds > 0 && (
          <Stat label="Duracion" value={fmtDuration(exercise.duration_seconds)} />
        )}
        {exercise.steps != null && exercise.steps > 0 && (
          <Stat label="Pasos" value={exercise.steps.toFixed(0)} />
        )}
        {exercise.distance_meters != null && exercise.distance_meters > 0 && (
          <Stat label="Distancia" value={`${(exercise.distance_meters / 1000).toFixed(1)} km`} />
        )}
        {exercise.total_volume_kg != null && exercise.total_volume_kg > 0 && (
          <Stat label="Volumen" value={`${exercise.total_volume_kg.toFixed(0)} kg`} />
        )}
        {exercise.total_sets != null && exercise.total_sets > 0 && (
          <Stat label="Series" value={exercise.total_sets.toFixed(0)} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function EjerciciosScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { date } = useDate();
  const { data, isLoading, refetch } = useExercises(date);
  const deleteMutation = useDeleteExercise();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  function handleDelete(id: string) {
    deleteMutation.mutate(id);
  }

  const exercises = data?.items ?? [];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <DateNav />

        {isLoading && !data ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : exercises.length === 0 ? (
          <Text style={styles.emptyText}>No hay ejercicios registrados para este dia.</Text>
        ) : (
          exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              onPress={(id) => router.push(`/ejercicio/${id}`)}
              onDelete={handleDelete}
            />
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/exercise-new")}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
    paddingBottom: 32,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: 40,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  fabText: {
    color: colors.primaryForeground,
    fontSize: 30,
    fontWeight: "300",
    lineHeight: 34,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardType: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  cardTime: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.foreground,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stat: {
    alignItems: "center",
    minWidth: 70,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.foreground,
  },
  statLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
});

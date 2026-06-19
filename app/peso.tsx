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
import { useWeightEntries, useDeleteWeight } from "@/lib/hooks/use-weight";
import { useColors, type Palette } from "@/lib/theme";
import { ScreenHeader } from "@/components/screen-header";
import { LineChart, type ChartPoint } from "@/components/charts/line-chart";
import type { WeightEntry } from "@/lib/types/weight";

function EntryRow({ entry, onDelete }: { entry: WeightEntry; onDelete: (id: string) => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const dateObj = new Date(entry.date + "T00:00:00");
  const label = dateObj.toLocaleDateString("es-AR", { day: "numeric", month: "short" });

  function handleLongPress() {
    Alert.alert("Eliminar registro", `Eliminar peso del ${label}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => onDelete(entry.id) },
    ]);
  }

  return (
    <TouchableOpacity style={styles.entryRow} onLongPress={handleLongPress} activeOpacity={0.7}>
      <Text style={styles.entryDate}>{label}</Text>
      <Text style={styles.entryWeight}>{entry.weight_kg.toFixed(1)} kg</Text>
      {entry.body_fat_percentage != null && (
        <Text style={styles.entryFat}>{entry.body_fat_percentage.toFixed(1)}%</Text>
      )}
    </TouchableOpacity>
  );
}

export default function PesoScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data, isLoading, refetch } = useWeightEntries();
  const deleteMutation = useDeleteWeight();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  function handleDelete(id: string) {
    deleteMutation.mutate(id);
  }

  const entries = data?.items ?? [];

  // Para el grafico: orden cronologico ascendente.
  const chartPoints: ChartPoint[] = [...entries]
    .reverse()
    .map((e) => ({ label: e.date.slice(5), values: { weight: e.weight_kg } }));

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Historial de peso" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {isLoading && !data ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : entries.length === 0 ? (
          <Text style={styles.emptyText}>
            Sin registros de peso. Carga tu peso del dia desde Resumen.
          </Text>
        ) : (
          <>
            {chartPoints.length >= 2 && (
              <View style={styles.chartCard}>
                <Text style={styles.sectionTitle}>Evolucion</Text>
                <LineChart
                  data={chartPoints}
                  series={[{ key: "weight", label: "Peso", color: colors.primary }]}
                  formatY={(n) => n.toFixed(1)}
                />
              </View>
            )}

            <Text style={styles.sectionTitle}>Historial</Text>
            <View style={styles.list}>
              {entries.map((e) => (
                <EntryRow key={e.id} entry={e} onDelete={handleDelete} />
              ))}
            </View>
            <Text style={styles.hint}>Manten presionado un registro para eliminarlo.</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, gap: 16, paddingBottom: 32 },
    sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.foreground },
    chartCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    emptyText: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", marginTop: 40 },
    hint: { fontSize: 12, color: colors.mutedForeground },
    list: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    entryRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    entryDate: { fontSize: 14, color: colors.mutedForeground, minWidth: 60 },
    entryWeight: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.foreground },
    entryFat: { fontSize: 14, color: colors.mutedForeground },
  });

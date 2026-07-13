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
import { Ionicons } from "@expo/vector-icons";
import { useDate } from "@/lib/date-context";
import { useMeals, useDeleteMeal } from "@/lib/hooks/use-meals";
import { useDailySummary } from "@/lib/hooks/use-daily-summary";
import { useImageUpload } from "@/lib/hooks/use-image-upload";
import { fmtNumber, fmtTime } from "@/lib/format";
import { useColors, type Palette } from "@/lib/theme";
import { DateNav } from "@/components/date-nav";
import { SummaryCard } from "@/components/summary-card";
import { MacroBar } from "@/components/macro-bar";
import type { Meal } from "@/lib/types/meal";

const TYPE_LABELS: Record<string, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  merienda: "Merienda",
  cena: "Cena",
  snack: "Snack",
  otro: "Otro",
};

function macroLine(meal: Meal): string {
  const cal = meal.calories ?? meal.items.reduce((s, i) => s + (i.calories ?? 0), 0);
  const parts = [`${fmtNumber(cal)} kcal`];
  if (meal.protein_grams != null) parts.push(`${fmtNumber(meal.protein_grams)}g prot`);
  if (meal.carbs_grams != null) parts.push(`${fmtNumber(meal.carbs_grams)}g carbs`);
  if (meal.fat_grams != null) parts.push(`${fmtNumber(meal.fat_grams)}g grasa`);
  if (meal.fiber_grams != null) parts.push(`${fmtNumber(meal.fiber_grams)}g fibra`);
  return parts.join(" · ");
}

function MealCard({
  meal,
  onPress,
  onDelete,
}: {
  meal: Meal;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  function handleLongPress() {
    Alert.alert(
      "Eliminar comida",
      meal.name
        ? `Se eliminara "${meal.name}" permanentemente.`
        : "Se eliminara la comida permanentemente.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => onDelete(meal.id) },
      ]
    );
  }

  const hasMacros =
    meal.protein_grams != null || meal.carbs_grams != null || meal.fat_grams != null;

  return (
    <TouchableOpacity
      style={styles.mealCard}
      onPress={() => onPress(meal.id)}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.mealHeader}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{TYPE_LABELS[meal.type] ?? meal.type}</Text>
        </View>
        {meal.status === "pending" && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Pendiente</Text>
          </View>
        )}
        {meal.eaten_at ? <Text style={styles.mealTime}>{fmtTime(meal.eaten_at)}</Text> : null}
        {meal.name ? (
          <Text style={styles.mealName} numberOfLines={1}>
            {meal.name}
          </Text>
        ) : null}
        {meal.tags.map((t) => (
          <View key={t} style={styles.tagBadge}>
            <Text style={styles.tagText}>{t}</Text>
          </View>
        ))}
      </View>

      {meal.items.length > 0 && (
        <Text style={styles.foodNames} numberOfLines={1}>
          {meal.items.map((i) => i.food_name).join(", ")}
        </Text>
      )}

      <Text style={styles.macroLine}>{macroLine(meal)}</Text>

      {hasMacros && (
        <MacroBar
          protein={meal.protein_grams ?? 0}
          carbs={meal.carbs_grams ?? 0}
          fat={meal.fat_grams ?? 0}
        />
      )}
    </TouchableOpacity>
  );
}

export default function ComidasScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { date } = useDate();
  const { data, isLoading, refetch } = useMeals(date);
  const { data: summary } = useDailySummary(date);
  const deleteMutation = useDeleteMeal();
  const { takePhoto } = useImageUpload();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  function handleDelete(id: string) {
    deleteMutation.mutate(id);
  }

  // Carga rapida: cámara -> abre la pantalla de comida nueva al instante con la
  // foto local; la subida a R2 sigue en segundo plano (spinner) mientras se cargan
  // datos o se toman mas fotos.
  async function handleQuickAdd() {
    const asset = await takePhoto();
    if (!asset) return;
    router.push({
      pathname: "/meal-new",
      params: {
        photoUri: asset.uri,
        photoMime: asset.mimeType ?? "",
        photoName: asset.fileName ?? "",
      },
    });
  }

  const meals = data?.items ?? [];
  const m = summary?.meals;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <DateNav />

        {m && m.count > 0 && (
          <View style={styles.daySummary}>
            <View style={styles.grid}>
              <SummaryCard label="Calorias" value={fmtNumber(m.total_calories)} unit="kcal" />
              <SummaryCard label="Proteinas" value={fmtNumber(m.total_protein_grams)} unit="g" color={colors.protein} />
              <SummaryCard label="Carbohidratos" value={fmtNumber(m.total_carbs_grams)} unit="g" color={colors.carbs} />
              <SummaryCard label="Grasas" value={fmtNumber(m.total_fat_grams)} unit="g" color={colors.fat} />
              <SummaryCard label="Fibra" value={fmtNumber(m.total_fiber_grams)} unit="g" color={colors.fiber} />
            </View>
            <MacroBar
              protein={m.total_protein_grams}
              carbs={m.total_carbs_grams}
              fat={m.total_fat_grams}
            />
          </View>
        )}

        {isLoading && !data ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : meals.length === 0 ? (
          <Text style={styles.emptyText}>No hay comidas registradas para este dia.</Text>
        ) : (
          meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onPress={(id) => router.push(`/comida/${id}`)}
              onDelete={handleDelete}
            />
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, styles.fabCamera]}
        onPress={handleQuickAdd}
        activeOpacity={0.85}
      >
        <Ionicons name="camera" size={24} color={colors.primaryForeground} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/meal-new")}
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
  daySummary: {
    gap: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
  fabCamera: {
    bottom: 92,
  },
  fabText: {
    color: colors.primaryForeground,
    fontSize: 30,
    fontWeight: "300",
    lineHeight: 34,
  },
  pendingBadge: {
    backgroundColor: colors.warning,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  mealCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foreground,
  },
  mealTime: {
    fontSize: 13,
    color: colors.mutedForeground,
    fontVariant: ["tabular-nums"],
  },
  mealName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.foreground,
    flexShrink: 1,
  },
  tagBadge: {
    backgroundColor: colors.muted,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  foodNames: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  macroLine: {
    fontSize: 13,
    color: colors.mutedForeground,
    fontVariant: ["tabular-nums"],
  },
});

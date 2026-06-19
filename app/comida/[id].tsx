import { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMeal, useDeleteMeal } from "@/lib/hooks/use-meals";
import { fmtNumber } from "@/lib/format";
import { useColors, type Palette } from "@/lib/theme";
import { ScreenHeader } from "@/components/screen-header";
import { MacroBar } from "@/components/macro-bar";
import type { MealItem } from "@/lib/types/meal";

const TYPE_LABELS: Record<string, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  merienda: "Merienda",
  cena: "Cena",
  snack: "Snack",
  otro: "Otro",
};

function itemMacros(item: MealItem): string {
  const parts: string[] = [];
  if (item.calories != null) parts.push(`${fmtNumber(item.calories)} kcal`);
  if (item.protein_grams != null) parts.push(`${fmtNumber(item.protein_grams)}g prot`);
  if (item.carbs_grams != null) parts.push(`${fmtNumber(item.carbs_grams)}g carbs`);
  if (item.fat_grams != null) parts.push(`${fmtNumber(item.fat_grams)}g grasa`);
  return parts.join(" · ");
}

export default function MealDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: meal, isLoading } = useMeal(id);
  const deleteMutation = useDeleteMeal();

  function handleDelete() {
    Alert.alert("Eliminar comida", "Se eliminara permanentemente.", [
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
        title={meal?.name || (meal ? TYPE_LABELS[meal.type] ?? meal.type : "Comida")}
        right={
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push(`/meal-new?id=${id}`)} hitSlop={8}>
              <Text style={styles.edit}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} hitSlop={8}>
              <Text style={styles.delete}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {isLoading && !meal ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : meal ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{TYPE_LABELS[meal.type] ?? meal.type}</Text>
            </View>
            {meal.status === "pending" && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>Pendiente</Text>
              </View>
            )}
            {meal.eaten_at ? <Text style={styles.time}>{meal.eaten_at.slice(11, 16)}</Text> : null}
            {meal.tags.map((t) => (
              <View key={t} style={styles.tagBadge}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>

          {meal.photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
              {meal.photos.map((p) => (
                <Image key={p.id} source={{ uri: p.url }} style={styles.photo} />
              ))}
            </ScrollView>
          )}

          {/* Totales */}
          <View style={styles.totalsCard}>
            <Text style={styles.totalsCal}>{fmtNumber(meal.calories ?? 0)} kcal</Text>
            <View style={styles.macroNums}>
              <Text style={styles.macroNum}>P {fmtNumber(meal.protein_grams ?? 0)}g</Text>
              <Text style={styles.macroNum}>C {fmtNumber(meal.carbs_grams ?? 0)}g</Text>
              <Text style={styles.macroNum}>G {fmtNumber(meal.fat_grams ?? 0)}g</Text>
              <Text style={styles.macroNum}>F {fmtNumber(meal.fiber_grams ?? 0)}g</Text>
            </View>
            <MacroBar
              protein={meal.protein_grams ?? 0}
              carbs={meal.carbs_grams ?? 0}
              fat={meal.fat_grams ?? 0}
            />
          </View>

          {/* Items */}
          <Text style={styles.sectionTitle}>Alimentos</Text>
          <View style={styles.itemsCard}>
            {meal.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.food_name}</Text>
                  <Text style={styles.itemMacros}>{itemMacros(item)}</Text>
                </View>
                <Text style={styles.itemQty}>
                  {fmtNumber(item.input_quantity)}
                  {item.input_unit}
                </Text>
              </View>
            ))}
          </View>

          {meal.notes ? (
            <>
              <Text style={styles.sectionTitle}>Notas</Text>
              <View style={styles.notesCard}>
                <Text style={styles.notesText}>{meal.notes}</Text>
              </View>
            </>
          ) : null}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>No se encontro la comida.</Text>
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
  pendingBadge: { backgroundColor: colors.warning, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 3 },
  pendingText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  time: { fontSize: 13, color: colors.mutedForeground, fontVariant: ["tabular-nums"] },
  tagBadge: { backgroundColor: colors.muted, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { fontSize: 12, color: colors.mutedForeground },
  photos: { gap: 8, paddingVertical: 4 },
  photo: { width: 120, height: 120, borderRadius: 12, backgroundColor: colors.muted },
  totalsCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  totalsCal: { fontSize: 26, fontWeight: "700", color: colors.foreground },
  macroNums: { flexDirection: "row", gap: 16 },
  macroNum: { fontSize: 14, color: colors.foreground },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground, marginTop: 4 },
  itemsCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: { fontSize: 15, color: colors.foreground },
  itemMacros: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, fontVariant: ["tabular-nums"] },
  itemQty: { fontSize: 14, color: colors.mutedForeground, fontVariant: ["tabular-nums"] },
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

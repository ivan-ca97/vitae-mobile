import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useFoods, useDeleteFood } from "@/lib/hooks/use-foods";
import { useColors, type Palette } from "@/lib/theme";
import type { Food } from "@/lib/types/food";

const MEASUREMENT_LABELS: Record<string, string> = {
  mass: "Peso",
  volume: "Volumen",
  unit: "Unidad",
};

function FoodRow({
  food,
  onPress,
  onDelete,
}: {
  food: Food;
  onPress: (id: string) => void;
  onDelete: (food: Food) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress(food.id)}
      onLongPress={() => onDelete(food)}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>
          {food.name}
        </Text>
        <Text style={styles.rowMeta}>
          {MEASUREMENT_LABELS[food.measurement_type] ?? food.measurement_type} ·{" "}
          {food.base_quantity}
          {food.base_unit}
        </Text>
      </View>
      {food.default_calories != null && (
        <Text style={styles.rowCal}>{food.default_calories.toFixed(0)} kcal</Text>
      )}
    </TouchableOpacity>
  );
}

export default function AlimentosScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data, isLoading, isFetching } = useFoods(query.trim());
  const deleteMutation = useDeleteFood();

  function handleDelete(food: Food) {
    Alert.alert("Eliminar alimento", `Se eliminara "${food.name}" permanentemente.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () =>
          deleteMutation.mutate(food.id, {
            onError: (err: any) => Alert.alert("Error", err.message ?? "No se pudo eliminar"),
          }),
      },
    ]);
  }

  const foods = data?.items ?? [];

  return (
    <View style={styles.flex}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Buscar alimento..."
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {isLoading && !data ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : foods.length === 0 ? (
          <Text style={styles.empty}>
            {query.trim() ? "Sin resultados." : "Todavia no tenes alimentos. Crea el primero."}
          </Text>
        ) : (
          <View style={styles.list}>
            {isFetching && <ActivityIndicator size="small" color={colors.mutedForeground} />}
            {foods.map((food) => (
              <FoodRow
                key={food.id}
                food={food}
                onPress={(id) => router.push(`/food-new?id=${id}`)}
                onDelete={handleDelete}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/food-new")}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
    search: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 15,
      color: colors.foreground,
    },
    content: { padding: 16, paddingBottom: 96 },
    empty: { textAlign: "center", color: colors.mutedForeground, marginTop: 40, fontSize: 14 },
    list: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowName: { fontSize: 15, fontWeight: "600", color: colors.foreground },
    rowMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    rowCal: { fontSize: 13, color: colors.mutedForeground, fontVariant: ["tabular-nums"] },
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
    fabText: { color: colors.primaryForeground, fontSize: 30, fontWeight: "300", lineHeight: 34 },
  });

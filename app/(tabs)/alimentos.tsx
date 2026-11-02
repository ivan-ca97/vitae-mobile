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
import { Ionicons } from "@expo/vector-icons";
import { useFoods, useDeleteFood } from "@/lib/hooks/use-foods";
import { useOwnedShares, useCreateShare, useDeleteShare } from "@/lib/hooks/use-shares";
import { publicFoodShare } from "@/lib/share-labels";
import { useColors, type Palette } from "@/lib/theme";
import { ShareSheet } from "@/components/share-sheet";
import type { Food } from "@/lib/types/food";

const MEASUREMENT_LABELS: Record<string, string> = {
  mass: "Peso",
  volume: "Volumen",
};

const PUBLIC_FILTERS: { key: string; label: string; value?: boolean }[] = [
  { key: "all", label: "Todos" },
  { key: "public", label: "Publicos", value: true },
  { key: "private", label: "No publicos", value: false },
];

function FoodRow({
  food,
  isPublic,
  onPress,
  onDelete,
  onTogglePublic,
  onShare,
}: {
  food: Food;
  isPublic: boolean;
  onPress: (id: string) => void;
  onDelete: (food: Food) => void;
  onTogglePublic: (food: Food) => void;
  onShare: (food: Food) => void;
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
        <View style={styles.nameRow}>
          <Text style={styles.rowName} numberOfLines={1}>
            {food.name}
          </Text>
          {isPublic && (
            <View style={styles.publicBadge}>
              <Text style={styles.publicBadgeText}>Publico</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowMeta}>
          {MEASUREMENT_LABELS[food.measurement_type] ?? food.measurement_type} · {food.base_quantity}
          {food.base_unit}
          {food.default_calories != null ? ` · ${food.default_calories.toFixed(0)} kcal` : ""}
        </Text>
      </View>
      <TouchableOpacity onPress={() => onTogglePublic(food)} hitSlop={8}>
        <Ionicons
          name={isPublic ? "globe" : "globe-outline"}
          size={21}
          color={isPublic ? colors.primary : colors.mutedForeground}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onShare(food)} hitSlop={8}>
        <Ionicons name="share-social-outline" size={21} color={colors.mutedForeground} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function AlimentosScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [publicFilter, setPublicFilter] = useState("all");
  const filterValue = PUBLIC_FILTERS.find((f) => f.key === publicFilter)?.value;
  const { data, isLoading, isFetching } = useFoods(query.trim(), filterValue);
  const deleteMutation = useDeleteFood();

  const { data: sharesData } = useOwnedShares();
  const ownedShares = sharesData?.items ?? [];
  const createShare = useCreateShare();
  const deleteShare = useDeleteShare();
  const [sharingFood, setSharingFood] = useState<Food | null>(null);
  const [sharingAll, setSharingAll] = useState(false);

  function handleDelete(food: Food) {
    Alert.alert(
      "Eliminar alimento",
      `Se eliminara "${food.name}". Las comidas que ya lo usan, tuyas o de otros, lo conservan.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () =>
            deleteMutation.mutate(food.id, {
              onError: (err: any) => Alert.alert("Error", err.message ?? "No se pudo eliminar"),
            }),
        },
      ]
    );
  }

  // Un alimento es publico cuando tiene un share de lectura sobre el, para todos.
  function handleTogglePublic(food: Food) {
    const share = publicFoodShare(ownedShares, food.id);
    const onError = (err: any) => Alert.alert("Error", err.message ?? "No se pudo cambiar");
    if (share) {
      deleteShare.mutate(share.id, { onError });
      return;
    }
    createShare.mutate(
      { permission: "foods:read", scope: "item", resource_id: food.id, audience: "public" },
      { onError }
    );
  }

  const foods = data?.items ?? [];

  return (
    <View style={styles.flex}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Buscar alimento o tag..."
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        <View style={styles.filterRow}>
          {PUBLIC_FILTERS.map((f) => {
            const active = f.key === publicFilter;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setPublicFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.shareAll} onPress={() => setSharingAll(true)} hitSlop={6}>
            <Ionicons name="share-social-outline" size={16} color={colors.primary} />
            <Text style={styles.shareAllText}>Compartir todos</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {isLoading && !data ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : foods.length === 0 ? (
          <Text style={styles.empty}>
            {query.trim() || publicFilter !== "all"
              ? "Sin resultados."
              : "Todavia no tenes alimentos. Crea el primero."}
          </Text>
        ) : (
          <View style={styles.list}>
            {isFetching && <ActivityIndicator size="small" color={colors.mutedForeground} />}
            {foods.map((food) => (
              <FoodRow
                key={food.id}
                food={food}
                isPublic={!!publicFoodShare(ownedShares, food.id)}
                onPress={(id) => router.push(`/food-new?id=${id}`)}
                onDelete={handleDelete}
                onTogglePublic={handleTogglePublic}
                onShare={setSharingFood}
              />
            ))}
          </View>
        )}
        <Text style={styles.hint}>
          El globo lo hace visible para todos. Mantene apretado un alimento para eliminarlo.
        </Text>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => router.push("/food-new")} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <ShareSheet
        visible={!!sharingFood}
        onClose={() => setSharingFood(null)}
        title={sharingFood ? `Compartir "${sharingFood.name}"` : ""}
        description="Va a poder usarlo en sus comidas."
        item={sharingFood ? { id: sharingFood.id, name: sharingFood.name } : undefined}
        permissionFilter={(p) => p.permission.startsWith("foods:")}
      />
      <ShareSheet
        visible={sharingAll}
        onClose={() => setSharingAll(false)}
        title="Compartir todos tus alimentos"
        description="Incluye los que crees despues."
        permissionFilter={(p) => p.permission.startsWith("foods:")}
      />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    searchWrap: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
    search: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 15,
      color: colors.foreground,
    },
    filterRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, color: colors.foreground },
    chipTextActive: { color: colors.primaryForeground, fontWeight: "600" },
    shareAll: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" },
    shareAllText: { fontSize: 13, color: colors.primary, fontWeight: "600" },
    content: { padding: 16, paddingBottom: 96, gap: 12 },
    empty: { textAlign: "center", color: colors.mutedForeground, marginTop: 40, fontSize: 14 },
    hint: { textAlign: "center", color: colors.mutedForeground, fontSize: 12 },
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
      gap: 14,
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    rowName: { flexShrink: 1, fontSize: 15, fontWeight: "600", color: colors.foreground },
    publicBadge: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    publicBadgeText: { fontSize: 11, color: colors.primary, fontWeight: "600" },
    rowMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
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

import { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useQueries } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDate } from "@/lib/date-context";
import { useFoods } from "@/lib/hooks/use-foods";
import {
  useMealTypes,
  useMealPreview,
  useCreateMeal,
  useUpdateMeal,
  useMeal,
} from "@/lib/hooks/use-meals";
import { getFood } from "@/lib/api/foods";
import { getAvailableUnits } from "@/lib/food-units";
import { useImageUpload } from "@/lib/hooks/use-image-upload";
import { useColors, type Palette } from "@/lib/theme";
import { MacroBar } from "@/components/macro-bar";
import type { Food } from "@/lib/types/food";
import type { MealItemRequest } from "@/lib/types/meal";

const TYPE_OPTIONS = [
  { value: "desayuno", label: "Desayuno" },
  { value: "almuerzo", label: "Almuerzo" },
  { value: "merienda", label: "Merienda" },
  { value: "cena", label: "Cena" },
  { value: "snack", label: "Snack" },
  { value: "otro", label: "Otro" },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPE_OPTIONS.map((o) => [o.value, o.label])
);

function typeLabel(v: string): string {
  return TYPE_LABELS[v] ?? (v.length ? v.charAt(0).toUpperCase() + v.slice(1) : v);
}

interface DraftItem {
  key: string;
  food: Food;
  quantity: string;
  unit: string;
}

let keyCounter = 0;
function nextKey(): string {
  keyCounter += 1;
  return `it_${keyCounter}`;
}

export default function MealNewScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { date } = useDate();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const createMutation = useCreateMeal();
  const updateMutation = useUpdateMeal();
  const { data: existingMeal } = useMeal(id ?? "");

  const hour = useMemo(() => new Date().getHours(), []);
  const { data: typesData } = useMealTypes(hour);

  // Chips de tipo: solo los que sugiere el backend (relevancia por hora/historial),
  // deduplicados sin distinguir mayusculas (el backend a veces repite, ej "Cena"/"cena").
  const typeChips = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of typesData?.types ?? []) {
      const v = t?.trim();
      if (!v) continue;
      const key = v.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
    return out;
  }, [typesData]);

  const [type, setType] = useState("");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const [searchY, setSearchY] = useState(0);

  const { chooseAndUpload, uploading } = useImageUpload();

  async function addPhoto() {
    const url = await chooseAndUpload();
    if (url) setPhotos((prev) => [...prev, url]);
  }
  function removePhoto(url: string) {
    setPhotos((prev) => prev.filter((p) => p !== url));
  }

  // En edicion, traer el Food de cada item (para los chips de unidad).
  const existingItems = existingMeal?.items ?? [];
  const foodQueries = useQueries({
    queries: existingItems.map((it) => ({
      queryKey: ["food", it.food_id],
      queryFn: () => getFood(it.food_id),
      enabled: isEdit && !!it.food_id,
    })),
  });

  // Preseleccionar el tipo sugerido por la hora (solo en alta).
  useEffect(() => {
    if (!isEdit && !type && typesData?.types?.length) {
      setType(typesData.types[0]);
    }
  }, [isEdit, typesData, type]);

  // Prefill en modo edicion una vez que cargaron la comida y todos sus foods.
  const allFoodsLoaded =
    isEdit &&
    existingItems.length > 0 &&
    foodQueries.length === existingItems.length &&
    foodQueries.every((q) => q.data);
  useEffect(() => {
    if (!isEdit || hydrated || !existingMeal) return;
    // Si la comida no tiene items, hidratamos igual; si tiene, esperamos sus foods.
    if (existingItems.length > 0 && !allFoodsLoaded) return;
    setType(existingMeal.type);
    setName(existingMeal.name ?? "");
    setPending(existingMeal.status === "pending");
    setPhotos(existingMeal.photos.map((p) => p.url));
    setItems(
      existingItems.map((it, idx) => {
        const food = foodQueries[idx]?.data as Food;
        return {
          key: nextKey(),
          food,
          quantity: String(it.input_quantity),
          unit: it.input_unit,
        };
      })
    );
    setHydrated(true);
  }, [isEdit, hydrated, existingMeal, allFoodsLoaded]);

  const { data: foodResults, isFetching: searching } = useFoods(query.trim());

  const previewItems = useMemo(
    () =>
      items.map((i) => ({
        food_id: i.food.id,
        quantity: parseFloat(i.quantity) || 0,
        unit: i.unit,
      })),
    [items]
  );
  const { data: preview, isFetching: previewing } = useMealPreview(previewItems);

  function addFood(food: Food) {
    setItems((prev) => [
      ...prev,
      {
        key: nextKey(),
        food,
        quantity: String(food.base_quantity || 100),
        unit: food.base_unit,
      },
    ]);
    setQuery("");
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function handleSave() {
    if (!type.trim()) {
      Alert.alert("Falta el tipo", "Elegi o escribi un tipo de comida.");
      return;
    }
    const reqItems: MealItemRequest[] = [];
    for (const i of items) {
      const qty = parseFloat(i.quantity);
      if (isNaN(qty) || qty <= 0) {
        Alert.alert("Cantidad invalida", `Revisa la cantidad de "${i.food.name}".`);
        return;
      }
      reqItems.push({ food_id: i.food.id, quantity: qty, unit: i.unit });
    }
    if (reqItems.length === 0 && !pending && photos.length === 0) {
      Alert.alert("Comida vacia", "Agrega al menos un alimento, una foto, o marcala como pendiente.");
      return;
    }

    const body = {
      date: existingMeal?.date ?? date,
      type: type.trim(),
      name: name.trim() || undefined,
      status: pending ? ("pending" as const) : ("complete" as const),
      items: reqItems,
      photos: photos.map((url, i) => ({ url, is_primary: i === 0 })),
      tags: existingMeal?.tags ?? [],
      notes: existingMeal?.notes ?? "",
    };
    const opts = {
      onSuccess: () => router.back(),
      onError: (err: any) => Alert.alert("Error", err.message ?? "No se pudo guardar"),
    };

    if (isEdit && id) updateMutation.mutate({ id, data: body }, opts);
    else createMutation.mutate(body, opts);
  }

  const results = foodResults?.items ?? [];
  const showResults = query.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.headerCancel}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? "Editar comida" : "Nueva comida"}</Text>
        <TouchableOpacity
          onPress={handleSave}
          hitSlop={8}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          <Text
            style={[
              styles.headerSave,
              (createMutation.isPending || updateMutation.isPending) && { opacity: 0.5 },
            ]}
          >
            Guardar
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tipo */}
        <Text style={styles.label}>Tipo</Text>
        <View style={styles.chipRow}>
          {typeChips.map((value) => {
            const active = value === type;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setType(value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {typeLabel(value)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput
          style={styles.input}
          placeholder="O escribi un tipo propio (ej: colacion, post-entreno)"
          placeholderTextColor={colors.mutedForeground}
          value={typeChips.includes(type) ? "" : type}
          onChangeText={setType}
          autoCapitalize="none"
        />

        {/* Nombre opcional */}
        <Text style={styles.label}>Nombre (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Ensalada de pollo"
          placeholderTextColor={colors.mutedForeground}
          value={name}
          onChangeText={setName}
        />

        {/* Estado pendiente */}
        <View style={styles.pendingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pendingTitle}>Comida pendiente</Text>
            <Text style={styles.pendingHint}>Guardala solo con fotos y completala despues.</Text>
          </View>
          <Switch
            value={pending}
            onValueChange={setPending}
            trackColor={{ true: colors.warning, false: colors.border }}
            thumbColor={colors.background}
          />
        </View>

        {/* Fotos */}
        <Text style={styles.label}>Fotos</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoRow}
          keyboardShouldPersistTaps="handled"
        >
          {photos.map((url) => (
            <View key={url} style={styles.photoThumb}>
              <Image source={{ uri: url }} style={styles.photoImg} />
              <TouchableOpacity
                style={styles.photoRemove}
                onPress={() => removePhoto(url)}
                hitSlop={6}
              >
                <Text style={styles.photoRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={styles.photoAdd}
            onPress={addPhoto}
            disabled={uploading}
            activeOpacity={0.7}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Text style={styles.photoAddText}>+</Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Buscar alimentos */}
        <View onLayout={(e) => setSearchY(e.nativeEvent.layout.y)}>
          <Text style={styles.label}>Agregar alimentos</Text>
          <TextInput
            style={styles.input}
            placeholder="Buscar alimento..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            onFocus={() =>
              setTimeout(
                () => scrollRef.current?.scrollTo({ y: searchY, animated: true }),
                250
              )
            }
          />
        </View>

        {showResults && (
          <View style={styles.results}>
            {searching && results.length === 0 ? (
              <ActivityIndicator color={colors.primary} style={{ padding: 12 }} />
            ) : results.length === 0 ? (
              <Text style={styles.resultEmpty}>Sin resultados.</Text>
            ) : (
              results.map((food) => (
                <TouchableOpacity
                  key={food.id}
                  style={styles.resultRow}
                  onPress={() => addFood(food)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resultName} numberOfLines={1}>
                    {food.name}
                  </Text>
                  {food.default_calories != null && (
                    <Text style={styles.resultCal}>
                      {food.default_calories.toFixed(0)} kcal/{food.base_quantity}
                      {food.base_unit}
                    </Text>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Items seleccionados */}
        {items.length > 0 && (
          <View style={styles.itemsList}>
            {items.map((item) => {
              const units = getAvailableUnits(item.food);
              return (
                <View key={item.key} style={styles.itemCard}>
                  <View style={styles.itemTop}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.food.name}
                    </Text>
                    <TouchableOpacity onPress={() => removeItem(item.key)} hitSlop={8}>
                      <Text style={styles.itemRemove}>Quitar</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.itemControls}>
                    <TextInput
                      style={styles.qtyInput}
                      value={item.quantity}
                      onChangeText={(t) => updateItem(item.key, { quantity: t })}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={colors.mutedForeground}
                    />
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.unitRow}
                      keyboardShouldPersistTaps="handled"
                    >
                      {units.map((u) => {
                        const active = u === item.unit;
                        return (
                          <TouchableOpacity
                            key={u}
                            style={[styles.unitChip, active && styles.chipActive]}
                            onPress={() => updateItem(item.key, { unit: u })}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.unitText, active && styles.chipTextActive]}>{u}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Preview de macros */}
        {items.length > 0 && (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Totales</Text>
              {previewing && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
            <Text style={styles.previewCal}>
              {preview?.calories != null ? `${preview.calories.toFixed(0)} kcal` : "—"}
            </Text>
            <View style={styles.macroNums}>
              <Text style={styles.macroNum}>P {(preview?.protein_grams ?? 0).toFixed(0)}g</Text>
              <Text style={styles.macroNum}>C {(preview?.carbs_grams ?? 0).toFixed(0)}g</Text>
              <Text style={styles.macroNum}>G {(preview?.fat_grams ?? 0).toFixed(0)}g</Text>
            </View>
            <MacroBar
              protein={preview?.protein_grams ?? 0}
              carbs={preview?.carbs_grams ?? 0}
              fat={preview?.fat_grams ?? 0}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
    paddingVertical: 6,
  },
  pendingTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  pendingHint: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  photoRow: { gap: 10, paddingVertical: 4, alignItems: "center" },
  photoThumb: { position: "relative" },
  photoImg: { width: 80, height: 80, borderRadius: 12, backgroundColor: colors.muted },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.destructive,
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemoveText: { color: "#fff", fontSize: 12, fontWeight: "700", lineHeight: 14 },
  photoAdd: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  photoAddText: { fontSize: 30, fontWeight: "300", color: colors.mutedForeground, lineHeight: 34 },
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
  content: { padding: 16, gap: 10, paddingBottom: 48 },
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
  results: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
  },
  resultEmpty: { padding: 12, fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  resultName: { flex: 1, fontSize: 15, color: colors.foreground },
  resultCal: { fontSize: 12, color: colors.mutedForeground },
  itemsList: { gap: 10, marginTop: 4 },
  itemCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  itemTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  itemName: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.foreground },
  itemRemove: { fontSize: 13, color: colors.destructive, fontWeight: "600" },
  itemControls: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.foreground,
    width: 80,
    textAlign: "center",
  },
  unitRow: { gap: 6, alignItems: "center", paddingRight: 4 },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  unitText: { fontSize: 13, color: colors.foreground },
  previewCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    marginTop: 4,
  },
  previewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  previewTitle: { fontSize: 14, fontWeight: "600", color: colors.mutedForeground },
  previewCal: { fontSize: 26, fontWeight: "700", color: colors.foreground },
  macroNums: { flexDirection: "row", gap: 16 },
  macroNum: { fontSize: 14, color: colors.foreground },
});

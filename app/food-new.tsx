import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreateFood, useUpdateFood, useFood } from "@/lib/hooks/use-foods";
import { useColors, type Palette } from "@/lib/theme";
import type {
  CreateFoodRequest,
  MeasurementType,
  ConversionsRequest,
} from "@/lib/types/food";

const MEASUREMENT_OPTIONS: { value: MeasurementType; label: string }[] = [
  { value: "mass", label: "Peso" },
  { value: "volume", label: "Volumen" },
  { value: "unit", label: "Unidad" },
];

const UNITS_BY_TYPE: Record<MeasurementType, string[]> = {
  mass: ["mg", "g", "kg"],
  volume: ["ml", "cl", "dl", "l"],
  unit: ["u"],
};

function defaultUnit(t: MeasurementType): string {
  return t === "mass" ? "g" : t === "volume" ? "ml" : "u";
}

function toOptNum(s: string): number | undefined {
  if (s.trim() === "") return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : n;
}

interface PortionRow {
  name: string;
  base_equivalent: string;
}

export default function FoodNewScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const createMutation = useCreateFood();
  const updateMutation = useUpdateFood();
  const { data: existing } = useFood(id ?? "");

  const [name, setName] = useState("");
  const [measurementType, setMeasurementType] = useState<MeasurementType>("mass");
  const [baseQuantity, setBaseQuantity] = useState("100");
  const [baseUnit, setBaseUnit] = useState("g");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [ingredientInput, setIngredientInput] = useState("");
  const [portions, setPortions] = useState<PortionRow[]>([]);
  const [gramsPerMl, setGramsPerMl] = useState("");
  const [unitEquivalent, setUnitEquivalent] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const saving = createMutation.isPending || updateMutation.isPending;
  const units = UNITS_BY_TYPE[measurementType];

  useEffect(() => {
    if (!isEdit || hydrated || !existing) return;
    setName(existing.name);
    setMeasurementType(existing.measurement_type);
    setBaseQuantity(String(existing.base_quantity ?? ""));
    setBaseUnit(existing.base_unit);
    setCalories(existing.default_calories != null ? String(existing.default_calories) : "");
    setProtein(existing.default_protein_grams != null ? String(existing.default_protein_grams) : "");
    setCarbs(existing.default_carbs_grams != null ? String(existing.default_carbs_grams) : "");
    setFat(existing.default_fat_grams != null ? String(existing.default_fat_grams) : "");
    setFiber(existing.default_fiber_grams != null ? String(existing.default_fiber_grams) : "");
    setTags(existing.tags ?? []);
    setIngredients((existing.ingredients ?? []).map((i) => i.name));
    setPortions(
      (existing.portions ?? []).map((p) => ({
        name: p.name,
        base_equivalent: String(p.base_equivalent),
      }))
    );
    setGramsPerMl(
      existing.volume_conversion?.grams_per_ml != null
        ? String(existing.volume_conversion.grams_per_ml)
        : ""
    );
    setUnitEquivalent(
      existing.unit_conversion?.base_equivalent != null
        ? String(existing.unit_conversion.base_equivalent)
        : ""
    );
    setHydrated(true);
  }, [isEdit, hydrated, existing]);

  function pickType(t: MeasurementType) {
    setMeasurementType(t);
    if (!UNITS_BY_TYPE[t].includes(baseUnit)) setBaseUnit(defaultUnit(t));
    if (t === "unit" && !baseQuantity) setBaseQuantity("1");
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  }
  function addIngredient() {
    const t = ingredientInput.trim();
    if (t && !ingredients.some((i) => i.toLowerCase() === t.toLowerCase()))
      setIngredients([...ingredients, t]);
    setIngredientInput("");
  }
  function addPortion() {
    setPortions([...portions, { name: "", base_equivalent: "" }]);
  }
  function setPortion(idx: number, field: keyof PortionRow, value: string) {
    setPortions((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  function handleSave() {
    if (!name.trim()) {
      Alert.alert("Falta el nombre", "Ingresa un nombre para el alimento.");
      return;
    }
    if (!baseUnit) {
      Alert.alert("Falta la unidad", "Elegi la unidad base.");
      return;
    }

    const conversions: ConversionsRequest = {};
    const gpm = Number(gramsPerMl);
    if (gramsPerMl.trim() && gpm > 0) conversions.volume_conversion = { grams_per_ml: gpm };
    const ube = Number(unitEquivalent);
    if (unitEquivalent.trim() && ube > 0) conversions.unit_conversion = { base_equivalent: ube };
    const hasConversions = conversions.volume_conversion || conversions.unit_conversion;

    const validPortions = portions
      .filter((p) => p.name.trim() && Number(p.base_equivalent) > 0)
      .map((p) => ({ name: p.name.trim(), base_equivalent: Number(p.base_equivalent) }));

    const body: CreateFoodRequest = {
      name: name.trim(),
      measurement_type: measurementType,
      base_quantity: toOptNum(baseQuantity),
      base_unit: baseUnit,
      default_calories: toOptNum(calories),
      default_protein_grams: toOptNum(protein),
      default_carbs_grams: toOptNum(carbs),
      default_fat_grams: toOptNum(fat),
      default_fiber_grams: toOptNum(fiber),
      conversions: hasConversions ? conversions : undefined,
      portions: validPortions,
      tags,
      ingredients,
    };

    const opts = {
      onSuccess: () => router.back(),
      onError: (err: any) => Alert.alert("Error", err.message ?? "No se pudo guardar"),
    };

    if (isEdit && id) updateMutation.mutate({ id, data: body }, opts);
    else createMutation.mutate(body, opts);
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
        <Text style={styles.headerTitle}>{isEdit ? "Editar alimento" : "Nuevo alimento"}</Text>
        <TouchableOpacity onPress={handleSave} hitSlop={8} disabled={saving}>
          <Text style={[styles.headerSave, saving && { opacity: 0.5 }]}>Guardar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Pechuga de pollo"
          placeholderTextColor={colors.mutedForeground}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Tipo de medida</Text>
        <View style={styles.chipRow}>
          {MEASUREMENT_OPTIONS.map((opt) => {
            const active = opt.value === measurementType;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => pickType(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Cantidad base</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              placeholderTextColor={colors.mutedForeground}
              value={baseQuantity}
              onChangeText={setBaseQuantity}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Unidad base</Text>
            <View style={styles.chipRow}>
              {units.map((u) => {
                const active = u === baseUnit;
                return (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitChip, active && styles.chipActive]}
                    onPress={() => setBaseUnit(u)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.unitText, active && styles.chipTextActive]}>{u}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <Text style={styles.section}>Valores por {baseQuantity || "?"}{baseUnit}</Text>
        <View style={styles.grid}>
          <NumField label="Calorias (kcal)" value={calories} onChange={setCalories} />
          <NumField label="Proteinas (g)" value={protein} onChange={setProtein} />
          <NumField label="Carbohidratos (g)" value={carbs} onChange={setCarbs} />
          <NumField label="Grasas (g)" value={fat} onChange={setFat} />
          <NumField label="Fibra (g)" value={fiber} onChange={setFiber} />
        </View>

        {/* Ingredientes */}
        <Text style={styles.label}>Ingredientes</Text>
        <ChipEditor items={ingredients} onRemove={(i) => setIngredients(ingredients.filter((x) => x !== i))} />
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Agregar ingrediente..."
            placeholderTextColor={colors.mutedForeground}
            value={ingredientInput}
            onChangeText={setIngredientInput}
            onSubmitEditing={addIngredient}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addBtn} onPress={addIngredient} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {/* Tags */}
        <Text style={styles.label}>Tags</Text>
        <ChipEditor items={tags} onRemove={(t) => setTags(tags.filter((x) => x !== t))} />
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Agregar tag..."
            placeholderTextColor={colors.mutedForeground}
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addBtn} onPress={addTag} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {/* Porciones */}
        <View style={styles.sectionRow}>
          <Text style={styles.section}>Porciones</Text>
          <TouchableOpacity onPress={addPortion} hitSlop={8}>
            <Text style={styles.addBtnText}>+ Agregar</Text>
          </TouchableOpacity>
        </View>
        {portions.length === 0 ? (
          <Text style={styles.hint}>Sin porciones. Ej: 1 taza = 240 {baseUnit}</Text>
        ) : (
          portions.map((p, idx) => (
            <View key={idx} style={styles.portionRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Nombre (taza, porcion)"
                placeholderTextColor={colors.mutedForeground}
                value={p.name}
                onChangeText={(t) => setPortion(idx, "name", t)}
              />
              <Text style={styles.eq}>=</Text>
              <TextInput
                style={[styles.input, { width: 70 }]}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                value={p.base_equivalent}
                onChangeText={(t) => setPortion(idx, "base_equivalent", t)}
                keyboardType="decimal-pad"
              />
              <Text style={styles.unitSuffix}>{baseUnit}</Text>
              <TouchableOpacity onPress={() => setPortions(portions.filter((_, i) => i !== idx))} hitSlop={8}>
                <Text style={styles.remove}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Conversiones */}
        {(measurementType === "mass" || measurementType === "volume") && (
          <>
            <Text style={styles.section}>Densidad (g/ml)</Text>
            <View style={styles.convRow}>
              <Text style={styles.convPrefix}>1 ml =</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Ej: 0.92"
                placeholderTextColor={colors.mutedForeground}
                value={gramsPerMl}
                onChangeText={setGramsPerMl}
                keyboardType="decimal-pad"
              />
              <Text style={styles.unitSuffix}>g</Text>
            </View>
          </>
        )}
        {measurementType === "unit" && (
          <>
            <Text style={styles.section}>Equivalencia por unidad</Text>
            <View style={styles.convRow}>
              <Text style={styles.convPrefix}>1 u =</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Ej: 50"
                placeholderTextColor={colors.mutedForeground}
                value={unitEquivalent}
                onChangeText={setUnitEquivalent}
                keyboardType="decimal-pad"
              />
              <Text style={styles.unitSuffix}>g</Text>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.gridItem}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder="0"
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
      />
    </View>
  );
}

function ChipEditor({ items, onRemove }: { items: string[]; onRemove: (item: string) => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (items.length === 0) return null;
  return (
    <View style={styles.chipWrap}>
      {items.map((item) => (
        <TouchableOpacity
          key={item}
          style={styles.editChip}
          onPress={() => onRemove(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.editChipText}>{item}</Text>
          <Text style={styles.editChipX}>✕</Text>
        </TouchableOpacity>
      ))}
    </View>
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
  section: { fontSize: 15, fontWeight: "700", color: colors.foreground, marginTop: 14 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  hint: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.foreground,
  },
  row: { flexDirection: "row", gap: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: { width: "47%", flexGrow: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
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
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  unitText: { fontSize: 13, color: colors.foreground },
  addRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  addBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  editChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.muted,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editChipText: { fontSize: 13, color: colors.foreground },
  editChipX: { fontSize: 11, color: colors.mutedForeground },
  portionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  eq: { fontSize: 14, color: colors.mutedForeground },
  unitSuffix: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  remove: { fontSize: 16, color: colors.destructive, paddingHorizontal: 4 },
  convRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  convPrefix: { fontSize: 14, color: colors.mutedForeground },
});

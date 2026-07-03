import { useMemo, useState } from "react";
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
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDate } from "@/lib/date-context";
import { useImageUpload } from "@/lib/hooks/use-image-upload";
import { useEstimateMeal, useMyAiUsage } from "@/lib/hooks/use-ai";
import { useCreateFood } from "@/lib/hooks/use-foods";
import { useCreateMeal } from "@/lib/hooks/use-meals";
import { ApiError } from "@/lib/api/client";
import { useColors, type Palette } from "@/lib/theme";
import { MacroBar } from "@/components/macro-bar";
import type {
  AiConfidence,
  AiEstimateCorrection,
  AiNewFoodSuggestion,
  EstimateMealResponse,
} from "@/lib/types/ai";

interface PhotoItem {
  key: string;
  uri: string;
  remoteUrl?: string;
  status: "uploading" | "done" | "error";
  asset?: any;
}

interface DraftItem {
  key: string;
  food_id: string;
  food_name: string;
  quantity: string;
  unit: string;
  include: boolean;
  confidence?: AiConfidence;
  assumption?: string;
  sanity_warnings?: string[];
}

let keyCounter = 0;
const nextKey = () => `ai_${++keyCounter}`;

function estimateError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return "Alcanzaste tu límite mensual de IA.";
    if (err.status === 404) return "La estimación por IA no está disponible en el servidor.";
    if (err.status === 500) return "Falló el proveedor de IA. Probá más tarde.";
    return err.message;
  }
  return "No se pudo estimar la comida.";
}

export default function MealAiScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { date } = useDate();

  const { pickAsset, uploadAsset } = useImageUpload();
  const estimate = useEstimateMeal();
  const createFood = useCreateFood();
  const createMeal = useCreateMeal();
  const { data: usage } = useMyAiUsage();

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [instructions, setInstructions] = useState("");
  const [assumeOnlyVisible, setAssumeOnlyVisible] = useState(false);

  const [result, setResult] = useState<EstimateMealResponse | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(new Set());

  const [corrItem, setCorrItem] = useState("");
  const [corrText, setCorrText] = useState("");
  const [corrections, setCorrections] = useState<AiEstimateCorrection[]>([]);

  const [mealType, setMealType] = useState("otro");
  const [mealName, setMealName] = useState("");

  // ─────────── Fotos (subida concurrente) ───────────
  function startUpload(key: string, asset: any) {
    uploadAsset(asset).then((url) => {
      setPhotos((prev) =>
        prev.map((p) =>
          p.key === key ? { ...p, remoteUrl: url ?? undefined, status: url ? "done" : "error" } : p
        )
      );
    });
  }
  async function addPhoto() {
    const asset = await pickAsset();
    if (!asset) return;
    const key = nextKey();
    setPhotos((prev) => [...prev, { key, uri: asset.uri, status: "uploading", asset }]);
    startUpload(key, asset);
  }
  function removePhoto(key: string) {
    setPhotos((prev) => prev.filter((p) => p.key !== key));
  }

  const uploadedUrls = photos.filter((p) => p.status === "done" && p.remoteUrl).map((p) => p.remoteUrl!);
  const uploading = photos.some((p) => p.status === "uploading");

  // ─────────── Estimar ───────────
  function applyResult(res: EstimateMealResponse) {
    setResult(res);
    setItems(
      res.matched_items.map((m) => ({
        key: nextKey(),
        food_id: m.food_id,
        food_name: m.food_name,
        quantity: String(m.estimated_quantity),
        unit: m.unit,
        include: true,
        confidence: m.confidence,
        assumption: m.assumption,
        sanity_warnings: m.sanity_warnings,
      }))
    );
    setAddedSuggestions(new Set());
  }

  function runEstimate(corr?: AiEstimateCorrection[]) {
    if (uploadedUrls.length === 0 && !instructions.trim()) {
      Alert.alert("Falta info", "Agregá al menos una foto o una descripción.");
      return;
    }
    if (uploading) {
      Alert.alert("Subiendo fotos", "Esperá a que terminen de subirse las fotos.");
      return;
    }
    estimate.mutate(
      {
        photo_urls: uploadedUrls.length ? uploadedUrls : undefined,
        instructions: instructions.trim() || undefined,
        assume_only_visible: assumeOnlyVisible,
        corrections: corr && corr.length > 0 ? corr : undefined,
      },
      {
        onSuccess: (res) => applyResult(res),
        onError: (err) => Alert.alert("Error", estimateError(err)),
      }
    );
  }

  async function addSuggestion(sug: AiNewFoodSuggestion, idx: number) {
    try {
      const food = await createFood.mutateAsync({
        name: sug.name,
        measurement_type: sug.create_params.measurement_type,
        base_unit: sug.create_params.base_unit,
        base_quantity: sug.create_params.base_quantity,
        default_calories: sug.create_params.default_calories ?? undefined,
        default_protein_grams: sug.create_params.default_protein_grams ?? undefined,
        default_carbs_grams: sug.create_params.default_carbs_grams ?? undefined,
        default_fat_grams: sug.create_params.default_fat_grams ?? undefined,
        default_fiber_grams: sug.create_params.default_fiber_grams ?? undefined,
      });
      setItems((prev) => [
        ...prev,
        {
          key: nextKey(),
          food_id: food.id,
          food_name: food.name,
          quantity: String(sug.estimated_quantity),
          unit: sug.unit,
          include: true,
          confidence: sug.confidence,
          assumption: sug.assumption,
        },
      ]);
      setAddedSuggestions((prev) => new Set(prev).add(String(idx)));
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo crear el alimento");
    }
  }

  function addCorrection() {
    if (!corrText.trim()) return;
    setCorrections((prev) => [...prev, { item: corrItem.trim(), correction: corrText.trim() }]);
    setCorrItem("");
    setCorrText("");
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function handleSave() {
    const chosen = items.filter((i) => i.include);
    if (chosen.length === 0) {
      Alert.alert("Comida vacía", "Incluí al menos un alimento.");
      return;
    }
    for (const i of chosen) {
      const q = parseFloat(i.quantity);
      if (isNaN(q) || q <= 0) {
        Alert.alert("Cantidad inválida", `Revisá la cantidad de "${i.food_name}".`);
        return;
      }
    }
    const hadPhotos = uploadedUrls.length > 0;
    createMeal.mutate(
      {
        date,
        type: mealType.trim() || "otro",
        name: mealName.trim() || undefined,
        status: "complete",
        photos: uploadedUrls.map((url, i) => ({ url, is_primary: i === 0 })),
        items: chosen.map((i) => ({
          food_id: i.food_id,
          quantity: parseFloat(i.quantity),
          unit: i.unit,
          measurement_method: hadPhotos ? "photo_estimate" : "visual_estimate",
        })),
        tags: [],
        notes: "",
      },
      {
        onSuccess: () => router.back(),
        onError: (err: any) => Alert.alert("Error", err.message ?? "No se pudo guardar"),
      }
    );
  }

  const usageHint = usage
    ? usage.effective_limit_usd != null
      ? `IA: $${usage.cost_usd.toFixed(2)} de $${usage.effective_limit_usd.toFixed(2)} este mes`
      : `IA: $${usage.cost_usd.toFixed(2)} este mes (sin tope)`
    : "";

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.headerCancel}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Estimar con IA</Text>
        {result ? (
          <TouchableOpacity onPress={handleSave} hitSlop={8} disabled={createMeal.isPending}>
            <Text style={[styles.headerSave, createMeal.isPending && { opacity: 0.5 }]}>Guardar</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {usageHint ? <Text style={styles.usageHint}>{usageHint}</Text> : null}

        {!result ? (
          <>
            {/* Fotos */}
            <Text style={styles.label}>Fotos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {photos.map((item) => (
                <View key={item.key} style={styles.photoThumb}>
                  <Image source={{ uri: item.uri }} style={styles.photoImg} />
                  {item.status === "uploading" && (
                    <View style={styles.photoOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  )}
                  {item.status === "error" && (
                    <View style={styles.photoOverlay}>
                      <Text style={styles.photoErr}>error</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(item.key)} hitSlop={6}>
                    <Text style={styles.photoRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 4 && (
                <TouchableOpacity style={styles.photoAdd} onPress={addPhoto} activeOpacity={0.7}>
                  <Text style={styles.photoAddText}>+</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Instrucciones */}
            <Text style={styles.label}>Descripción / instrucciones (opcional)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Ej: arroz integral ~200g, pechuga a la plancha sin aceite"
              placeholderTextColor={colors.mutedForeground}
              value={instructions}
              onChangeText={setInstructions}
              multiline
            />

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Asumir solo lo visible</Text>
                <Text style={styles.switchHint}>Estimá únicamente lo que se ve en la foto.</Text>
              </View>
              <Switch
                value={assumeOnlyVisible}
                onValueChange={setAssumeOnlyVisible}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.background}
              />
            </View>

            <Text style={styles.privacy}>
              ⚠ Las fotos se envían a un proveedor de IA (OpenAI) para el análisis. La estimación es
              orientativa (~35-40% de error).
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, estimate.isPending && { opacity: 0.6 }]}
              onPress={() => runEstimate()}
              disabled={estimate.isPending}
              activeOpacity={0.85}
            >
              {estimate.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <View style={styles.btnRowInner}>
                  <Ionicons name="sparkles" size={16} color={colors.primaryForeground} />
                  <Text style={styles.primaryBtnText}>Estimar</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Clarificación */}
            {result.needs_clarification && result.clarification_question ? (
              <View style={styles.clarifyCard}>
                <Text style={styles.clarifyText}>
                  <Text style={{ fontWeight: "700" }}>La IA necesita una aclaración: </Text>
                  {result.clarification_question}
                </Text>
              </View>
            ) : null}

            {/* Items */}
            <Text style={styles.label}>Alimentos detectados</Text>
            {items.map((it) => (
              <View key={it.key} style={styles.itemCard}>
                <View style={styles.itemTop}>
                  <TouchableOpacity
                    onPress={() => updateItem(it.key, { include: !it.include })}
                    style={styles.check}
                    hitSlop={6}
                  >
                    <Ionicons
                      name={it.include ? "checkbox" : "square-outline"}
                      size={22}
                      color={it.include ? colors.primary : colors.mutedForeground}
                    />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {it.food_name}
                      </Text>
                      {it.confidence && <ConfidenceBadge c={it.confidence} colors={colors} />}
                    </View>
                    {it.assumption ? <Text style={styles.assumption}>{it.assumption}</Text> : null}
                    {(it.sanity_warnings ?? []).map((w, i) => (
                      <Text key={i} style={styles.warning}>
                        ⚠ {w}
                      </Text>
                    ))}
                  </View>
                </View>
                <View style={styles.qtyRow}>
                  <TextInput
                    style={styles.qtyInput}
                    value={it.quantity}
                    onChangeText={(t) => updateItem(it.key, { quantity: t })}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.unit}>{it.unit}</Text>
                </View>
              </View>
            ))}

            {/* Sugerencias de alimentos nuevos */}
            {result.new_food_suggestions.length > 0 && (
              <>
                <Text style={styles.label}>Sugerencias (no están en tu base)</Text>
                {result.new_food_suggestions.map((sug, idx) => {
                  const added = addedSuggestions.has(String(idx));
                  return (
                    <View key={idx} style={styles.suggestCard}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.nameRow}>
                          <Text style={styles.itemName}>{sug.name}</Text>
                          <ConfidenceBadge c={sug.confidence} colors={colors} />
                        </View>
                        <Text style={styles.assumption}>
                          {sug.estimated_quantity} {sug.unit} ·{" "}
                          {sug.create_params.default_calories ?? "?"} kcal/{sug.create_params.base_quantity}
                          {sug.create_params.base_unit}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.addFoodBtn, added && { opacity: 0.5 }]}
                        onPress={() => !added && addSuggestion(sug, idx)}
                        disabled={added || createFood.isPending}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.addFoodText}>{added ? "Agregado" : "Crear"}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </>
            )}

            {/* Totales */}
            <View style={styles.totalsCard}>
              <Text style={styles.totalsCal}>{result.totals.calories.toFixed(0)} kcal</Text>
              <View style={styles.macroNums}>
                <Text style={styles.macroNum}>P {result.totals.protein_grams.toFixed(0)}g</Text>
                <Text style={styles.macroNum}>C {result.totals.carbs_grams.toFixed(0)}g</Text>
                <Text style={styles.macroNum}>G {result.totals.fat_grams.toFixed(0)}g</Text>
              </View>
              <MacroBar
                protein={result.totals.protein_grams}
                carbs={result.totals.carbs_grams}
                fat={result.totals.fat_grams}
              />
            </View>

            {/* Assumptions */}
            {result.assumptions.length > 0 && (
              <View style={styles.chipWrap}>
                {result.assumptions.map((a, i) => (
                  <View key={i} style={styles.assumeChip}>
                    <Text style={styles.assumeChipText}>{a}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Correcciones / re-estimar */}
            <Text style={styles.label}>Corregir y re-estimar</Text>
            {corrections.map((c, i) => (
              <Text key={i} style={styles.corrLine}>
                • {c.item ? `${c.item}: ` : ""}
                {c.correction}
              </Text>
            ))}
            <TextInput
              style={styles.input}
              placeholder="Ítem (opcional, ej: Arroz)"
              placeholderTextColor={colors.mutedForeground}
              value={corrItem}
              onChangeText={setCorrItem}
            />
            <View style={styles.corrRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Corrección (ej: era integral, 250g)"
                placeholderTextColor={colors.mutedForeground}
                value={corrText}
                onChangeText={setCorrText}
              />
              <TouchableOpacity style={styles.smallBtn} onPress={addCorrection} activeOpacity={0.8}>
                <Text style={styles.smallBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            {corrections.length > 0 && (
              <TouchableOpacity
                style={[styles.ghostBtn, estimate.isPending && { opacity: 0.6 }]}
                onPress={() => runEstimate(corrections)}
                disabled={estimate.isPending}
                activeOpacity={0.85}
              >
                {estimate.isPending ? (
                  <ActivityIndicator color={colors.foreground} />
                ) : (
                  <Text style={styles.ghostBtnText}>Re-estimar con correcciones</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Tipo + nombre */}
            <Text style={styles.label}>Tipo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: almuerzo, cena"
              placeholderTextColor={colors.mutedForeground}
              value={mealType}
              onChangeText={setMealType}
              autoCapitalize="none"
            />
            <Text style={styles.label}>Nombre (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Ensalada de pollo"
              placeholderTextColor={colors.mutedForeground}
              value={mealName}
              onChangeText={setMealName}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ConfidenceBadge({ c, colors }: { c: AiConfidence; colors: Palette }) {
  const map = {
    high: { bg: colors.success, label: "alta" },
    medium: { bg: colors.warning, label: "media" },
    low: { bg: colors.destructive, label: "baja" },
  } as const;
  const { bg, label } = map[c];
  return (
    <View style={{ backgroundColor: bg + "26", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color: bg, fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
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
    content: { padding: 16, gap: 10, paddingBottom: 48 },
    usageHint: { fontSize: 12, color: colors.mutedForeground, textAlign: "right" },
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
    multiline: { minHeight: 72, textAlignVertical: "top", paddingTop: 12 },
    switchRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
    switchTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
    switchHint: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    privacy: { fontSize: 12, color: colors.mutedForeground, marginTop: 6, lineHeight: 17 },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 10,
    },
    btnRowInner: { flexDirection: "row", alignItems: "center", gap: 8 },
    primaryBtnText: { color: colors.primaryForeground, fontSize: 16, fontWeight: "700" },
    photoRow: { gap: 10, paddingVertical: 4, alignItems: "center" },
    photoThumb: { position: "relative" },
    photoImg: { width: 80, height: 80, borderRadius: 12, backgroundColor: colors.muted },
    photoOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 12,
      backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center",
      justifyContent: "center",
    },
    photoErr: { color: "#fff", fontSize: 11, fontWeight: "700" },
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
    clarifyCard: {
      backgroundColor: colors.warning + "14",
      borderWidth: 1,
      borderColor: colors.warning + "55",
      borderRadius: 12,
      padding: 12,
    },
    clarifyText: { fontSize: 14, color: colors.foreground, lineHeight: 20 },
    itemCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      gap: 10,
    },
    itemTop: { flexDirection: "row", gap: 10 },
    check: { paddingTop: 1 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    itemName: { fontSize: 15, fontWeight: "600", color: colors.foreground, flexShrink: 1 },
    assumption: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    warning: { fontSize: 12, color: colors.warning, marginTop: 2 },
    qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    qtyInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 15,
      color: colors.foreground,
      width: 90,
      textAlign: "center",
    },
    unit: { fontSize: 14, color: colors.mutedForeground },
    suggestCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
      borderRadius: 12,
      padding: 12,
    },
    addFoodBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    addFoodText: { color: colors.primaryForeground, fontSize: 13, fontWeight: "700" },
    totalsCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      gap: 8,
      marginTop: 4,
    },
    totalsCal: { fontSize: 24, fontWeight: "700", color: colors.foreground },
    macroNums: { flexDirection: "row", gap: 16 },
    macroNum: { fontSize: 14, color: colors.foreground },
    chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    assumeChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    assumeChipText: { fontSize: 12, color: colors.mutedForeground },
    corrLine: { fontSize: 13, color: colors.foreground },
    corrRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    smallBtn: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    smallBtnText: { color: colors.primaryForeground, fontSize: 22, fontWeight: "300" },
    ghostBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    ghostBtnText: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  });

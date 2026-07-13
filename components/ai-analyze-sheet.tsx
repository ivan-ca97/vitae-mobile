import { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEstimateMeal, useMyAiUsage } from "@/lib/hooks/use-ai";
import { useCreateFood } from "@/lib/hooks/use-foods";
import { getFood } from "@/lib/api/foods";
import { ApiError } from "@/lib/api/client";
import { useColors, type Palette } from "@/lib/theme";
import { MacroBar } from "@/components/macro-bar";
import type { Food } from "@/lib/types/food";
import type {
  AiConfidence,
  AiEstimateCorrection,
  AiNewFoodSuggestion,
  EstimateMealResponse,
} from "@/lib/types/ai";

/** Alimento estimado por IA, listo para inyectar como ítem de la comida. */
export interface AiAppliedItem {
  food: Food;
  quantity: number;
  unit: string;
  measurement_method: string;
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
  food?: Food; // presente en los creados desde una sugerencia (evita re-fetch)
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

/**
 * Hoja de análisis por IA: toma las fotos ya subidas de la comida + indicaciones,
 * estima los alimentos y, al aplicar, los devuelve al formulario vía `onApply`.
 * No persiste nada por sí sola.
 */
export function AiAnalyzeSheet({
  visible,
  onClose,
  photoUrls,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  photoUrls: string[];
  onApply: (items: AiAppliedItem[]) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const estimate = useEstimateMeal();
  const createFood = useCreateFood();
  const { data: usage } = useMyAiUsage();

  const [instructions, setInstructions] = useState("");
  const [assumeOnlyVisible, setAssumeOnlyVisible] = useState(false);

  const [result, setResult] = useState<EstimateMealResponse | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(new Set());

  const [corrItem, setCorrItem] = useState("");
  const [corrText, setCorrText] = useState("");
  const [corrections, setCorrections] = useState<AiEstimateCorrection[]>([]);
  const [applying, setApplying] = useState(false);

  const hadPhotos = photoUrls.length > 0;

  function reset() {
    setInstructions("");
    setAssumeOnlyVisible(false);
    setResult(null);
    setItems([]);
    setAddedSuggestions(new Set());
    setCorrItem("");
    setCorrText("");
    setCorrections([]);
    setApplying(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

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

  // Volver a la fase de input conservando fotos/instrucciones.
  function backToInput() {
    setResult(null);
    setItems([]);
    setCorrections([]);
    setCorrItem("");
    setCorrText("");
  }

  function runEstimate(corr?: AiEstimateCorrection[]) {
    if (!hadPhotos && !instructions.trim()) {
      Alert.alert("Falta info", "Agregá una foto o una descripción.");
      return;
    }
    estimate.mutate(
      {
        photo_urls: hadPhotos ? photoUrls : undefined,
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
          food,
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

  async function handleApply() {
    const chosen = items.filter((i) => i.include);
    if (chosen.length === 0) {
      Alert.alert("Sin alimentos", "Incluí al menos un alimento.");
      return;
    }
    for (const i of chosen) {
      const q = parseFloat(i.quantity);
      if (isNaN(q) || q <= 0) {
        Alert.alert("Cantidad inválida", `Revisá la cantidad de "${i.food_name}".`);
        return;
      }
    }
    setApplying(true);
    try {
      const method = hadPhotos ? "photo_estimate" : "visual_estimate";
      const applied: AiAppliedItem[] = await Promise.all(
        chosen.map(async (i) => ({
          food: i.food ?? (await getFood(i.food_id)),
          quantity: parseFloat(i.quantity),
          unit: i.unit,
          measurement_method: method,
        }))
      );
      onApply(applied);
      handleClose();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudieron agregar los alimentos");
    } finally {
      setApplying(false);
    }
  }

  const usageHint = usage
    ? usage.effective_limit_usd != null
      ? `IA: $${usage.cost_usd.toFixed(2)} de $${usage.effective_limit_usd.toFixed(2)} este mes`
      : `IA: $${usage.cost_usd.toFixed(2)} este mes (sin tope)`
    : "";

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={handleClose} hitSlop={8}>
            <Text style={styles.headerCancel}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analizar con IA</Text>
          {result ? (
            <TouchableOpacity onPress={handleApply} hitSlop={8} disabled={applying}>
              <Text style={[styles.headerSave, applying && { opacity: 0.5 }]}>Agregar</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 64 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {usageHint ? <Text style={styles.usageHint}>{usageHint}</Text> : null}

          {!result ? (
            <>
              <Text style={styles.subtitle}>
                {hadPhotos
                  ? `La IA analiza ${photoUrls.length} foto${photoUrls.length === 1 ? "" : "s"} y sugiere los alimentos de la comida.`
                  : "Describí la comida y la IA sugiere los alimentos."}
              </Text>

              <Text style={styles.label}>Indicaciones (opcional)</Text>
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
              {result.no_food_detected && (
                <View style={styles.noFoodCard}>
                  <Text style={styles.noFoodText}>
                    <Text style={{ fontWeight: "700" }}>No se detectó comida en las fotos. </Text>
                    Revisá que muestren comida o bebida; podés describirla por texto y volver a estimar.
                  </Text>
                </View>
              )}

              {result.needs_clarification && result.clarification_question ? (
                <View style={styles.clarifyCard}>
                  <Text style={styles.clarifyText}>
                    <Text style={{ fontWeight: "700" }}>La IA necesita una aclaración: </Text>
                    {result.clarification_question}
                  </Text>
                </View>
              ) : null}

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

              {result.assumptions.length > 0 && (
                <View style={styles.chipWrap}>
                  {result.assumptions.map((a, i) => (
                    <View key={i} style={styles.assumeChip}>
                      <Text style={styles.assumeChipText}>{a}</Text>
                    </View>
                  ))}
                </View>
              )}

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

              <TouchableOpacity style={styles.backBtn} onPress={backToInput} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={16} color={colors.mutedForeground} />
                <Text style={styles.backBtnText}>Volver a editar indicaciones</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, applying && { opacity: 0.6 }]}
                onPress={handleApply}
                disabled={applying}
                activeOpacity={0.85}
              >
                {applying ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={styles.primaryBtnText}>Agregar a la comida</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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
    subtitle: { fontSize: 14, color: colors.mutedForeground, lineHeight: 20 },
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
    noFoodCard: {
      backgroundColor: colors.destructive + "14",
      borderWidth: 1,
      borderColor: colors.destructive + "55",
      borderRadius: 12,
      padding: 12,
    },
    noFoodText: { fontSize: 14, color: colors.foreground, lineHeight: 20 },
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
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      marginTop: 4,
    },
    backBtnText: { fontSize: 14, color: colors.mutedForeground, fontWeight: "600" },
  });

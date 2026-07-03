import { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMyAiUsage, useSetAiSelfLimit } from "@/lib/hooks/use-ai";
import { useColors, type Palette } from "@/lib/theme";

/** Card de consumo/cuota del asistente de IA. No se muestra si la feature está off. */
export function AiUsageCard() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: usage, isError } = useMyAiUsage();
  const setLimit = useSetAiSelfLimit();
  const [limitInput, setLimitInput] = useState("");

  // Feature off (404) o aún sin datos → no mostramos nada.
  if (isError || !usage) return null;

  const limit = usage.effective_limit_usd;
  const pct = limit != null && limit > 0 ? Math.min(100, Math.round((usage.cost_usd / limit) * 100)) : null;

  function save() {
    const t = limitInput.trim();
    const value = t === "" ? null : parseFloat(t);
    if (value != null && (isNaN(value) || value < 0)) {
      Alert.alert("Valor inválido", "Ingresá un número (o vacío para quitar el auto-límite).");
      return;
    }
    setLimit.mutate(value, {
      onSuccess: () => setLimitInput(""),
      onError: (e: any) => Alert.alert("Error", e?.message ?? "No se pudo guardar"),
    });
  }

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="sparkles" size={16} color={colors.foreground} />
        <Text style={styles.title}>Asistente de IA</Text>
      </View>

      <View style={styles.usageRow}>
        <Text style={styles.usageLabel}>Consumo del mes · {usage.tier_name}</Text>
        <Text style={styles.usageValue}>
          ${usage.cost_usd.toFixed(2)}
          {limit != null ? ` / $${limit.toFixed(2)}` : " (sin tope)"}
        </Text>
      </View>
      {pct != null && (
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
      )}

      <Text style={styles.limitLabel}>Auto-límite mensual (USD)</Text>
      <View style={styles.limitRow}>
        <TextInput
          style={styles.input}
          placeholder={limit != null ? `Actual: $${limit.toFixed(2)} · vacío = sin tope` : "Ej: 5.00"}
          placeholderTextColor={colors.mutedForeground}
          value={limitInput}
          onChangeText={setLimitInput}
          keyboardType="decimal-pad"
        />
        <TouchableOpacity
          style={[styles.saveBtn, setLimit.isPending && { opacity: 0.6 }]}
          onPress={save}
          disabled={setLimit.isPending}
          activeOpacity={0.8}
        >
          <Text style={styles.saveText}>Guardar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
      marginTop: 8,
    },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { fontSize: 15, fontWeight: "700", color: colors.foreground },
    usageRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    usageLabel: { fontSize: 13, color: colors.mutedForeground },
    usageValue: { fontSize: 13, fontWeight: "600", color: colors.foreground },
    barBg: { height: 8, borderRadius: 4, backgroundColor: colors.muted, overflow: "hidden" },
    barFill: { height: "100%", borderRadius: 4, backgroundColor: colors.primary },
    limitLabel: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
    limitRow: { flexDirection: "row", gap: 8 },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.foreground,
    },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 16,
      justifyContent: "center",
    },
    saveText: { color: colors.primaryForeground, fontSize: 14, fontWeight: "600" },
  });

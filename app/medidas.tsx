import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import {
  useBodyMeasurements,
  useUpsertBodyMeasurement,
  useDeleteBodyMeasurement,
} from "@/lib/hooks/use-body-measurements";
import { todayStr, daysAgoStr as daysAgo } from "@/lib/format";
import { useColors, type Palette } from "@/lib/theme";
import { ScreenHeader } from "@/components/screen-header";
import type { BodyMeasurement } from "@/lib/types/body-measurement";

const TYPES: { value: string; label: string }[] = [
  { value: "chest", label: "Pecho" },
  { value: "waist", label: "Cintura" },
  { value: "hips", label: "Cadera" },
  { value: "shoulders", label: "Hombros" },
  { value: "neck", label: "Cuello" },
  { value: "forearm", label: "Antebrazo" },
  { value: "bicep_left", label: "Bicep izq" },
  { value: "bicep_right", label: "Bicep der" },
  { value: "thigh_left", label: "Muslo izq" },
  { value: "thigh_right", label: "Muslo der" },
  { value: "calf_left", label: "Pantorrilla izq" },
  { value: "calf_right", label: "Pantorrilla der" },
];

const LABELS: Record<string, string> = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));


function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

export default function MedidasScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const range = useMemo(() => ({ from: daysAgo(120), to: daysAgo(0) }), []);
  const { data, isLoading } = useBodyMeasurements(range);
  const upsert = useUpsertBodyMeasurement();
  const del = useDeleteBodyMeasurement();

  const [type, setType] = useState("waist");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  function handleSave() {
    const v = parseFloat(value);
    if (isNaN(v) || v <= 0) {
      Alert.alert("Valor invalido", "Ingresa una medida valida en cm.");
      return;
    }
    upsert.mutate(
      { date: todayStr(), type, data: { value: v, notes: notes.trim() || undefined } },
      {
        onSuccess: () => {
          setValue("");
          setNotes("");
        },
        onError: (err: any) => Alert.alert("Error", err.message ?? "No se pudo guardar"),
      }
    );
  }

  function handleDelete(m: BodyMeasurement) {
    Alert.alert("Eliminar medida", `Eliminar ${LABELS[m.type] ?? m.type} del ${fmtDate(m.date)}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => del.mutate({ date: m.date, type: m.type }),
      },
    ]);
  }

  // Agrupar por fecha (desc).
  const grouped = useMemo(() => {
    const items = data?.items ?? [];
    const map = new Map<string, BodyMeasurement[]>();
    for (const m of items) {
      const arr = map.get(m.date) ?? [];
      arr.push(m);
      map.set(m.date, arr);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [data]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader title="Medidas corporales" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nueva medida (hoy)</Text>
          <View style={styles.chipRow}>
            {TYPES.map((t) => {
              const active = t.value === type;
              return (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setType(t.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.formRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Valor (cm)"
              placeholderTextColor={colors.mutedForeground}
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, { flex: 1.5 }]}
              placeholder="Notas (opcional)"
              placeholderTextColor={colors.mutedForeground}
              value={notes}
              onChangeText={setNotes}
            />
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, upsert.isPending && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={upsert.isPending}
            activeOpacity={0.85}
          >
            <Text style={styles.saveText}>{upsert.isPending ? "Guardando..." : "Guardar"}</Text>
          </TouchableOpacity>
        </View>

        {/* Lista */}
        {isLoading && !data ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : grouped.length === 0 ? (
          <Text style={styles.empty}>Sin medidas registradas.</Text>
        ) : (
          grouped.map(([date, items]) => (
            <View key={date} style={styles.group}>
              <Text style={styles.groupDate}>{fmtDate(date)}</Text>
              <View style={styles.list}>
                {items.map((m) => (
                  <TouchableOpacity
                    key={m.type}
                    style={styles.row}
                    onLongPress={() => handleDelete(m)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.rowLabel}>{LABELS[m.type] ?? m.type}</Text>
                    {m.notes ? <Text style={styles.rowNotes} numberOfLines={1}>{m.notes}</Text> : null}
                    <Text style={styles.rowValue}>{m.value} cm</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}
        {grouped.length > 0 && (
          <Text style={styles.hint}>Manten presionada una medida para eliminarla.</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, gap: 16, paddingBottom: 40 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    cardTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, color: colors.foreground },
    chipTextActive: { color: colors.primaryForeground, fontWeight: "600" },
    formRow: { flexDirection: "row", gap: 10 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 15,
      color: colors.foreground,
    },
    saveBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
    saveText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "600" },
    empty: { textAlign: "center", color: colors.mutedForeground, marginTop: 30, fontSize: 14 },
    group: { gap: 6 },
    groupDate: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground, textTransform: "capitalize" },
    list: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLabel: { fontSize: 15, color: colors.foreground, fontWeight: "500" },
    rowNotes: { flex: 1, fontSize: 12, color: colors.mutedForeground },
    rowValue: {
      marginLeft: "auto",
      fontSize: 15,
      fontWeight: "600",
      color: colors.foreground,
      fontVariant: ["tabular-nums"],
    },
    hint: { fontSize: 12, color: colors.mutedForeground },
  });

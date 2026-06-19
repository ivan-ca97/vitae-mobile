import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import {
  useOwnedShares,
  useReceivedShares,
  useCreateShare,
  useUpdateShare,
  useDeleteShare,
} from "@/lib/hooks/use-shares";
import { useColors, type Palette } from "@/lib/theme";
import { ScreenHeader } from "@/components/screen-header";
import type { Share } from "@/lib/types/share";

const RESOURCES: { value: string; label: string }[] = [
  { value: "meals", label: "Comidas" },
  { value: "exercises", label: "Ejercicios" },
  { value: "weight", label: "Peso" },
  { value: "foods", label: "Alimentos" },
  { value: "goals", label: "Metas" },
  { value: "daily", label: "Diario" },
];

const LABELS: Record<string, string> = Object.fromEntries(RESOURCES.map((r) => [r.value, r.label]));

function shortId(id: string): string {
  return id.slice(0, 8);
}

export default function CompartirScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const owned = useOwnedShares();
  const received = useReceivedShares();
  const createShare = useCreateShare();
  const updateShare = useUpdateShare();
  const deleteShare = useDeleteShare();

  const [email, setEmail] = useState("");
  const [resource, setResource] = useState("meals");
  const [canWrite, setCanWrite] = useState(false);

  function handleCreate() {
    const e = email.trim();
    if (!e) {
      Alert.alert("Falta el email", "Ingresa el email de la persona con quien compartir.");
      return;
    }
    createShare.mutate(
      { grantee_email: e, resource_type: resource, can_write: canWrite },
      {
        onSuccess: () => {
          setEmail("");
          setCanWrite(false);
        },
        onError: (err: any) => Alert.alert("Error", err.message ?? "No se pudo compartir"),
      }
    );
  }

  function handleToggleWrite(share: Share, value: boolean) {
    updateShare.mutate(
      { id: share.id, canWrite: value },
      { onError: (err: any) => Alert.alert("Error", err.message ?? "No se pudo actualizar el permiso") }
    );
  }

  function handleRevoke(share: Share) {
    Alert.alert("Revocar acceso", `Revocar el acceso a ${LABELS[share.resource_type] ?? share.resource_type}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Revocar", style: "destructive", onPress: () => deleteShare.mutate(share.id) },
    ]);
  }

  const ownedItems = owned.data?.items ?? [];
  const receivedItems = received.data?.items ?? [];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader title="Compartir" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Compartir un recurso</Text>
          <TextInput
            style={styles.input}
            placeholder="Email de la persona"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <View style={styles.chipRow}>
            {RESOURCES.map((r) => {
              const active = r.value === resource;
              return (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setResource(r.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Permiso de escritura</Text>
            <Switch
              value={canWrite}
              onValueChange={setCanWrite}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.background}
            />
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, createShare.isPending && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={createShare.isPending}
            activeOpacity={0.85}
          >
            <Text style={styles.saveText}>{createShare.isPending ? "Compartiendo..." : "Compartir"}</Text>
          </TouchableOpacity>
        </View>

        {/* Compartidos por mi */}
        <Text style={styles.sectionTitle}>Compartidos por mi</Text>
        {owned.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
        ) : ownedItems.length === 0 ? (
          <Text style={styles.empty}>No compartiste nada todavia.</Text>
        ) : (
          <View style={styles.list}>
            {ownedItems.map((s) => (
              <View key={s.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{LABELS[s.resource_type] ?? s.resource_type}</Text>
                  <Text style={styles.rowSub}>con {shortId(s.grantee_id)}</Text>
                </View>
                <View style={styles.rowRight}>
                  <View style={styles.writeToggle}>
                    <Text style={styles.writeLabel}>Escritura</Text>
                    <Switch
                      value={s.can_write}
                      onValueChange={(v) => handleToggleWrite(s, v)}
                      trackColor={{ true: colors.primary, false: colors.border }}
                      thumbColor={colors.background}
                    />
                  </View>
                  <TouchableOpacity onPress={() => handleRevoke(s)} hitSlop={6}>
                    <Text style={styles.revoke}>Revocar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Compartidos conmigo */}
        <Text style={styles.sectionTitle}>Compartidos conmigo</Text>
        {received.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
        ) : receivedItems.length === 0 ? (
          <Text style={styles.empty}>Nadie compartio nada con vos.</Text>
        ) : (
          <View style={styles.list}>
            {receivedItems.map((s) => (
              <View key={s.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{LABELS[s.resource_type] ?? s.resource_type}</Text>
                  <Text style={styles.rowSub}>de {shortId(s.owner_id)}</Text>
                </View>
                <View style={[styles.badge, s.can_write && styles.badgeWrite]}>
                  <Text style={[styles.badgeText, s.can_write && styles.badgeTextWrite]}>
                    {s.can_write ? "Escritura" : "Lectura"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, gap: 14, paddingBottom: 40 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    cardTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 15,
      color: colors.foreground,
    },
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
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    switchLabel: { fontSize: 14, color: colors.foreground },
    saveBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
    saveText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "600" },
    sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground, marginTop: 4 },
    empty: { fontSize: 14, color: colors.mutedForeground },
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
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
    rowSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, fontVariant: ["tabular-nums"] },
    rowRight: { alignItems: "flex-end", gap: 4 },
    writeToggle: { flexDirection: "row", alignItems: "center", gap: 6 },
    writeLabel: { fontSize: 12, color: colors.mutedForeground },
    revoke: { fontSize: 13, fontWeight: "600", color: colors.destructive },
    badge: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    badgeWrite: { backgroundColor: colors.primary, borderColor: colors.primary },
    badgeText: { fontSize: 12, color: colors.mutedForeground, fontWeight: "600" },
    badgeTextWrite: { color: colors.primaryForeground },
  });

import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createShare } from "@/lib/api/shares";
import { searchUsers } from "@/lib/api/users";
import { useShareablePermissions } from "@/lib/hooks/use-permissions";
import { useDeleteShare, useOwnedShares } from "@/lib/hooks/use-shares";
import { permissionLabel } from "@/lib/share-labels";
import { useColors, type Palette } from "@/lib/theme";
import { UserName } from "@/components/user-name";
import type { PermissionDefinition } from "@/lib/types/permission";
import type { PublicUser } from "@/lib/types/user";

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Compartir un solo elemento en vez de todo lo que abarcan los permisos. */
  item?: { id: string; name: string };
  /** Cuales de los permisos que el usuario puede compartir se ofrecen aca. */
  permissionFilter?: (permission: PermissionDefinition) => boolean;
}

export function ShareSheet({ visible, onClose, title, description, item, permissionFilter }: ShareSheetProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: permissionsData } = useShareablePermissions();
  const { data: sharesData } = useOwnedShares();
  const deleteShare = useDeleteShare();

  const [username, setUsername] = useState("");
  const [grantee, setGrantee] = useState<PublicUser | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const searchText = username.trim();
  const { data: found, isFetching: searching } = useQuery({
    queryKey: ["users", "search", searchText],
    queryFn: () => searchUsers(searchText),
    enabled: visible && searchText.length >= 2 && !grantee,
  });

  const offered = (permissionsData?.items ?? []).filter(
    (p) => (item ? p.item_shareable : true) && (permissionFilter ? permissionFilter(p) : true)
  );
  const offeredNames = new Set(offered.map((p) => p.permission));
  const existing = (sharesData?.items ?? []).filter(
    (s) =>
      s.audience === "user" &&
      offeredNames.has(s.permission) &&
      (item ? s.scope === "item" && s.resource_id === item.id : s.scope === "collection")
  );
  const sharesAWrite = offered.some((p) => !p.read_only && selected.has(p.permission));

  function toggle(permission: string) {
    const next = new Set(selected);
    if (next.has(permission)) next.delete(permission);
    else next.add(permission);
    setSelected(next);
  }

  function close() {
    setUsername("");
    setGrantee(null);
    setSelected(new Set());
    onClose();
  }

  async function handleShare() {
    if (!grantee || selected.size === 0) return;
    setSaving(true);
    const failures: string[] = [];
    let shared = 0;
    for (const permission of selected) {
      try {
        await createShare({
          permission,
          scope: item ? "item" : "collection",
          resource_id: item?.id,
          audience: "user",
          grantee_id: grantee.id,
        });
        shared++;
      } catch (err: any) {
        failures.push(`${permissionLabel(permission)}: ${err.message ?? "error"}`);
      }
    }
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ["shares"] });
    if (failures.length > 0) Alert.alert("No se pudo compartir todo", failures.join("\n"));
    if (shared > 0) {
      setSelected(new Set());
      setGrantee(null);
      setUsername("");
    }
  }

  function handleUnshare(id: string, permission: string) {
    Alert.alert("Dejar de compartir", `Se dejara de compartir "${permissionLabel(permission)}".`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Dejar de compartir",
        style: "destructive",
        onPress: () =>
          deleteShare.mutate(id, {
            onError: (err: any) => Alert.alert("Error", err.message ?? "No se pudo dejar de compartir"),
          }),
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <TouchableOpacity style={styles.backdropTap} activeOpacity={1} onPress={close} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <TouchableOpacity onPress={close} hitSlop={8}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          {description ? <Text style={styles.description}>{description}</Text> : null}

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text style={styles.label}>Usuario</Text>
            <TextInput
              style={styles.input}
              placeholder="buscar por nombre de usuario"
              placeholderTextColor={colors.mutedForeground}
              value={grantee ? `@${grantee.username ?? ""}` : username}
              onChangeText={(t) => {
                setUsername(t);
                setGrantee(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>Solo aparecen quienes activaron "Que me encuentren" en su perfil.</Text>
            {!grantee && searchText.length >= 2 && (
              <View style={styles.list}>
                {searching ? (
                  <ActivityIndicator color={colors.primary} style={{ padding: 10 }} />
                ) : (found?.items ?? []).length === 0 ? (
                  <Text style={styles.listEmpty}>Nadie con ese nombre.</Text>
                ) : (
                  found!.items.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.listRow}
                      onPress={() => setGrantee(user)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.listText}>@{user.username}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
            {grantee && <Text style={styles.chosen}>✓ Vas a compartir con @{grantee.username}</Text>}

            <Text style={styles.label}>Que puede hacer</Text>
            {offered.length === 0 ? (
              <Text style={styles.hint}>No hay nada que puedas compartir aca.</Text>
            ) : (
              <View style={styles.chipRow}>
                {offered.map((p) => {
                  const active = selected.has(p.permission);
                  return (
                    <TouchableOpacity
                      key={p.permission}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggle(p.permission)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {permissionLabel(p.permission)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {item && sharesAWrite && (
              <Text style={styles.hint}>
                Sus cambios se usan en las comidas que se carguen desde ahora; las ya registradas mantienen sus valores.
              </Text>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, (!grantee || selected.size === 0 || saving) && { opacity: 0.5 }]}
              onPress={handleShare}
              disabled={!grantee || selected.size === 0 || saving}
              activeOpacity={0.85}
            >
              <Text style={styles.saveText}>{saving ? "Compartiendo..." : "Compartir"}</Text>
            </TouchableOpacity>

            {existing.length > 0 && (
              <>
                <Text style={styles.label}>Ya compartido</Text>
                <View style={styles.list}>
                  {existing.map((s) => (
                    <View key={s.id} style={styles.existingRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listText}>{permissionLabel(s.permission)}</Text>
                        <Text style={styles.hint}>
                          con <UserName userId={s.grantee_id} style={styles.hint} />
                          {s.active ? "" : " · sin efecto"}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleUnshare(s.id, s.permission)} hitSlop={8}>
                        <Text style={styles.remove}>Quitar</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
    backdropTap: { flex: 1 },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 16,
      maxHeight: "88%",
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    title: { flex: 1, fontSize: 17, fontWeight: "700", color: colors.foreground },
    close: { fontSize: 18, color: colors.mutedForeground },
    description: { fontSize: 13, color: colors.mutedForeground, marginTop: 4 },
    content: { gap: 10, paddingTop: 14, paddingBottom: 8 },
    label: { fontSize: 13, fontWeight: "600", color: colors.foreground, marginTop: 4 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 15,
      color: colors.foreground,
    },
    hint: { fontSize: 12, color: colors.mutedForeground },
    chosen: { fontSize: 14, color: colors.primary, fontWeight: "600" },
    list: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: "hidden" },
    listRow: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
    listText: { fontSize: 14, color: colors.foreground },
    listEmpty: { fontSize: 14, color: colors.mutedForeground, padding: 12 },
    existingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    remove: { fontSize: 13, fontWeight: "600", color: colors.destructive },
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
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: "center",
      marginTop: 6,
    },
    saveText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "600" },
  });

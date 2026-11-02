import { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useOwnedShares, useReceivedShares, useDeleteShare } from "@/lib/hooks/use-shares";
import { permissionLabel } from "@/lib/share-labels";
import { useColors, type Palette } from "@/lib/theme";
import { ScreenHeader } from "@/components/screen-header";
import { ShareSheet } from "@/components/share-sheet";
import { UserName } from "@/components/user-name";
import type { Share } from "@/lib/types/share";

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export default function CompartirScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  const owned = useOwnedShares();
  const received = useReceivedShares();
  const deleteShare = useDeleteShare();
  const [sharing, setSharing] = useState(false);

  function handleDelete(share: Share) {
    Alert.alert("Dejar de compartir", `Se dejara de compartir "${permissionLabel(share.permission)}".`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Dejar de compartir",
        style: "destructive",
        onPress: () =>
          deleteShare.mutate(share.id, {
            onError: (err: any) => Alert.alert("Error", err.message ?? "No se pudo dejar de compartir"),
          }),
      },
    ]);
  }

  function ShareRow({ share, isReceived }: { share: Share; isReceived: boolean }) {
    // Un alimento compartido de a uno con permiso de edicion se edita en la ruta de su dueno.
    const editableFood =
      isReceived &&
      share.active &&
      share.scope === "item" &&
      !!share.resource_id &&
      share.permission === "foods:update";
    const browsable = isReceived && share.active && share.scope === "collection";
    return (
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{permissionLabel(share.permission)}</Text>
            </View>
            <View style={styles.badgeMuted}>
              <Text style={styles.badgeMutedText}>{share.scope === "item" ? "Un elemento" : "Todo"}</Text>
            </View>
            {!share.active && (
              <View style={styles.badgeInactive}>
                <Text style={styles.badgeInactiveText}>Sin efecto</Text>
              </View>
            )}
          </View>
          <Text style={styles.rowSub}>
            {isReceived ? (
              <>
                de <UserName userId={share.owner_id} style={styles.rowSub} />
              </>
            ) : share.audience === "public" ? (
              "con todos"
            ) : (
              <>
                con <UserName userId={share.grantee_id} style={styles.rowSub} />
              </>
            )}
            {" · "}
            {formatDate(share.created_at)}
          </Text>
        </View>
        {editableFood && (
          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: "/food-new", params: { id: share.resource_id!, ownerId: share.owner_id } })
            }
            hitSlop={6}
          >
            <Text style={styles.action}>Editar</Text>
          </TouchableOpacity>
        )}
        {browsable && (
          <TouchableOpacity onPress={() => router.push(`/compartido/${share.owner_id}`)} hitSlop={6}>
            <Text style={styles.action}>Ver</Text>
          </TouchableOpacity>
        )}
        {!isReceived && (
          <TouchableOpacity onPress={() => handleDelete(share)} hitSlop={6}>
            <Text style={styles.revoke}>Quitar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function ShareList({
    title,
    shares,
    loading,
    empty,
    isReceived,
  }: {
    title: string;
    shares: Share[];
    loading: boolean;
    empty: string;
    isReceived: boolean;
  }) {
    return (
      <>
        <Text style={styles.sectionTitle}>
          {title} ({shares.length})
        </Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
        ) : shares.length === 0 ? (
          <Text style={styles.empty}>{empty}</Text>
        ) : (
          <View style={styles.list}>
            {shares.map((s) => (
              <ShareRow key={s.id} share={s} isReceived={isReceived} />
            ))}
          </View>
        )}
      </>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Compartir" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Compartir con un usuario</Text>
          <Text style={styles.cardSub}>
            Elegi que va a poder hacer con tus datos. Para hacer publico un alimento, usa el globo en tu lista de
            alimentos.
          </Text>
          <TouchableOpacity style={styles.saveBtn} onPress={() => setSharing(true)} activeOpacity={0.85}>
            <Text style={styles.saveText}>Compartir</Text>
          </TouchableOpacity>
        </View>

        <ShareList
          title="Compartidos por mi"
          shares={owned.data?.items ?? []}
          loading={owned.isLoading}
          empty="No compartiste nada todavia."
          isReceived={false}
        />
        <ShareList
          title="Compartidos conmigo"
          shares={received.data?.items ?? []}
          loading={received.isLoading}
          empty="Nadie te compartio nada todavia."
          isReceived
        />
      </ScrollView>
      <ShareSheet
        visible={sharing}
        onClose={() => setSharing(false)}
        title="Compartir con un usuario"
        description="Elegi que va a poder hacer con tus datos."
      />
    </View>
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
      gap: 10,
    },
    cardTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground },
    cardSub: { fontSize: 13, color: colors.mutedForeground },
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
    badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    badge: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    badgeText: { fontSize: 12, color: colors.foreground, fontWeight: "600" },
    badgeMuted: { backgroundColor: colors.muted, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    badgeMutedText: { fontSize: 12, color: colors.mutedForeground },
    badgeInactive: { backgroundColor: colors.destructive, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    badgeInactiveText: { fontSize: 12, color: "#fff", fontWeight: "600" },
    rowSub: { fontSize: 12, color: colors.mutedForeground },
    action: { fontSize: 13, fontWeight: "600", color: colors.primary },
    revoke: { fontSize: 13, fontWeight: "600", color: colors.destructive },
  });

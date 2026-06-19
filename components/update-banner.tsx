import { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppUpdate } from "@/lib/hooks/use-app-update";
import { useColors, type Palette } from "@/lib/theme";

/**
 * Banner inferior que aparece cuando hay un APK mas nuevo publicado.
 * Se monta siempre (en el layout raiz) pero solo se muestra si hay update.
 */
export function UpdateBanner() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { updateAvailable, latest, status, progress, install, dismiss } =
    useAppUpdate();

  if (!updateAvailable) return null;

  const downloading = status === "downloading";

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.card}>
        <View style={styles.textCol}>
          <Text style={styles.title}>Nueva versión disponible</Text>
          <Text style={styles.sub} numberOfLines={2}>
            {downloading
              ? `Descargando… ${Math.round(progress * 100)}%`
              : status === "error"
                ? "No se pudo descargar. Tocá Actualizar para reintentar."
                : `Versión ${latest?.version}${latest?.notes ? ` — ${latest.notes}` : ""}`}
          </Text>
        </View>

        {downloading ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <View style={styles.actions}>
            {!latest?.mandatory && (
              <TouchableOpacity onPress={dismiss} hitSlop={8}>
                <Text style={styles.later}>Después</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.btn} onPress={install} activeOpacity={0.8}>
              <Text style={styles.btnText}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 12,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    textCol: { flex: 1 },
    title: { fontSize: 15, fontWeight: "700", color: colors.primaryForeground },
    sub: { fontSize: 12, color: colors.primaryForeground, opacity: 0.8, marginTop: 2 },
    actions: { flexDirection: "row", alignItems: "center", gap: 14 },
    later: { fontSize: 14, color: colors.primaryForeground, opacity: 0.7 },
    btn: {
      backgroundColor: colors.background,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    btnText: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  });

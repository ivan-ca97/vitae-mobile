import { useMemo } from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, type Palette } from "@/lib/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const ITEMS: { label: string; route: string; icon: IoniconName }[] = [
  { label: "Peso", route: "/peso", icon: "fitness-outline" },
  { label: "Medidas", route: "/medidas", icon: "body-outline" },
  { label: "Metas", route: "/metas", icon: "trophy-outline" },
  { label: "Estadísticas", route: "/estadisticas", icon: "stats-chart-outline" },
  { label: "Calendario", route: "/calendario", icon: "calendar-outline" },
  { label: "Alimentos", route: "/alimentos", icon: "nutrition-outline" },
  { label: "Compartir", route: "/compartir", icon: "share-social-outline" },
  { label: "Perfil", route: "/perfil", icon: "person-outline" },
];

export default function MenuScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.grid}>
        {ITEMS.map((it) => (
          <TouchableOpacity
            key={it.route}
            style={styles.card}
            onPress={() => router.push(it.route as never)}
            activeOpacity={0.7}
          >
            <Ionicons name={it.icon} size={28} color={colors.primary} />
            <Text style={styles.label}>{it.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    card: {
      width: "47%",
      aspectRatio: 1.5,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    label: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  });

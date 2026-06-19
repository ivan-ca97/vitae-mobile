import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors, type Palette } from "@/lib/theme";

interface SummaryCardProps {
  label: string;
  value: string;
  unit?: string;
  subtitle?: string | null;
  color?: string;
}

export function SummaryCard({ label, value, unit, subtitle, color }: SummaryCardProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, color ? { color } : undefined]}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexGrow: 1,
    minWidth: 100,
  },
  label: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.foreground,
    fontVariant: ["tabular-nums"],
  },
  unit: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  subtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
});

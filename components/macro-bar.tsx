import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors, type Palette } from "@/lib/theme";

interface MacroBarProps {
  protein: number;
  carbs: number;
  fat: number;
}

export function MacroBar({ protein, carbs, fat }: MacroBarProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const protCal = protein * 4;
  const carbCal = carbs * 4;
  const fatCal = fat * 9;
  const total = protCal + carbCal + fatCal;
  if (total === 0) return null;

  const pPct = (protCal / total) * 100;
  const cPct = (carbCal / total) * 100;
  const fPct = (fatCal / total) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <View style={[styles.segment, { flex: pPct, backgroundColor: colors.protein, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }]} />
        <View style={[styles.segment, { flex: cPct, backgroundColor: colors.carbs }]} />
        <View style={[styles.segment, { flex: fPct, backgroundColor: colors.fat, borderTopRightRadius: 4, borderBottomRightRadius: 4 }]} />
      </View>
      <View style={styles.legend}>
        <LegendItem color={colors.protein} label="Prot" pct={pPct} />
        <LegendItem color={colors.carbs} label="Carbs" pct={cPct} />
        <LegendItem color={colors.fat} label="Grasa" pct={fPct} />
      </View>
    </View>
  );
}

function LegendItem({ color, label, pct }: { color: string; label: string; pct: number }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>
        {label} {pct.toFixed(0)}%
      </Text>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  container: {
    gap: 6,
  },
  bar: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  segment: {
    height: "100%",
  },
  legend: {
    flexDirection: "row",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
});

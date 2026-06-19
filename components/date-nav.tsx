import { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useDate } from "@/lib/date-context";
import { fmtDate } from "@/lib/format";
import { useColors, type Palette } from "@/lib/theme";

export function DateNav() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { date, isToday, goPrev, goNext, goToToday } = useDate();

  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={goPrev} style={styles.arrow}>
        <Text style={styles.arrowText}>{"‹"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={goToToday} style={styles.center} disabled={isToday}>
        <Text style={[styles.dateText, isToday && styles.dateToday]}>
          {isToday ? "Hoy" : fmtDate(date)}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={goNext} style={styles.arrow}>
        <Text style={styles.arrowText}>{"›"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 16,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.foreground,
    marginTop: -2,
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.foreground,
    textTransform: "capitalize",
  },
  dateToday: {
    color: colors.primary,
    fontWeight: "700",
  },
});

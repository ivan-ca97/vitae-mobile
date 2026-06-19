import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  getDay,
  isAfter,
  isSameDay,
  parse,
} from "date-fns";
import { es } from "date-fns/locale";
import { useDate } from "@/lib/date-context";
import { useDailySummaryRange, useCloseDay, useOpenDay } from "@/lib/hooks/use-daily-summary";
import { useColors, type Palette } from "@/lib/theme";
import { ScreenHeader } from "@/components/screen-header";
import type { DailySummary } from "@/lib/types/daily";

type DayStatus = "closed" | "incomplete" | "ok" | "future" | "no_tracking";

const WEEKDAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

function hasDayData(day: DailySummary): boolean {
  return day.closed || day.meals.count > 0 || day.exercise.count > 0 || day.weight?.weight_kg != null;
}

function getDayStatus(
  day: DailySummary | undefined,
  dateStr: string,
  today: Date,
  firstDataDate: string | null
): DayStatus {
  const date = parse(dateStr, "yyyy-MM-dd", new Date());
  const isToday = isSameDay(date, today);
  if (isAfter(date, today) && !isToday) return "future";
  if (!firstDataDate || dateStr < firstDataDate) return "no_tracking";
  if (!day) return "incomplete";
  if (day.closed) return "closed";
  if (!isToday) return "incomplete";
  return "ok";
}

export default function CalendarioScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { date: selectedDate, setDate } = useDate();
  const closeDay = useCloseDay();
  const openDay = useOpenDay();

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [openDateStr, setOpenDateStr] = useState<string | null>(null);

  const from = format(startOfMonth(viewMonth), "yyyy-MM-dd");
  const to = format(endOfMonth(viewMonth), "yyyy-MM-dd");
  const { data, isLoading } = useDailySummaryRange(from, to);

  const today = useMemo(() => new Date(), []);
  const todayStr = format(today, "yyyy-MM-dd");

  const { summaryMap, firstDataDate } = useMemo(() => {
    const map = new Map<string, DailySummary>();
    let first: string | null = null;
    for (const d of data?.data ?? []) {
      map.set(d.date, d);
      if (hasDayData(d) && (first === null || d.date < first)) first = d.date;
    }
    return { summaryMap: map, firstDataDate: first };
  }, [data]);

  const { allDays, leadingBlanks } = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    return {
      allDays: eachDayOfInterval({ start: monthStart, end: monthEnd }),
      leadingBlanks: (getDay(monthStart) + 6) % 7,
    };
  }, [viewMonth]);

  const stats = useMemo(() => {
    let closed = 0,
      incomplete = 0,
      ok = 0;
    for (const day of allDays) {
      const ds = format(day, "yyyy-MM-dd");
      const s = getDayStatus(summaryMap.get(ds), ds, today, firstDataDate);
      if (s === "closed") closed++;
      else if (s === "incomplete") incomplete++;
      else if (s === "ok") ok++;
    }
    return { closed, incomplete, ok };
  }, [allDays, summaryMap, today, firstDataDate]);

  const openDayData = openDateStr ? summaryMap.get(openDateStr) : undefined;
  const openStatus = openDateStr
    ? getDayStatus(openDayData, openDateStr, today, firstDataDate)
    : null;

  function handleToggleClosure() {
    if (!openDateStr) return;
    const opts = {
      onError: (err: any) => Alert.alert("Error", err.message ?? "No se pudo actualizar"),
    };
    if (openDayData?.closed) openDay.mutate(openDateStr, opts);
    else closeDay.mutate(openDateStr, opts);
  }

  function handleGoToSummary() {
    if (!openDateStr) return;
    setDate(openDateStr);
    setOpenDateStr(null);
    router.push("/");
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Calendario" />
      <View style={styles.content}>
        {/* Nav mes */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setViewMonth(subMonths(viewMonth, 1))} hitSlop={10}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {format(viewMonth, "MMMM yyyy", { locale: es })}
          </Text>
          <TouchableOpacity onPress={() => setViewMonth(addMonths(viewMonth, 1))} hitSlop={10}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Encabezados de dia */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((d) => (
            <Text key={d} style={styles.weekday}>
              {d}
            </Text>
          ))}
        </View>

        {isLoading && !data ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grid}>
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <View key={`b${i}`} style={styles.cell} />
            ))}
            {allDays.map((day) => {
              const ds = format(day, "yyyy-MM-dd");
              const status = getDayStatus(summaryMap.get(ds), ds, today, firstDataDate);
              const isToday = ds === todayStr;
              const isSelected = ds === selectedDate;
              const tint =
                status === "closed"
                  ? "rgba(34,197,94,0.15)"
                  : status === "incomplete"
                  ? "rgba(245,158,11,0.15)"
                  : "transparent";
              const dim = status === "future" || status === "no_tracking";
              return (
                <View key={ds} style={styles.cell}>
                  <TouchableOpacity
                    style={[
                      styles.dayBtn,
                      { backgroundColor: tint },
                      isSelected && styles.daySelected,
                      isToday && styles.dayToday,
                    ]}
                    onPress={() => setOpenDateStr(ds)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayNum,
                        dim && { color: colors.mutedForeground },
                        isToday && { fontWeight: "800" },
                      ]}
                    >
                      {format(day, "d")}
                    </Text>
                    {status === "closed" && <View style={[styles.dot, { backgroundColor: colors.fiber }]} />}
                    {status === "incomplete" && <View style={[styles.dot, { backgroundColor: colors.carbs }]} />}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Leyenda */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.fiber }]} />
            <Text style={styles.legendText}>Cerrado ({stats.closed})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.carbs }]} />
            <Text style={styles.legendText}>Incompleto ({stats.incomplete})</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendText}>Con datos ({stats.ok})</Text>
          </View>
        </View>
      </View>

      {/* Modal de dia */}
      <Modal
        visible={openDateStr != null}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenDateStr(null)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setOpenDateStr(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            {openDateStr && (
              <>
                <Text style={styles.sheetTitle}>
                  {format(parse(openDateStr, "yyyy-MM-dd", new Date()), "EEEE d 'de' MMMM", {
                    locale: es,
                  })}
                </Text>
                {openDayData ? (
                  <View style={styles.sheetStats}>
                    <Row label="Peso" value={openDayData.weight?.weight_kg != null ? `${openDayData.weight.weight_kg.toFixed(1)} kg` : "—"} colors={colors} />
                    <Row label={`${openDayData.meals.count} comida${openDayData.meals.count !== 1 ? "s" : ""}`} value={`${openDayData.meals.total_calories.toFixed(0)} kcal`} colors={colors} />
                    <Row label="Ejercicio" value={`${openDayData.exercise.total_calories_burned.toFixed(0)} kcal`} colors={colors} />
                    <Row label="Pasos" value={openDayData.exercise.total_steps.toLocaleString()} colors={colors} />
                    {openDayData.caloric_balance != null && (
                      <Row
                        label="Balance"
                        value={`${openDayData.caloric_balance >= 0 ? "+" : ""}${openDayData.caloric_balance.toFixed(0)} kcal`}
                        colors={colors}
                        valueColor={openDayData.caloric_balance >= 0 ? colors.surplus : colors.deficit}
                      />
                    )}
                  </View>
                ) : (
                  <Text style={styles.sheetEmpty}>Sin datos registrados.</Text>
                )}

                <View style={styles.sheetButtons}>
                  {openStatus !== "future" && openStatus !== "no_tracking" && (
                    <TouchableOpacity
                      style={styles.sheetBtn}
                      onPress={handleToggleClosure}
                      disabled={closeDay.isPending || openDay.isPending}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.sheetBtnText}>
                        {openDayData?.closed ? "Reabrir dia" : "Cerrar dia"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.sheetBtn, styles.sheetBtnPrimary]}
                    onPress={handleGoToSummary}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sheetBtnText, styles.sheetBtnTextPrimary]}>Ver resumen</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function Row({
  label,
  value,
  colors,
  valueColor,
}: {
  label: string;
  value: string;
  colors: Palette;
  valueColor?: string;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: 14, color: colors.mutedForeground }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: "600", color: valueColor ?? colors.foreground }}>
        {value}
      </Text>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, gap: 12 },
    monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    navArrow: { fontSize: 30, color: colors.foreground, lineHeight: 34, paddingHorizontal: 12 },
    monthLabel: { fontSize: 17, fontWeight: "700", color: colors.foreground, textTransform: "capitalize" },
    weekRow: { flexDirection: "row" },
    weekday: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600", color: colors.mutedForeground },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
    dayBtn: {
      flex: 1,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    daySelected: { backgroundColor: colors.muted },
    dayToday: { borderWidth: 2, borderColor: colors.primary },
    dayNum: { fontSize: 15, color: colors.foreground },
    dot: { width: 6, height: 6, borderRadius: 3, marginTop: 3 },
    legend: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendText: { fontSize: 13, color: colors.mutedForeground },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    sheet: {
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 20,
      gap: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sheetTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground, textTransform: "capitalize" },
    sheetStats: { gap: 8 },
    sheetEmpty: { fontSize: 14, color: colors.mutedForeground },
    sheetButtons: { flexDirection: "row", gap: 10, marginTop: 4 },
    sheetBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    sheetBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
    sheetBtnText: { fontSize: 14, fontWeight: "600", color: colors.foreground },
    sheetBtnTextPrimary: { color: colors.primaryForeground },
  });

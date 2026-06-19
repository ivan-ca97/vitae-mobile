import { useState, useMemo } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import Svg, { Polyline, Line, Circle, Text as SvgText } from "react-native-svg";
import { useColors, type Palette } from "@/lib/theme";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

export interface ChartPoint {
  label: string;
  values: Record<string, number | null>;
}

interface LineChartProps {
  data: ChartPoint[];
  series: ChartSeries[];
  height?: number;
  goal?: { value: number; color?: string; label?: string };
  /** Formatea los valores del eje Y. */
  formatY?: (n: number) => string;
}

const PAD_L = 38;
const PAD_R = 10;
const PAD_T = 12;
const PAD_B = 22;

function niceNum(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(0);
}

export function LineChart({ data, series, height = 200, goal, formatY }: LineChartProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [width, setWidth] = useState(0);
  const fmt = formatY ?? niceNum;

  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  // Rango Y sobre todas las series (y la meta si existe).
  const all: number[] = [];
  for (const p of data) {
    for (const s of series) {
      const v = p.values[s.key];
      if (v != null && !isNaN(v)) all.push(v);
    }
  }
  if (goal) all.push(goal.value);

  const hasData = all.length > 0 && width > 0;

  let min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) {
    min = min - 1;
    max = max + 1;
  }
  // Margen del 8% arriba/abajo.
  const span = max - min;
  min -= span * 0.08;
  max += span * 0.08;

  const plotW = width - PAD_L - PAD_R;
  const plotH = height - PAD_T - PAD_B;
  const n = data.length;

  function xFor(i: number): number {
    if (n <= 1) return PAD_L + plotW / 2;
    return PAD_L + (i / (n - 1)) * plotW;
  }
  function yFor(v: number): number {
    return PAD_T + (1 - (v - min) / (max - min)) * plotH;
  }

  // Divide cada serie en segmentos continuos (para tolerar nulls).
  function segmentsFor(s: ChartSeries): string[] {
    const segs: string[] = [];
    let cur: string[] = [];
    data.forEach((p, i) => {
      const v = p.values[s.key];
      if (v == null || isNaN(v)) {
        if (cur.length) segs.push(cur.join(" "));
        cur = [];
      } else {
        cur.push(`${xFor(i)},${yFor(v)}`);
      }
    });
    if (cur.length) segs.push(cur.join(" "));
    return segs;
  }

  // Puntos individuales (utiles cuando un segmento tiene 1 solo dato).
  function dotsFor(s: ChartSeries): { x: number; y: number }[] {
    const dots: { x: number; y: number }[] = [];
    data.forEach((p, i) => {
      const v = p.values[s.key];
      if (v != null && !isNaN(v)) dots.push({ x: xFor(i), y: yFor(v) });
    });
    return dots;
  }

  const gridVals = [max, (max + min) / 2, min];
  const xTickIdx = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <View>
      <View style={{ height }} onLayout={onLayout}>
        {hasData && (
          <Svg width={width} height={height}>
            {/* Gridlines + labels Y */}
            {gridVals.map((gv, i) => {
              const y = yFor(gv);
              return (
                <Line
                  key={`g${i}`}
                  x1={PAD_L}
                  y1={y}
                  x2={width - PAD_R}
                  y2={y}
                  stroke={colors.border}
                  strokeWidth={1}
                />
              );
            })}
            {gridVals.map((gv, i) => (
              <SvgText
                key={`gl${i}`}
                x={PAD_L - 6}
                y={yFor(gv) + 3}
                fontSize={9}
                fill={colors.mutedForeground}
                textAnchor="end"
              >
                {fmt(gv)}
              </SvgText>
            ))}

            {/* Meta */}
            {goal && (
              <Line
                x1={PAD_L}
                y1={yFor(goal.value)}
                x2={width - PAD_R}
                y2={yFor(goal.value)}
                stroke={goal.color ?? colors.mutedForeground}
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
            )}

            {/* Series */}
            {series.flatMap((s) =>
              segmentsFor(s).map((pts, si) => (
                <Polyline
                  key={`${s.key}-${si}`}
                  points={pts}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))
            )}
            {/* Puntos cuando hay un solo dato en la serie */}
            {series.flatMap((s) => {
              const dots = dotsFor(s);
              if (dots.length !== 1) return [];
              return dots.map((d, di) => (
                <Circle key={`${s.key}-dot${di}`} cx={d.x} cy={d.y} r={3} fill={s.color} />
              ));
            })}

            {/* Labels X */}
            {xTickIdx.map((i) => (
              <SvgText
                key={`x${i}`}
                x={xFor(i)}
                y={height - 6}
                fontSize={9}
                fill={colors.mutedForeground}
                textAnchor="middle"
              >
                {data[i]?.label ?? ""}
              </SvgText>
            ))}
          </Svg>
        )}
        {!hasData && width > 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Sin datos</Text>
          </View>
        )}
      </View>

      {/* Leyenda */}
      {series.length > 1 && (
        <View style={styles.legend}>
          {series.map((s) => (
            <View key={s.key} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={styles.legendText}>{s.label}</Text>
            </View>
          ))}
          {goal?.label && (
            <View style={styles.legendItem}>
              <View style={[styles.dashDot, { borderColor: goal.color ?? colors.mutedForeground }]} />
              <Text style={styles.legendText}>{goal.label}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.mutedForeground, fontSize: 13 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 8, paddingLeft: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dashDot: { width: 12, height: 0, borderTopWidth: 2, borderStyle: "dashed" },
  legendText: { fontSize: 12, color: colors.mutedForeground },
});

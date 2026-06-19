import { useState, useMemo } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import Svg, { Rect, Line, Text as SvgText } from "react-native-svg";
import { useColors, type Palette } from "@/lib/theme";

interface BarChartProps {
  data: { label: string; value: number | null }[];
  height?: number;
  /** Color para valores positivos / negativos. */
  positiveColor?: string;
  negativeColor?: string;
  formatY?: (n: number) => string;
}

const PAD_L = 38;
const PAD_R = 10;
const PAD_T = 12;
const PAD_B = 22;

function niceNum(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(0);
}

export function BarChart({
  data,
  height = 200,
  positiveColor,
  negativeColor,
  formatY,
}: BarChartProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const posColor = positiveColor ?? colors.fat;
  const negColor = negativeColor ?? colors.fiber;
  const [width, setWidth] = useState(0);
  const fmt = formatY ?? niceNum;

  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  const vals = data.map((d) => d.value).filter((v): v is number => v != null && !isNaN(v));
  const hasData = vals.length > 0 && width > 0;

  let max = Math.max(0, ...vals);
  let min = Math.min(0, ...vals);
  if (max === min) {
    max = 1;
    min = -1;
  }
  const span = max - min;
  max += span * 0.08;
  min -= span * 0.08;

  const plotW = width - PAD_L - PAD_R;
  const plotH = height - PAD_T - PAD_B;
  const n = data.length;
  const slot = n > 0 ? plotW / n : plotW;
  const barW = Math.max(2, slot * 0.6);

  function yFor(v: number): number {
    return PAD_T + (1 - (v - min) / (max - min)) * plotH;
  }
  const zeroY = yFor(0);

  const gridVals = [max, 0, min];
  const xTickIdx = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <View style={{ height }} onLayout={onLayout}>
      {hasData && (
        <Svg width={width} height={height}>
          {gridVals.map((gv, i) => (
            <Line
              key={`g${i}`}
              x1={PAD_L}
              y1={yFor(gv)}
              x2={width - PAD_R}
              y2={yFor(gv)}
              stroke={gv === 0 ? colors.mutedForeground : colors.border}
              strokeWidth={1}
            />
          ))}
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

          {data.map((d, i) => {
            if (d.value == null || isNaN(d.value)) return null;
            const cx = PAD_L + slot * i + slot / 2;
            const y = yFor(d.value);
            const top = Math.min(y, zeroY);
            const h = Math.abs(y - zeroY);
            return (
              <Rect
                key={i}
                x={cx - barW / 2}
                y={top}
                width={barW}
                height={Math.max(1, h)}
                fill={d.value >= 0 ? posColor : negColor}
                rx={2}
              />
            );
          })}

          {xTickIdx.map((i) => (
            <SvgText
              key={`x${i}`}
              x={PAD_L + slot * i + slot / 2}
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
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.mutedForeground, fontSize: 13 },
});

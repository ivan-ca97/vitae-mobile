import { useColorScheme } from "react-native";

// Paleta alineada con la web (shadcn "neutral"): primary casi negro,
// acentos de color solo en macros/balance. Ver src/app/globals.css.
export const colors = {
  primary: "#171717", // oklch(0.205 0 0) — neutral-900
  primaryForeground: "#fafafa", // oklch(0.985 0 0)
  background: "#ffffff",
  foreground: "#0a0a0a",
  card: "#ffffff",
  cardForeground: "#0a0a0a",
  muted: "#f5f5f5",
  mutedForeground: "#737373",
  border: "#e5e5e5",
  destructive: "#ef4444",
  success: "#22c55e",
  warning: "#f59e0b",
  protein: "#3b82f6", // blue-500
  carbs: "#f59e0b", // amber-500
  fat: "#f43f5e", // rose-500 (la web usa rose, no red)
  fiber: "#22c55e",
  surplus: "#f59e0b",
  deficit: "#0ea5e9",
};

export const darkColors: typeof colors = {
  primary: "#ededed", // oklch(0.922 0 0) — casi blanco (invertido, como la web en dark)
  primaryForeground: "#171717", // oklch(0.205 0 0)
  background: "#0a0a0a",
  foreground: "#fafafa",
  card: "#171717",
  cardForeground: "#fafafa",
  muted: "#262626",
  mutedForeground: "#a3a3a3",
  border: "#262626",
  destructive: "#ef4444",
  success: "#22c55e",
  warning: "#f59e0b",
  protein: "#60a5fa",
  carbs: "#fbbf24",
  fat: "#fb7185", // rose-400
  fiber: "#4ade80",
  surplus: "#fbbf24",
  deficit: "#38bdf8",
};

export type Palette = typeof colors;

/**
 * Devuelve la paleta segun el esquema del sistema (claro/oscuro).
 * Reacciona automaticamente a los cambios de tema del SO.
 * Convencion: nombrar la variable local `colors` para que los usos en JSX
 * (`colors.primary`, etc.) y `makeStyles(colors)` no requieran renombrado.
 */
export function useColors(): Palette {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkColors : colors;
}

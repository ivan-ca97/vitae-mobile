import type { Food } from "@/lib/types/food";

const METRIC_UNITS: Record<string, string[]> = {
  mass: ["mg", "g", "kg"],
  volume: ["ml", "cl", "dl", "l"],
};

const ALL_METRIC = new Set([...METRIC_UNITS.mass, ...METRIC_UNITS.volume]);

/** Unidades seleccionables para un alimento: las metricas de su tipo (y del otro si tiene densidad) y sus porciones. */
export function getAvailableUnits(food: Food): string[] {
  const units: string[] = [];

  const metric = METRIC_UNITS[food.measurement_type] ?? [];
  for (const u of metric) {
    if (!units.includes(u)) units.push(u);
  }

  if (food.volume_conversion && food.measurement_type === "mass") {
    for (const u of METRIC_UNITS.volume) {
      if (!units.includes(u)) units.push(u);
    }
  }
  if (food.volume_conversion && food.measurement_type === "volume") {
    for (const u of METRIC_UNITS.mass) {
      if (!units.includes(u)) units.push(u);
    }
  }

  for (const p of food.portions ?? []) {
    if (!units.includes(p.name)) units.push(p.name);
  }

  return units;
}

export function isMetricUnit(unit: string): boolean {
  return ALL_METRIC.has(unit);
}

/** Una porcion va a la API por su id; una unidad metrica, por su nombre. */
export function unitFields(food: Food, unit: string): { unit: string } | { portion_id: string } {
  const portion = (food.portions ?? []).find((p) => p.name === unit);
  return portion ? { portion_id: portion.id } : { unit };
}

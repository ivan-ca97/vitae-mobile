import type { Share } from "@/lib/types/share";

const PERMISSION_LABELS: Record<string, string> = {
  "meals:read": "Ver comidas",
  "meals:create": "Registrar comidas",
  "meals:update": "Editar comidas",
  "meals:delete": "Borrar comidas",
  "foods:read": "Ver alimentos",
  "foods:create": "Crear alimentos",
  "foods:update": "Editar alimentos",
  "foods:delete": "Borrar alimentos",
  "exercises:read": "Ver ejercicios",
  "exercises:create": "Registrar ejercicios",
  "exercises:update": "Editar ejercicios",
  "exercises:delete": "Borrar ejercicios",
  "weight:read": "Ver peso",
  "weight:create": "Registrar peso",
  "weight:update": "Editar peso",
  "weight:delete": "Borrar peso",
  "goals:read": "Ver metas",
  "goals:update": "Editar metas",
  "daily:read": "Ver resumen diario",
  "daily:update": "Editar resumen diario",
};

export function permissionLabel(permission: string): string {
  return PERMISSION_LABELS[permission] ?? permission;
}

/** The public share of one food, if the user made that food visible to everyone. */
export function publicFoodShare(shares: Share[], foodId: string): Share | undefined {
  return shares.find(
    (s) =>
      s.permission === "foods:read" &&
      s.scope === "item" &&
      s.resource_id === foodId &&
      s.audience === "public",
  );
}

import { useEffect, useRef } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Application from "expo-application";
import {
  initialize,
  getGrantedPermissions,
  readWindow,
} from "@/lib/health/health-connect";
import { importHealthConnect } from "@/lib/api/health-sync";
import { getUserId } from "@/lib/api/client";

const LAST_SYNC_KEY = "hc_last_auto_sync";
const THROTTLE_MS = 2 * 60 * 60 * 1000; // máx 1 sync cada 2 h
const WINDOW_DAYS = 7;

/**
 * Sincroniza Health Connect con el backend de forma automática y silenciosa, al abrir
 * la app y al volver de segundo plano (throttle de 2 h). Es foreground-only a propósito:
 * en Samsung las tareas en background se matan, así que esto es lo confiable.
 *
 * No hace nada si: no es Android, no hay sesión, HC no está disponible, o no hay permisos
 * otorgados. Errores silenciados (no molesta al usuario).
 */
export function useHealthAutoSync() {
  const running = useRef(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    async function maybeSync() {
      if (running.current) return;
      running.current = true;
      try {
        const userId = await getUserId();
        if (!userId) return; // sin sesión

        const last = Number((await SecureStore.getItemAsync(LAST_SYNC_KEY)) || 0);
        if (Date.now() - last < THROTTLE_MS) return; // throttle

        const ready = await initialize();
        if (!ready) return; // HC no disponible

        const granted = await getGrantedPermissions();
        if (!granted || granted.length === 0) return; // sin permisos → no molestamos

        const end = new Date();
        const start = new Date(end.getTime() - WINDOW_DAYS * 86400000);
        const { payload } = await readWindow(
          start.toISOString(),
          end.toISOString(),
          Application.nativeApplicationVersion ?? "0.0.0"
        );
        await importHealthConnect(payload);
        await SecureStore.setItemAsync(LAST_SYNC_KEY, String(Date.now()));
      } catch {
        // silencioso: sin red / sin permisos / HC caído → se reintenta al volver a primer plano
      } finally {
        running.current = false;
      }
    }

    maybeSync();
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        maybeSync();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);
}

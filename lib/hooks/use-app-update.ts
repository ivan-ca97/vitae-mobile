import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";
import * as Application from "expo-application";
import * as Updates from "expo-updates";
import * as IntentLauncher from "expo-intent-launcher";
import * as FileSystem from "expo-file-system/legacy";
import {
  fetchLatestRelease,
  isNewerVersion,
  type LatestRelease,
} from "@/lib/api/app-update";

export type UpdateStatus = "idle" | "downloading" | "error";

/**
 * Maneja dos tipos de actualizacion:
 *  1. OTA (JS/assets) via expo-updates: se descarga en silencio y se aplica en
 *     el proximo arranque. No interrumpe al usuario.
 *  2. Nativa (APK): consulta al backend la ultima version, y si hay una mas
 *     nueva expone `latest` para que la UI ofrezca el boton "Actualizar".
 *     `install()` descarga el APK y lanza el instalador de Android.
 *
 * En desarrollo / Expo Go nada de esto corre: `Updates.isEnabled` es false y el
 * chequeo de APK solo aplica en Android (los builds reales).
 */
export function useAppUpdate() {
  const [latest, setLatest] = useState<LatestRelease | null>(null);
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [progress, setProgress] = useState(0);
  const appState = useRef(AppState.currentState);

  const currentVersion = Application.nativeApplicationVersion ?? "0.0.0";

  const check = useCallback(async () => {
    // 1) OTA en silencio: si hay update de JS, lo deja listo para el proximo inicio.
    if (Updates.isEnabled) {
      Updates.checkForUpdateAsync()
        .then((r) => (r.isAvailable ? Updates.fetchUpdateAsync() : null))
        .catch(() => {});
    }

    // 2) APK nativo: solo Android.
    if (Platform.OS !== "android") return;
    try {
      const rel = await fetchLatestRelease();
      setLatest(rel && isNewerVersion(rel.version, currentVersion) ? rel : null);
    } catch {
      // sin red / backend caido: no molestamos, se reintenta al volver a primer plano.
    }
  }, [currentVersion]);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        check();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [check]);

  const install = useCallback(async () => {
    if (!latest) return;
    try {
      setStatus("downloading");
      setProgress(0);
      const dest = `${FileSystem.cacheDirectory}vitae-${latest.version}.apk`;
      const download = FileSystem.createDownloadResumable(
        latest.apk_url,
        dest,
        {},
        (p) => {
          if (p.totalBytesExpectedToWrite > 0) {
            setProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
          }
        }
      );
      const res = await download.downloadAsync();
      if (!res?.uri) throw new Error("download failed");

      // FileProvider de Expo -> content:// URI legible por el instalador.
      const contentUri = await FileSystem.getContentUriAsync(res.uri);
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        type: "application/vnd.android.package-archive",
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      });
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [latest]);

  return {
    updateAvailable: !!latest,
    latest,
    status,
    progress,
    install,
    dismiss: useCallback(() => setLatest(null), []),
  };
}

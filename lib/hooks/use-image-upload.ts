import { useState, useCallback } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadImageAsync } from "@/lib/api/media";
import { usePhotoSource } from "@/lib/photo-source";

interface PickOptions {
  allowsEditing?: boolean;
}

/**
 * Selecciona una imagen de la galeria y la sube a R2.
 * Devuelve la URL publica, o null si el usuario cancela / falla.
 */
export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const askSource = usePhotoSource();

  const uploadAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset): Promise<string | null> => {
      setUploading(true);
      try {
        return await uploadImageAsync(asset.uri, asset.mimeType, asset.fileName);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "No se pudo subir la imagen");
        return null;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const pickAndUpload = useCallback(
    async (opts?: PickOptions): Promise<string | null> => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permiso requerido", "Necesitamos acceso a tus fotos para subir imagenes.");
        return null;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: opts?.allowsEditing ?? false,
      });
      if (result.canceled || !result.assets?.length) return null;
      return uploadAsset(result.assets[0]);
    },
    [uploadAsset]
  );

  // Abre la camara, toma una foto y la sube. Devuelve la URL publica o null.
  const takeAndUpload = useCallback(
    async (opts?: PickOptions): Promise<string | null> => {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permiso requerido", "Necesitamos acceso a la camara para tomar fotos.");
        return null;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: opts?.allowsEditing ?? false,
      });
      if (result.canceled || !result.assets?.length) return null;
      return uploadAsset(result.assets[0]);
    },
    [uploadAsset]
  );

  // Pregunta camara vs galeria (bottom-sheet propio) y sube. Para cualquier boton de "agregar foto".
  const chooseAndUpload = useCallback(
    async (opts?: PickOptions): Promise<string | null> => {
      const source = await askSource();
      if (source === "camera") return takeAndUpload(opts);
      if (source === "gallery") return pickAndUpload(opts);
      return null;
    },
    [askSource, takeAndUpload, pickAndUpload]
  );

  return { pickAndUpload, takeAndUpload, chooseAndUpload, uploading };
}

import { useState, useCallback } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadImageAsync } from "@/lib/api/media";
import { usePhotoSource, type PhotoSource } from "@/lib/photo-source";

interface PickOptions {
  allowsEditing?: boolean;
}

/**
 * Selecciona imagenes (camara/galeria) y las sube a R2.
 *
 * Flujos de una sola foto (avatar, foto del dia, etc.): usar `chooseAndUpload`
 * / `takeAndUpload` (bloquean via el flag `uploading`).
 *
 * Subidas concurrentes (varias fotos): usar `pickAsset` para obtener el asset
 * al instante (muestra preview) y `uploadAsset` para subirlo en segundo plano,
 * llevando el estado de cada foto en el componente.
 */
export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const askSource = usePhotoSource();

  // Sube un asset a R2. Devuelve la URL o null. El flag `uploading` es para
  // flujos de una sola foto; en subidas concurrentes el consumidor lleva su estado.
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

  // Lanza camara o galeria (pidiendo permiso) y devuelve el asset SIN subirlo.
  const pickFromSource = useCallback(
    async (
      source: PhotoSource,
      opts?: PickOptions
    ): Promise<ImagePicker.ImagePickerAsset | null> => {
      if (source === "camera") {
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
        return result.assets[0];
      }
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
      return result.assets[0];
    },
    []
  );

  // Abre la camara y devuelve el asset SIN subirlo (carga rapida concurrente).
  const takePhoto = useCallback(
    (opts?: PickOptions): Promise<ImagePicker.ImagePickerAsset | null> =>
      pickFromSource("camera", opts),
    [pickFromSource]
  );

  // Abre el sheet (camara/galeria) y devuelve el asset elegido SIN subirlo.
  const pickAsset = useCallback(
    async (opts?: PickOptions): Promise<ImagePicker.ImagePickerAsset | null> => {
      const source = await askSource();
      if (!source) return null;
      return pickFromSource(source, opts);
    },
    [askSource, pickFromSource]
  );

  // Como pickAsset pero permite elegir VARIAS fotos de la galeria de una (la
  // camara sigue devolviendo una sola). Devuelve los assets SIN subirlos.
  const pickAssets = useCallback(
    async (opts?: PickOptions): Promise<ImagePicker.ImagePickerAsset[]> => {
      const source = await askSource();
      if (!source) return [];
      if (source === "camera") {
        const asset = await pickFromSource("camera", opts);
        return asset ? [asset] : [];
      }
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permiso requerido", "Necesitamos acceso a tus fotos para subir imagenes.");
        return [];
      }
      // allowsMultipleSelection es incompatible con allowsEditing, asi que en
      // seleccion multiple no recortamos.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsMultipleSelection: true,
      });
      if (result.canceled || !result.assets?.length) return [];
      return result.assets;
    },
    [askSource, pickFromSource]
  );

  // Abre la camara, toma una foto y la sube. Devuelve la URL publica o null.
  const takeAndUpload = useCallback(
    async (opts?: PickOptions): Promise<string | null> => {
      const asset = await pickFromSource("camera", opts);
      return asset ? uploadAsset(asset) : null;
    },
    [pickFromSource, uploadAsset]
  );

  const pickAndUpload = useCallback(
    async (opts?: PickOptions): Promise<string | null> => {
      const asset = await pickFromSource("gallery", opts);
      return asset ? uploadAsset(asset) : null;
    },
    [pickFromSource, uploadAsset]
  );

  // Pregunta camara vs galeria (bottom-sheet propio) y sube. Flujo de una sola foto.
  const chooseAndUpload = useCallback(
    async (opts?: PickOptions): Promise<string | null> => {
      const asset = await pickAsset(opts);
      return asset ? uploadAsset(asset) : null;
    },
    [pickAsset, uploadAsset]
  );

  return { pickAsset, pickAssets, takePhoto, uploadAsset, pickAndUpload, takeAndUpload, chooseAndUpload, uploading };
}

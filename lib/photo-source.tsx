import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, type Palette } from "@/lib/theme";

export type PhotoSource = "camera" | "gallery";

type Resolver = (v: PhotoSource | null) => void;

const Ctx = createContext<(() => Promise<PhotoSource | null>) | null>(null);

/** Devuelve una funcion que abre el bottom-sheet y resuelve la opcion elegida. */
export function usePhotoSource() {
  const ask = useContext(Ctx);
  if (!ask) throw new Error("usePhotoSource debe usarse dentro de <PhotoSourceProvider>");
  return ask;
}

/**
 * Provee un bottom-sheet propio (con el tema de la app) para elegir entre camara
 * y galeria, reemplazando el Alert nativo. Montar una vez en el layout raiz.
 */
export function PhotoSourceProvider({ children }: { children: ReactNode }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const resolverRef = useRef<Resolver | null>(null);

  const ask = useCallback(
    () =>
      new Promise<PhotoSource | null>((resolve) => {
        resolverRef.current = resolve;
        setVisible(true);
      }),
    []
  );

  const finish = useCallback((v: PhotoSource | null) => {
    setVisible(false);
    resolverRef.current?.(v);
    resolverRef.current = null;
  }, []);

  return (
    <Ctx.Provider value={ask}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => finish(null)}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => finish(null)}>
          {/* onPress vacio: evita que tocar el sheet lo cierre */}
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.title}>Agregar foto</Text>

            <TouchableOpacity style={styles.option} onPress={() => finish("camera")} activeOpacity={0.7}>
              <Text style={styles.optionText}>Tomar foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={() => finish("gallery")} activeOpacity={0.7}>
              <Text style={styles.optionText}>Elegir de galería</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancel} onPress={() => finish(null)} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </Ctx.Provider>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 8,
      paddingHorizontal: 12,
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 8,
    },
    title: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.mutedForeground,
      textAlign: "center",
      paddingVertical: 8,
    },
    option: {
      paddingVertical: 16,
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    optionText: { fontSize: 16, fontWeight: "600", color: colors.foreground },
    cancel: {
      marginTop: 8,
      paddingVertical: 16,
      alignItems: "center",
      borderRadius: 12,
      backgroundColor: colors.muted,
    },
    cancelText: { fontSize: 16, fontWeight: "600", color: colors.mutedForeground },
  });

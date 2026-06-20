import { useState, useEffect, useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as Application from "expo-application";
import { useAuth } from "@/lib/auth/context";
import { useProfile, useUpdateProfile } from "@/lib/hooks/use-user";
import { useImageUpload } from "@/lib/hooks/use-image-upload";
import { useCreateProfilePhoto } from "@/lib/hooks/use-profile-photos";
import { useColors, type Palette } from "@/lib/theme";
import type { UpdateUserRequest } from "@/lib/types/user";

const SEX_OPTIONS = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
];

export default function PerfilScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { logout } = useAuth();
  const { data: user, isLoading } = useProfile();
  const updateMutation = useUpdateProfile();
  const { chooseAndUpload, uploading } = useImageUpload();
  const createPhoto = useCreateProfilePhoto();
  const photoBusy = uploading || createPhoto.isPending;

  async function changePhoto() {
    const url = await chooseAndUpload({ allowsEditing: true });
    if (!url) return;
    createPhoto.mutate(url, {
      onError: (err: any) => Alert.alert("Error", err.message ?? "No se pudo actualizar la foto"),
    });
  }

  const [username, setUsername] = useState("");
  const [height, setHeight] = useState("");
  const [sex, setSex] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!user) return;
    setUsername(user.username ?? "");
    setHeight(user.height_cm != null ? String(user.height_cm) : "");
    setSex(user.sex ?? "");
    setBirthDate(user.birth_date ? user.birth_date.slice(0, 10) : "");
  }, [user]);

  function handleSave() {
    const req: UpdateUserRequest = {};
    req.username = username.trim() || undefined;
    const h = parseFloat(height);
    if (!isNaN(h) && h > 0) req.height_cm = h;
    if (sex) req.sex = sex;
    if (birthDate.trim()) req.birth_date = birthDate.trim();
    if (password.trim()) req.password = password.trim();

    updateMutation.mutate(req, {
      onSuccess: () => {
        setPassword("");
        Alert.alert("Listo", "Perfil actualizado");
      },
      onError: (err: any) => Alert.alert("Error", err.message ?? "No se pudo guardar"),
    });
  }

  function handleLogout() {
    Alert.alert("Cerrar sesion", "Quieres cerrar sesion?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesion", style: "destructive", onPress: () => logout() },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isLoading && !user ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <Text style={styles.cardTitle}>Informacion personal</Text>
          <View style={styles.card}>
            <View style={styles.avatarRow}>
              <TouchableOpacity onPress={changePhoto} disabled={photoBusy} activeOpacity={0.8}>
                <View style={styles.avatar}>
                  {user?.photo_url ? (
                    <Image source={{ uri: user.photo_url }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarLetter}>
                      {(user?.email?.[0] ?? "?").toUpperCase()}
                    </Text>
                  )}
                  {photoBusy && (
                    <View style={styles.avatarOverlay}>
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.email}>{user?.email}</Text>
                {user?.username ? <Text style={styles.sub}>@{user.username}</Text> : null}
                <TouchableOpacity onPress={changePhoto} disabled={photoBusy} hitSlop={6}>
                  <Text style={styles.changePhoto}>
                    {photoBusy ? "Subiendo..." : "Cambiar foto"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Nombre de usuario</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="usuario"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Altura (cm)</Text>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                keyboardType="decimal-pad"
                placeholder="170"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Sexo</Text>
              <View style={styles.chipRow}>
                {SEX_OPTIONS.map((opt) => {
                  const active = opt.value === sex;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setSex(opt.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Fecha de nacimiento (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={birthDate}
                onChangeText={setBirthDate}
                placeholder="1990-01-31"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
              />
            </View>
          </View>

          <Text style={styles.cardTitle}>Cambiar contrasena</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Nueva contrasena</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Dejar vacio para no cambiar"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, updateMutation.isPending && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={updateMutation.isPending}
            activeOpacity={0.85}
          >
            <Text style={styles.saveText}>
              {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push("/calendario")}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>Calendario</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push("/metas")}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>Metas</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push("/peso")}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>Historial de peso</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push("/medidas")}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>Medidas corporales</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push("/estadisticas")}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>Estadisticas</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push("/compartir")}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>Compartir</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutText}>Cerrar sesion</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Versión {Application.nativeApplicationVersion ?? "—"}</Text>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 8, paddingBottom: 40 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground, marginTop: 8 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 64, height: 64, borderRadius: 32 },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 26, fontWeight: "700", color: colors.mutedForeground },
  changePhoto: { fontSize: 13, fontWeight: "600", color: colors.primary, marginTop: 4 },
  email: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  sub: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  field: { gap: 6 },
  label: { fontSize: 13, color: colors.mutedForeground },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.foreground,
  },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.foreground },
  chipTextActive: { color: colors.primaryForeground, fontWeight: "600" },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  saveText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "600" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  linkText: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  chevron: { fontSize: 22, color: colors.mutedForeground },
  logoutBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.destructive,
    marginTop: 8,
  },
  logoutText: { color: colors.destructive, fontSize: 16, fontWeight: "600" },
  version: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: 16,
  },
});

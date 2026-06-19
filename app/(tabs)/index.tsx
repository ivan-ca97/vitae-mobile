import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useState, useCallback, useMemo } from "react";
import { useDate } from "@/lib/date-context";
import { useDailySummary } from "@/lib/hooks/use-daily-summary";
import { useCreateWeight } from "@/lib/hooks/use-weight";
import { useDailyPhotos, useCreateDailyPhoto, useDeleteDailyPhoto } from "@/lib/hooks/use-daily-photos";
import { useImageUpload } from "@/lib/hooks/use-image-upload";
import { fmtDuration, fmtNumber } from "@/lib/format";
import { useColors, type Palette } from "@/lib/theme";
import { DateNav } from "@/components/date-nav";
import { SummaryCard } from "@/components/summary-card";
import { MacroBar } from "@/components/macro-bar";
import { SectionCard } from "@/components/section-card";

export default function ResumenScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { date } = useDate();
  const { data, isLoading, refetch } = useDailySummary(date);
  const createWeight = useCreateWeight();
  const { data: dailyPhotos } = useDailyPhotos(date);
  const createDailyPhoto = useCreateDailyPhoto();
  const deleteDailyPhoto = useDeleteDailyPhoto();
  const { chooseAndUpload, uploading } = useImageUpload();
  const [refreshing, setRefreshing] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [fatInput, setFatInput] = useState("");

  async function handleAddDailyPhoto() {
    const url = await chooseAndUpload();
    if (!url) return;
    createDailyPhoto.mutate(
      { url, date },
      { onError: (err: any) => Alert.alert("Error", err.message ?? "No se pudo guardar la foto") }
    );
  }

  function handleDeleteDailyPhoto(id: string) {
    Alert.alert("Eliminar foto", "Se eliminara esta foto del dia.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteDailyPhoto.mutate(id) },
    ]);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  function goalPct(current: number, goal: number | undefined): string | null {
    if (goal == null || goal === 0) return null;
    return `${Math.round((current / goal) * 100)}% del objetivo`;
  }

  function handleAddWeight() {
    const kg = parseFloat(weightInput);
    if (isNaN(kg) || kg <= 0) {
      Alert.alert("Peso invalido", "Ingresa un peso valido en kg.");
      return;
    }
    const fatPct = fatInput.trim() ? parseFloat(fatInput) : undefined;
    createWeight.mutate(
      { date, weight_kg: kg, body_fat_percentage: fatPct },
      {
        onSuccess: () => {
          setWeightInput("");
          setFatInput("");
        },
        onError: (err: any) => Alert.alert("Error", err.message ?? "No se pudo guardar"),
      }
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <DateNav />

      {isLoading && !data ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : data ? (
        <>
          {/* Weight */}
          <SectionCard title="Peso">
            {data.weight?.weight_kg != null ? (
              <View style={styles.grid2}>
                <SummaryCard
                  label="Peso matutino"
                  value={data.weight.weight_kg.toFixed(1)}
                  unit="kg"
                />
                {data.weight.body_fat_percentage != null && (
                  <SummaryCard
                    label="Grasa corporal"
                    value={data.weight.body_fat_percentage.toFixed(1)}
                    unit="%"
                  />
                )}
              </View>
            ) : (
              <View style={styles.weightForm}>
                <Text style={styles.emptyText}>Sin registro de peso para este dia.</Text>
                <View style={styles.weightRow}>
                  <TextInput
                    style={[styles.weightInput, { flex: 1 }]}
                    placeholder="Peso (kg)"
                    placeholderTextColor={colors.mutedForeground}
                    value={weightInput}
                    onChangeText={setWeightInput}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[styles.weightInput, { flex: 1 }]}
                    placeholder="Grasa % (opc.)"
                    placeholderTextColor={colors.mutedForeground}
                    value={fatInput}
                    onChangeText={setFatInput}
                    keyboardType="decimal-pad"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.weightBtn, createWeight.isPending && { opacity: 0.6 }]}
                  onPress={handleAddWeight}
                  disabled={createWeight.isPending}
                  activeOpacity={0.85}
                >
                  <Text style={styles.weightBtnText}>
                    {createWeight.isPending ? "Guardando..." : "Registrar peso"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </SectionCard>

          {/* Daily photos */}
          <SectionCard title="Fotos del dia">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoRow}
            >
              {(dailyPhotos?.items ?? []).map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.photoThumb}
                  onLongPress={() => handleDeleteDailyPhoto(p.id)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: p.url }} style={styles.photoImg} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.photoAdd}
                onPress={handleAddDailyPhoto}
                disabled={uploading || createDailyPhoto.isPending}
                activeOpacity={0.7}
              >
                {uploading || createDailyPhoto.isPending ? (
                  <ActivityIndicator size="small" color={colors.mutedForeground} />
                ) : (
                  <Text style={styles.photoAddText}>+</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
            {(dailyPhotos?.items ?? []).length === 0 && (
              <Text style={styles.emptyText}>Agrega una foto de tu dia.</Text>
            )}
          </SectionCard>

          {/* Meals */}
          <SectionCard title={`Alimentacion (${data.meals.count} comidas)`}>
            <View style={styles.grid2}>
              <SummaryCard
                label="Calorias"
                value={fmtNumber(data.meals.total_calories)}
                unit="kcal"
                subtitle={goalPct(data.meals.total_calories, data.goals?.daily_calories)}
              />
              <SummaryCard
                label="Proteinas"
                value={fmtNumber(data.meals.total_protein_grams)}
                unit="g"
                subtitle={goalPct(data.meals.total_protein_grams, data.goals?.daily_protein_grams)}
                color={colors.protein}
              />
              <SummaryCard
                label="Carbohidratos"
                value={fmtNumber(data.meals.total_carbs_grams)}
                unit="g"
                subtitle={goalPct(data.meals.total_carbs_grams, data.goals?.daily_carbs_grams)}
                color={colors.carbs}
              />
              <SummaryCard
                label="Grasas"
                value={fmtNumber(data.meals.total_fat_grams)}
                unit="g"
                subtitle={goalPct(data.meals.total_fat_grams, data.goals?.daily_fat_grams)}
                color={colors.fat}
              />
              <SummaryCard
                label="Fibra"
                value={fmtNumber(data.meals.total_fiber_grams)}
                unit="g"
                subtitle={goalPct(data.meals.total_fiber_grams, data.goals?.daily_fiber_grams)}
                color={colors.fiber}
              />
            </View>
            {data.meals.count > 0 && (
              <MacroBar
                protein={data.meals.total_protein_grams}
                carbs={data.meals.total_carbs_grams}
                fat={data.meals.total_fat_grams}
              />
            )}
          </SectionCard>

          {/* Exercise */}
          <SectionCard title={`Ejercicio (${data.exercise.count} actividades)`}>
            <View style={styles.grid2}>
              <SummaryCard
                label="Calorias quemadas"
                value={fmtNumber(data.exercise.total_calories_burned)}
                unit="kcal"
              />
              <SummaryCard
                label="Pasos"
                value={fmtNumber(data.exercise.total_steps)}
                subtitle={goalPct(data.exercise.total_steps, data.goals?.daily_steps)}
              />
              <SummaryCard
                label="Duracion"
                value={fmtDuration(data.exercise.total_duration_seconds)}
              />
              <SummaryCard
                label="Distancia"
                value={(data.exercise.total_distance_meters / 1000).toFixed(1)}
                unit="km"
              />
            </View>
          </SectionCard>

          {/* Metabolism */}
          {(data.estimated_bmr != null || data.caloric_balance != null) && (
            <SectionCard title="Metabolismo y balance">
              <View style={styles.grid2}>
                {data.estimated_bmr != null && (
                  <SummaryCard
                    label="Metabolismo basal"
                    value={fmtNumber(data.estimated_bmr)}
                    unit="kcal"
                  />
                )}
                {data.caloric_balance != null && (
                  <SummaryCard
                    label="Balance calorico"
                    value={fmtNumber(Math.abs(data.caloric_balance))}
                    unit="kcal"
                    subtitle={data.caloric_balance >= 0 ? "Superavit" : "Deficit"}
                    color={data.caloric_balance >= 0 ? colors.surplus : colors.deficit}
                  />
                )}
                {data.estimated_bmr != null && (
                  <SummaryCard
                    label="Gasto total"
                    value={fmtNumber(data.estimated_bmr + data.exercise.total_calories_burned)}
                    unit="kcal"
                  />
                )}
              </View>
              {data.caloric_balance != null && data.estimated_bmr != null && (
                <Text style={styles.balanceNote}>
                  Balance = consumidas ({fmtNumber(data.meals.total_calories)}) - BMR (
                  {fmtNumber(data.estimated_bmr)}) - ejercicio (
                  {fmtNumber(data.exercise.total_calories_burned)})
                </Text>
              )}
            </SectionCard>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingTop: 0,
    gap: 16,
    paddingBottom: 32,
  },
  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  photoRow: { gap: 10, paddingVertical: 4, alignItems: "center" },
  photoThumb: {},
  photoImg: { width: 80, height: 80, borderRadius: 12, backgroundColor: colors.muted },
  photoAdd: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  photoAddText: { fontSize: 30, fontWeight: "300", color: colors.mutedForeground, lineHeight: 34 },
  weightForm: { gap: 10 },
  weightRow: { flexDirection: "row", gap: 10 },
  weightInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.foreground,
  },
  weightBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  weightBtnText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "600" },
  balanceNote: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
});

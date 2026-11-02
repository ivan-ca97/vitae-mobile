import { useMemo, type ReactNode } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useReceivedShares } from "@/lib/hooks/use-shares";
import { getOwnerExercises, getOwnerFoods, getOwnerGoals, getOwnerMeals, getOwnerWeight } from "@/lib/api/shared";
import { daysAgoStr, fmtDuration, fmtNumber, todayStr } from "@/lib/format";
import { useColors, type Palette } from "@/lib/theme";
import { ScreenHeader } from "@/components/screen-header";
import { UserName } from "@/components/user-name";

function shortDate(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
}

export default function SharedDataScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { ownerId } = useLocalSearchParams<{ ownerId: string }>();
  const { data: receivedData, isLoading } = useReceivedShares();

  // Lo que este dueno me compartio sobre todos sus datos, y que sigue concediendo.
  const fromOwner = (receivedData?.items ?? []).filter(
    (s) => s.owner_id === ownerId && s.active && s.scope === "collection"
  );
  const granted = new Set(fromOwner.map((s) => s.permission));
  const today = todayStr();

  const meals = useQuery({
    queryKey: ["shared", ownerId, "meals"],
    queryFn: () => getOwnerMeals(ownerId, daysAgoStr(30), today),
    enabled: granted.has("meals:read"),
  });
  const weight = useQuery({
    queryKey: ["shared", ownerId, "weight"],
    queryFn: () => getOwnerWeight(ownerId, daysAgoStr(90), today),
    enabled: granted.has("weight:read"),
  });
  const exercises = useQuery({
    queryKey: ["shared", ownerId, "exercises"],
    queryFn: () => getOwnerExercises(ownerId),
    enabled: granted.has("exercises:read"),
  });
  const foods = useQuery({
    queryKey: ["shared", ownerId, "foods"],
    queryFn: () => getOwnerFoods(ownerId),
    enabled: granted.has("foods:read"),
  });
  const goals = useQuery({
    queryKey: ["shared", ownerId, "goals"],
    queryFn: () => getOwnerGoals(ownerId),
    enabled: granted.has("goals:read"),
  });

  function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        {children}
      </View>
    );
  }

  function Empty({ loading }: { loading: boolean }) {
    return loading ? (
      <ActivityIndicator color={colors.primary} />
    ) : (
      <Text style={styles.empty}>Nada para mostrar.</Text>
    );
  }

  function Row({ left, right }: { left: ReactNode; right?: ReactNode }) {
    return (
      <View style={styles.row}>
        <Text style={styles.rowLeft} numberOfLines={1}>
          {left}
        </Text>
        {right != null && <Text style={styles.rowRight}>{right}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Datos compartidos" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          Datos de <UserName userId={ownerId} style={styles.title} />
        </Text>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : granted.size === 0 ? (
          <Text style={styles.empty}>
            Este usuario no te comparte datos completos, o lo que te compartio ya no tiene efecto.
          </Text>
        ) : null}

        {granted.has("meals:read") && (
          <Section title="Comidas de los ultimos 30 dias">
            {meals.data && meals.data.items.length > 0 ? (
              meals.data.items.map((meal) => (
                <Row
                  key={meal.id}
                  left={`${shortDate(meal.date)}  ${meal.name || meal.type}`}
                  right={meal.calories != null ? `${fmtNumber(meal.calories)} kcal` : undefined}
                />
              ))
            ) : (
              <Empty loading={meals.isLoading} />
            )}
          </Section>
        )}

        {granted.has("weight:read") && (
          <Section title="Peso de los ultimos 90 dias">
            {weight.data && weight.data.items.length > 0 ? (
              weight.data.items.map((entry) => (
                <Row key={entry.id} left={shortDate(entry.date)} right={`${entry.weight_kg} kg`} />
              ))
            ) : (
              <Empty loading={weight.isLoading} />
            )}
          </Section>
        )}

        {granted.has("exercises:read") && (
          <Section title="Ultimos ejercicios">
            {exercises.data && exercises.data.items.length > 0 ? (
              exercises.data.items.map((exercise) => (
                <Row
                  key={exercise.id}
                  left={`${shortDate(exercise.date)}  ${exercise.name}`}
                  right={exercise.duration_seconds != null ? fmtDuration(exercise.duration_seconds) : undefined}
                />
              ))
            ) : (
              <Empty loading={exercises.isLoading} />
            )}
          </Section>
        )}

        {granted.has("foods:read") && (
          <Section title="Alimentos">
            {foods.data && foods.data.items.length > 0 ? (
              foods.data.items.map((food) => (
                <Row
                  key={food.id}
                  left={food.name}
                  right={
                    food.default_calories != null
                      ? `${fmtNumber(food.default_calories)} kcal / ${food.base_quantity}${food.base_unit}`
                      : undefined
                  }
                />
              ))
            ) : (
              <Empty loading={foods.isLoading} />
            )}
          </Section>
        )}

        {granted.has("goals:read") && (
          <Section title="Metas">
            {goals.data ? (
              <>
                {goals.data.daily_calories != null && (
                  <Row left="Calorias diarias" right={`${fmtNumber(goals.data.daily_calories)} kcal`} />
                )}
                {goals.data.daily_protein_grams != null && (
                  <Row left="Proteina diaria" right={`${fmtNumber(goals.data.daily_protein_grams)} g`} />
                )}
                {goals.data.target_weight_kg != null && (
                  <Row left="Peso objetivo" right={`${goals.data.target_weight_kg} kg`} />
                )}
              </>
            ) : (
              <Empty loading={goals.isLoading} />
            )}
          </Section>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, gap: 14, paddingBottom: 40 },
    title: { fontSize: 20, fontWeight: "700", color: colors.foreground },
    empty: { fontSize: 14, color: colors.mutedForeground },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    cardTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground, marginBottom: 2 },
    row: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 4 },
    rowLeft: { flex: 1, fontSize: 14, color: colors.foreground },
    rowRight: { fontSize: 14, color: colors.mutedForeground },
  });

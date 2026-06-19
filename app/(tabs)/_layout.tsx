import { Tabs } from "expo-router";
import { Platform, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/lib/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function icon(active: IoniconName, inactive: IoniconName) {
  return ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size ?? 24} color={color} />
  );
}

export default function TabsLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.background,
          // En Android sumamos el inset inferior (barra de gestos o de 3 botones)
          // para que la tab bar no quede tapada por la navegacion del sistema.
          ...(Platform.OS === "android"
            ? {
                height: 60 + insets.bottom,
                paddingBottom: 8 + insets.bottom,
                paddingTop: 6,
              }
            : {}),
        },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Resumen", tabBarIcon: icon("home", "home-outline") }}
      />
      <Tabs.Screen
        name="comidas"
        options={{ title: "Comidas", tabBarIcon: icon("restaurant", "restaurant-outline") }}
      />
      <Tabs.Screen
        name="ejercicios"
        options={{ title: "Ejercicios", tabBarIcon: icon("barbell", "barbell-outline") }}
      />
      <Tabs.Screen
        name="alimentos"
        options={{ title: "Alimentos", tabBarIcon: icon("nutrition", "nutrition-outline") }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: "Perfil", tabBarIcon: icon("person", "person-outline") }}
      />
    </Tabs>
  );
}

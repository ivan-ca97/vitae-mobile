import { Text, type TextStyle, type StyleProp } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getUserProfile } from "@/lib/api/users";

/** El username de un usuario que el actual puede ver, o un texto neutro si no. Sin id, "todos". */
export function UserName({ userId, style }: { userId?: string; style?: StyleProp<TextStyle> }) {
  const { data } = useQuery({
    queryKey: ["users", userId, "profile"],
    queryFn: () => getUserProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  if (!userId) return <Text style={style}>todos</Text>;
  return <Text style={style}>{data?.username ? `@${data.username}` : "un usuario sin nombre"}</Text>;
}

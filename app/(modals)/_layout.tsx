import { Stack } from "expo-router";

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "modal",
        animation: "slide_from_bottom",
      }}
    >
      <Stack.Screen name="(brewSessions)" />
      <Stack.Screen name="(recipes)" />
      <Stack.Screen name="(settings)" />
    </Stack>
  );
}

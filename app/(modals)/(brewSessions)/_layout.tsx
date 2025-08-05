import { Stack } from "expo-router";

export default function BrewSessionsModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "modal",
      }}
    >
      <Stack.Screen name="viewBrewSession" />
    </Stack>
  );
}

import { Stack } from "expo-router";

export default function SettingsModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "modal",
      }}
    >
      <Stack.Screen name="settings" />
    </Stack>
  );
}

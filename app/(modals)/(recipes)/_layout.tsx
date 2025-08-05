import { Stack } from "expo-router";

export default function RecipesModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "modal",
      }}
    >
      <Stack.Screen name="viewRecipe" />
    </Stack>
  );
}

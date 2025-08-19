import React from "react";
import { Stack } from "expo-router";

/**
 * Defines a modal stack navigator layout for recipe-related screens.
 *
 * Registers the "viewRecipe", "createRecipe", and "ingredientPicker" screens, all presented modally without headers.
 *
 * @returns The configured stack navigator component for recipe modals.
 */
export default function RecipesModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "modal",
      }}
    >
      <Stack.Screen name="viewRecipe" />
      <Stack.Screen name="createRecipe" />
      <Stack.Screen name="editRecipe" />
      <Stack.Screen name="ingredientPicker" />
    </Stack>
  );
}

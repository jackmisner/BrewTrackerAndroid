import React from "react";
import { Stack } from "expo-router";

/**
 * Defines a modal stack navigator layout for calculator screens.
 *
 * Registers calculator screens presented modally without headers.
 * Individual screens implement custom headers with close/back functionality.
 */
export default function CalculatorsModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "modal",
      }}
    >
      <Stack.Screen name="unitConverter" />
      <Stack.Screen name="abv" />
      <Stack.Screen name="strikeWater" />
      <Stack.Screen name="hydrometerCorrection" />
      <Stack.Screen name="dilution" />
      <Stack.Screen name="primingSugar" />
      <Stack.Screen name="yeastPitchRate" />
      <Stack.Screen name="efficiency" />
      <Stack.Screen name="boilTimer" />
    </Stack>
  );
}

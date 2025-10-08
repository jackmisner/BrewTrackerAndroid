/**
 * Profile Modal Group Layout
 *
 * Defines the layout and navigation structure for profile-related modals
 * including About and Help & Support screens. Uses stack navigation with
 * custom headers disabled to allow individual screens to control their
 * own header styling.
 *
 * Routes:
 * - about: About screen with developer info and GPL v3 license
 * - helpAndSupport: Help and support screen with FAQ and GitHub integration
 */

import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="about" />
      <Stack.Screen name="helpAndSupport" />
    </Stack>
  );
}

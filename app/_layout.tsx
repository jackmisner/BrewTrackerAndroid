/**
 * @fileoverview Root layout component for the BrewTracker Android application
 *
 * @description
 * This is the root layout component that wraps the entire React Native application with
 * necessary providers and navigation structure. It establishes the core application
 * architecture and provides global state management, theming, and routing capabilities.
 *
 * @key_features
 * - React Query integration for server state management and caching
 * - Authentication context for JWT-based user sessions (using SecureStore)
 * - Theme context for light/dark mode with adaptive StatusBar
 * - Unit conversion context for brewing measurements
 * - File-based routing with nested navigation structure
 *
 * @navigation_patterns
 * - Stack navigation with modal presentation for overlays
 * - Nested routing: (auth), (tabs), (modals) route groups
 * - Authentication-aware routing handled by AuthProvider
 * - Automatic navigation based on auth state and email verification
 *
 * @security_considerations
 * - JWT tokens stored securely in SecureStore (not localStorage)
 * - Authentication state managed centrally via AuthContext
 * - Protected routes handled by individual screen components
 * - Theme-aware StatusBar prevents content overlap
 *
 * @data_handling
 * - React Query client configured for API caching and background updates
 * - All API calls go through centralized ApiService
 * - Network requests use the configured API base URL (see ApiService/environment config)
 * - Automatic retry and stale-time configuration for optimal UX
 */
import React from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@contexts/AuthContext";
import { ThemeProvider, useTheme } from "@contexts/ThemeContext";
import { UnitProvider } from "@contexts/UnitContext";
import { queryClient } from "@services/api/queryClient";

// Component to handle StatusBar with theme
const ThemedStatusBar = () => {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemedStatusBar />
        <UnitProvider>
          <AuthProvider>
            <Stack
              screenOptions={{
                headerStyle: {
                  backgroundColor: "#f4511e",
                },
                headerTintColor: "#fff",
                headerTitleStyle: {
                  fontWeight: "bold",
                },
              }}
            >
              <Stack.Screen
                name="index"
                options={{
                  title: "BrewTracker",
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="(auth)"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="(tabs)"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="(modals)"
                options={{
                  headerShown: false,
                  presentation: "modal",
                }}
              />
            </Stack>
          </AuthProvider>
        </UnitProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

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
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { AuthProvider, useAuth } from "@contexts/AuthContext";
import { ThemeProvider, useTheme } from "@contexts/ThemeContext";
import { UnitProvider } from "@contexts/UnitContext";
import { ScreenDimensionsProvider } from "@contexts/ScreenDimensionsContext";
import { CalculatorsProvider } from "@contexts/CalculatorsContext";
import { NetworkProvider } from "@contexts/NetworkContext";
import { DeveloperProvider } from "@contexts/DeveloperContext";
import {
  queryClient,
  createUserScopedPersister,
} from "@services/api/queryClient";
import { useStartupHydration } from "@src/hooks/offlineV2";
import Constants from "expo-constants";
import { UnifiedLogger } from "@services/logger/UnifiedLogger"; // Import synchronously to ensure early initialization

// Test dev logging on app startup
if (__DEV__) {
  void import("@services/debug/DebugHelpers"); // Load debug helpers for development
  UnifiedLogger.info("App.Layout", "BrewTracker Android app started", {
    buildVersion: Constants.nativeBuildVersion,
    expoVersion: Constants.expoConfig?.version,
    timestamp: new Date().toISOString(),
  });

  // Also import DevLogger to test endpoint configuration
  import("@services/logger/DevLogger").then(({ DevLogger }) => {
    const endpointInfo = DevLogger.getEndpointInfo();
    console.log("🔧 DevLogger Endpoint Configuration:", endpointInfo);

    // Test a dev log immediately
    DevLogger.info("App.Layout", "Testing DevLogger endpoint", endpointInfo);
  });
}

// Component to handle StatusBar with theme
const ThemedStatusBar = () => {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
};

// Component to trigger startup hydration
const StartupHydration = () => {
  useStartupHydration();
  return null;
};

// Component to handle dynamic persister based on auth state
const DynamicPersistQueryClientProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  const [persister, setPersister] = React.useState(() =>
    createUserScopedPersister(user?.id ? String(user.id) : undefined)
  );

  // Track previous user ID to detect changes
  const prevUserIdRef = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    const userId = user?.id ? String(user.id) : undefined;
    const prevUserId = prevUserIdRef.current;
    // Clear cache whenever identity changes (including anonymous ↔ user)
    const prevKey = prevUserId ?? "anonymous";
    const nextKey = userId ?? "anonymous";
    if (prevKey !== nextKey) {
      queryClient.clear();
    }
    // Update previous user ID and create new persister
    prevUserIdRef.current = userId;
    setPersister(createUserScopedPersister(userId));
  }, [user?.id]);

  return (
    <PersistQueryClientProvider
      key={user?.id || "anonymous"} // Force re-creation when user changes
      client={queryClient}
      persistOptions={{
        persister,
        // Invalidate cache on new native build or when dev/version changes
        buster:
          Constants.nativeBuildVersion ||
          Constants.expoConfig?.version ||
          "dev",
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
};

export default function RootLayout() {
  return (
    <DeveloperProvider>
      <NetworkProvider>
        <ThemeProvider>
          <ThemedStatusBar />
          <ScreenDimensionsProvider>
            <AuthProvider>
              <DynamicPersistQueryClientProvider>
                <UnitProvider>
                  <StartupHydration />
                  <CalculatorsProvider>
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
                  </CalculatorsProvider>
                </UnitProvider>
              </DynamicPersistQueryClientProvider>
            </AuthProvider>
          </ScreenDimensionsProvider>
        </ThemeProvider>
      </NetworkProvider>
    </DeveloperProvider>
  );
}

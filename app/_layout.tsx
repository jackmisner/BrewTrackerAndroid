import React from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@contexts/AuthContext";
import { ThemeProvider, useTheme } from "@contexts/ThemeContext";
import { UnitProvider } from "@contexts/UnitContext";
import { queryClient } from "@services/API/queryClient";

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

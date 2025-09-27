/**
 * Tab Layout Component
 *
 * Main navigation layout for the BrewTracker app using Expo Router tabs.
 * Provides bottom tab navigation between the core app sections with
 * themed styling and network status integration.
 *
 * Features:
 * - Five main tabs: Dashboard, Recipes, Brewing, Utilities, Profile
 * - Themed tab bar with adaptive colors
 * - Material Icons for consistent visual design
 * - Network status indicator in header
 * - Responsive tab bar height and padding
 * - Active/inactive state styling
 *
 * Navigation Structure:
 * - Dashboard (index): Home screen with overview
 * - Recipes: Recipe management and browsing
 * - Brewing: Brew session tracking and fermentation
 * - Utilities: Calculator tools and utilities
 * - Profile: User settings and account management
 *
 * @example
 * This layout is automatically used by Expo Router for the /(tabs) group
 * ```typescript
 * // Files in app/(tabs)/ automatically use this layout
 * app/(tabs)/index.tsx     // Dashboard tab
 * app/(tabs)/recipes.tsx   // Recipes tab
 * app/(tabs)/utilities.tsx // Utilities tab
 * ```
 */

import React from "react";
import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";
import { NetworkStatusIndicator } from "@src/components/NetworkStatusBanner";

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopWidth: 1,
          borderTopColor: theme.colors.borderLight,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.primaryText,
        headerTitleStyle: {
          fontWeight: "bold",
        },
        headerRight: () => <NetworkStatusIndicator showText={false} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Recipes",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="menu-book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="brewSessions"
        options={{
          title: "Brewing",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="science" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="utilities"
        options={{
          title: "Utilities",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="calculate" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

/**
 * @fileoverview Application entry point with authentication and data initialization
 *
 * @description
 * This component serves as the main entry point for the BrewTracker mobile application.
 * It handles initial app loading, authentication state detection, offline data caching,
 * and automatic navigation to the appropriate screen.
 *
 * @key_features
 * - Authentication state detection on app launch
 * - Initial data caching with splash screen for offline functionality
 * - Automatic routing based on auth status and email verification
 * - Loading screen with branded UI during initialization
 * - Seamless user experience with no manual navigation required
 *
 * @navigation_patterns
 * - Splash screen for authenticated users to cache brewing data
 * - Automatic redirect to login screen for unauthenticated users
 * - Email verification check for authenticated users
 * - Direct navigation to main app tabs after data initialization
 * - Replace navigation (no back button) for security
 *
 * @security_considerations
 * - JWT token validation handled by AuthContext
 * - Email verification enforcement before app access
 * - Secure token storage in SecureStore (mobile-specific)
 * - Automatic logout handling for invalid tokens
 *
 * @data_handling
 * - Authentication state loaded from SecureStore on app start
 * - Essential brewing data cached for offline functionality
 * - User data fetched and cached via React Query
 * - Loading states handled gracefully with progress indicators
 * - Error handling for authentication and data loading failures
 */
import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@contexts/AuthContext";
import { useTheme } from "@contexts/ThemeContext";
import { SplashScreen } from "@src/components/splash/SplashScreen";
import { indexStyles } from "@styles/app/indexStyles";

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { colors } = useTheme();
  const styles = indexStyles(colors);
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Wait for auth to initialize
    if (isLoading) {
      return;
    }

    // Navigate based on auth state
    if (isAuthenticated && user) {
      // Check if email is verified
      if (user.email_verified) {
        // Show splash screen to initialize data for authenticated users
        setShowSplash(true);
      } else {
        router.replace("/(auth)/verifyEmail");
      }
    } else {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Handle splash screen completion
  const handleSplashComplete = (_success: boolean) => {
    // Navigate to main app regardless of cache success
    // Users can still use the app even if caching fails
    router.replace("/(tabs)");
  };

  // Show splash screen for data initialization
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Show loading screen while determining auth state
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading BrewTracker...</Text>
    </View>
  );
}

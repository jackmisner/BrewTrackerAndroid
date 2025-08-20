/**
 * @fileoverview Application entry point and authentication router
 * 
 * @description
 * This component serves as the main entry point for the BrewTracker mobile application.
 * It handles initial app loading, authentication state detection, and automatic navigation
 * to the appropriate screen based on user authentication status and email verification.
 * 
 * @key_features
 * - Authentication state detection on app launch
 * - Automatic routing based on auth status and email verification
 * - Loading screen with branded UI during initialization
 * - Seamless user experience with no manual navigation required
 * 
 * @navigation_patterns
 * - Automatic redirect to login screen for unauthenticated users
 * - Email verification check for authenticated users
 * - Direct navigation to main app tabs for verified users
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
 * - User data fetched and cached via React Query
 * - Loading states handled gracefully with activity indicators
 * - Error handling for authentication failures
 */
import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@contexts/AuthContext";

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth to initialize
    if (isLoading) {
      return;
    }

    // Navigate based on auth state
    if (isAuthenticated && user) {
      // Check if email is verified
      if (user.email_verified) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/verifyEmail");
      }
    } else {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Show loading screen while determining auth state
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#f4511e" />
      <Text style={styles.loadingText}>Loading BrewTracker...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
});

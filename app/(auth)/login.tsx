/**
 * Login Screen
 *
 * User authentication screen for existing users to sign into their accounts.
 * Provides secure login with email/password and includes password recovery
 * and account registration navigation.
 *
 * Features:
 * - Email and password authentication
 * - Quick login with device tokens ("Remember This Device")
 * - Basic validation for required fields
 * - Loading states and error handling
 * - Navigation to forgot password and registration
 * - Keyboard-aware layout
 *
 * Security:
 * - Secure password input
 * - JWT tokens handled by AuthContext and stored securely in SecureStore
 * - Device tokens for "Remember This Device" functionality
 * - Passwords temporarily stored in SecureStore (hardware-backed encryption) for biometric enrollment
 * - No plaintext passwords in AsyncStorage (migrated to SecureStore as of Dec 2024)
 *
 * Platform Permissions:
 * - Android: No additional permissions required (SecureStore uses Android Keystore)
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Switch,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@contexts/AuthContext";
import { useTheme } from "@contexts/ThemeContext";
import { loginStyles } from "@styles/auth/loginStyles";
import {
  BiometricService,
  BiometricErrorCode,
} from "@services/BiometricService";
import { TEST_IDS } from "@src/constants/testIDs";
import { UnifiedLogger } from "@services/logger/UnifiedLogger";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isQuickLoginAttempting, setIsQuickLoginAttempting] = useState(true);
  const [quickLoginMessage, setQuickLoginMessage] = useState(
    "Checking for saved device..."
  );
  const [biometricType, setBiometricType] = useState<string>("Biometric");

  const {
    login,
    error,
    clearError,
    isBiometricAvailable,
    isBiometricEnabled,
    loginWithBiometrics,
    checkBiometricAvailability,
    hasDeviceToken,
    quickLoginWithDeviceToken,
  } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = loginStyles(colors);

  // Check biometric availability and load biometric type name
  useEffect(() => {
    const loadBiometricInfo = async () => {
      await checkBiometricAvailability();
      const typeName = await BiometricService.getBiometricTypeName();
      setBiometricType(typeName);
    };
    loadBiometricInfo();
  }, [checkBiometricAvailability]);

  // Attempt quick login with device token on mount
  useEffect(() => {
    const attemptQuickLogin = async () => {
      try {
        // Check if device token exists
        const hasToken = await hasDeviceToken();

        if (!hasToken) {
          setIsQuickLoginAttempting(false);
          return;
        }

        setQuickLoginMessage("Logging in with saved device...");
        await UnifiedLogger.info(
          "login",
          "Attempting quick login with device token"
        );

        // Attempt device token login
        await quickLoginWithDeviceToken();

        await UnifiedLogger.info(
          "login",
          "Quick login successful, navigating to app"
        );

        // Navigate on success
        router.replace("/");
      } catch (error: any) {
        await UnifiedLogger.warn(
          "login",
          "Quick login failed, showing login form",
          {
            error: error.message,
          }
        );

        // Show login form on failure
        setIsQuickLoginAttempting(false);
      }
    };

    attemptQuickLogin();
  }, [hasDeviceToken, quickLoginWithDeviceToken, router]);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      clearError();
      setIsLoading(true);
      await login({ username, password }, rememberDevice);

      // Check biometric state directly (don't rely on context state which updates async)
      // Wrap in try/catch to prevent blocking navigation on failure
      try {
        const isAvailable = await BiometricService.isBiometricAvailable();
        const isEnabled = await BiometricService.isBiometricEnabled();

        await UnifiedLogger.debug("login", "Post-login biometric check", {
          isAvailable,
          isEnabled,
          willShowPrompt: isAvailable && !isEnabled,
        });

        // Set flag for dashboard to show biometric enrollment prompt
        // Store password temporarily in SECURE STORAGE for biometric enrollment
        if (isAvailable && !isEnabled) {
          await UnifiedLogger.info(
            "login",
            "Flagging biometric enrollment prompt for dashboard"
          );
          await AsyncStorage.setItem("show_biometric_prompt", "true");
          await AsyncStorage.setItem("biometric_prompt_username", username);
          // SECURITY: Store password in SecureStore instead of AsyncStorage
          await SecureStore.setItemAsync("biometric_prompt_password", password);
        } else {
          await UnifiedLogger.debug("login", "Skipping biometric prompt flag", {
            reason: !isAvailable
              ? "Biometrics not available"
              : "Biometrics already enabled",
          });
        }
      } catch (biometricError: any) {
        // Silently handle biometric check failures - don't block navigation
        await UnifiedLogger.error(
          "login",
          "Failed biometric check or SecureStore operation",
          {
            error: biometricError,
            message: biometricError?.message,
            username,
          }
        );
        // Continue to navigation - user experience is not affected
      }

      // Navigate - index.tsx will handle redirect to dashboard
      // If biometric prompt flag is set, dashboard will show the modal
      setIsLoading(false);
      router.replace("/");
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert(
        "Login Failed",
        error.message || "An error occurred during login"
      );
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setIsLoading(true);
      clearError();
      await loginWithBiometrics();

      // Navigate on successful biometric login
      setTimeout(() => {
        router.replace("/");
      }, 100);
    } catch (error: any) {
      // Suppress alerts for user-initiated cancellations
      const errorCode = error.errorCode || error.code;
      const shouldSuppressAlert =
        errorCode === BiometricErrorCode.USER_CANCELLED ||
        errorCode === BiometricErrorCode.SYSTEM_CANCELLED;

      if (!shouldSuppressAlert) {
        Alert.alert(
          "Biometric Login Failed",
          error.message || "An error occurred during biometric authentication"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToRegister = () => {
    router.push("/(auth)/register");
  };

  const navigateToForgotPassword = () => {
    clearError();
    router.push("/(auth)/forgotPassword");
  };

  // Show loading screen during quick login attempt
  if (isQuickLoginAttempting) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.subtitle, { marginTop: 16 }]}>
          {quickLoginMessage}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="height">
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>BrewTracker</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
          {isBiometricEnabled && isBiometricAvailable && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
              disabled={isLoading}
              testID={TEST_IDS.auth.biometricLoginButton}
            >
              <MaterialIcons
                name={
                  biometricType.toLowerCase().includes("face")
                    ? "face"
                    : "fingerprint"
                }
                size={48}
                color={colors.primary}
                testID={TEST_IDS.auth.biometricIcon}
              />
              <Text style={styles.biometricText}>
                Sign in with {biometricType}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="username"
              textContentType="username"
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
            />
          </View>

          <View style={styles.rememberDeviceContainer}>
            <Switch
              value={rememberDevice}
              onValueChange={setRememberDevice}
              trackColor={{ false: colors.border, true: colors.primaryLight30 }}
              thumbColor={rememberDevice ? colors.primary : colors.textMuted}
            />
            <Text style={styles.rememberDeviceText}>Remember this device</Text>
          </View>

          <View style={styles.forgotPasswordContainer}>
            <TouchableOpacity onPress={navigateToForgotPassword}>
              <Text style={styles.forgotPasswordText}>
                Forgot your password?
              </Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <Text style={styles.dividerText}>Don&apos;t have an account?</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={navigateToRegister}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

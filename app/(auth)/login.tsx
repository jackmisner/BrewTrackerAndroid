/**
 * Login Screen
 *
 * User authentication screen for existing users to sign into their accounts.
 * Provides secure login with email/password and includes password recovery
 * and account registration navigation.
 *
 * Features:
 * - Email and password authentication
 * - Basic validation for required fields
 * - Loading states and error handling
 * - Navigation to forgot password and registration
 * - Keyboard-aware layout
 *
 * Security:
 * - Secure password input
 * - JWT tokens handled by AuthContext and stored securely (e.g., SecureStore)
 * - Input handling with basic validation
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
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

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [biometricType, setBiometricType] = useState<string>("Biometric");

  // Use ref for ephemeral credential storage during biometric enrollment flow
  // This prevents plaintext credentials from persisting in component state
  const usernameRef = useRef<string | null>(null);

  const {
    login,
    error,
    clearError,
    isBiometricAvailable,
    isBiometricEnabled,
    loginWithBiometrics,
    enableBiometrics,
    checkBiometricAvailability,
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

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      clearError();
      setIsLoading(true);
      await login({ username, password });

      // Store username ephemerally for potential biometric enrollment
      // Password is not needed for enableBiometrics, so we don't store it
      usernameRef.current = username;

      // Check if biometrics are available and not yet enabled
      if (isBiometricAvailable && !isBiometricEnabled) {
        setShowBiometricPrompt(true);
      } else {
        // Clear ephemeral data and navigate
        usernameRef.current = null;
        setTimeout(() => {
          router.replace("/");
        }, 100);
      }
    } catch (error: any) {
      // Clear ephemeral data on error
      usernameRef.current = null;
      Alert.alert(
        "Login Failed",
        error.message || "An error occurred during login"
      );
    } finally {
      setIsLoading(false);
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

  const handleEnableBiometrics = async () => {
    if (!usernameRef.current) {
      setShowBiometricPrompt(false);
      router.replace("/");
      return;
    }

    try {
      await enableBiometrics(usernameRef.current);
      setShowBiometricPrompt(false);
      // Clear ephemeral data immediately after use
      usernameRef.current = null;
      Alert.alert(
        "Success",
        `${biometricType} authentication enabled. You can now use ${biometricType.toLowerCase()} to log in.`,
        [
          {
            text: "OK",
            onPress: () => {
              setTimeout(() => {
                router.replace("/");
              }, 100);
            },
          },
        ]
      );
    } catch (error: any) {
      setShowBiometricPrompt(false);
      // Clear ephemeral data on error
      usernameRef.current = null;

      // Suppress alerts for user-initiated cancellations, otherwise show error
      const errorCode = error.errorCode || error.code;
      const shouldSuppressAlert =
        errorCode === BiometricErrorCode.USER_CANCELLED ||
        errorCode === BiometricErrorCode.SYSTEM_CANCELLED;

      if (!shouldSuppressAlert) {
        Alert.alert(
          "Error",
          `Failed to enable ${biometricType.toLowerCase()} authentication. You can enable it later in settings.`,
          [
            {
              text: "OK",
              onPress: () => {
                setTimeout(() => {
                  router.replace("/");
                }, 100);
              },
            },
          ]
        );
      } else {
        // User cancelled - just navigate without showing error
        setTimeout(() => {
          router.replace("/");
        }, 100);
      }
    }
  };

  const handleSkipBiometrics = () => {
    setShowBiometricPrompt(false);
    // Clear ephemeral data when user skips biometric setup
    usernameRef.current = null;
    setTimeout(() => {
      router.replace("/");
    }, 100);
  };

  const navigateToRegister = () => {
    router.push("/(auth)/register");
  };

  const navigateToForgotPassword = () => {
    clearError();
    router.push("/(auth)/forgotPassword");
  };

  return (
    <>
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
              <Text style={styles.dividerText}>
                Don&apos;t have an account?
              </Text>
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

      {/* Biometric Enrollment Prompt Modal */}
      <Modal
        visible={showBiometricPrompt}
        transparent
        animationType="fade"
        onRequestClose={handleSkipBiometrics}
        testID={TEST_IDS.auth.biometricPromptModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialIcons
              name={
                biometricType.toLowerCase().includes("face")
                  ? "face"
                  : "fingerprint"
              }
              size={64}
              color={colors.primary}
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>Enable {biometricType}?</Text>
            <Text style={styles.modalMessage}>
              Use {biometricType.toLowerCase()} to sign in quickly and securely.
              You can change this later in settings.
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, styles.modalButton]}
              onPress={handleEnableBiometrics}
              testID={TEST_IDS.auth.enableBiometricButton}
            >
              <Text style={styles.buttonText}>Enable {biometricType}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.secondaryButton,
                styles.modalButton,
              ]}
              onPress={handleSkipBiometrics}
              testID={TEST_IDS.auth.skipBiometricButton}
            >
              <Text style={styles.secondaryButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

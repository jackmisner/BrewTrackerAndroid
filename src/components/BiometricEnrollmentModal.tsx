/**
 * Biometric Enrollment Modal Component
 *
 * Shows a modal prompt to enable biometric authentication after successful login.
 * Checks AsyncStorage for a flag set during login and displays the enrollment prompt.
 * Automatically clears the flag after showing or when dismissed.
 *
 * Security:
 * - Reads password from SecureStore (hardware-backed encryption)
 * - Migrates legacy AsyncStorage passwords to SecureStore
 * - Credentials only exist temporarily during enrollment flow
 */

import React, { useEffect, useState, useRef } from "react";
import { Modal, View, Text, TouchableOpacity, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@contexts/AuthContext";
import { useTheme } from "@contexts/ThemeContext";
import {
  BiometricService,
  BiometricErrorCode,
} from "@services/BiometricService";
import { UnifiedLogger } from "@services/logger/UnifiedLogger";
import { createBiometricEnrollmentModalStyles } from "@styles/components/biometricEnrollmentModalStyles";

export const BiometricEnrollmentModal: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [biometricType, setBiometricType] = useState<string>("Biometrics");
  const { enableBiometrics } = useAuth();
  const theme = useTheme();
  const hasChecked = useRef(false);
  const styles = createBiometricEnrollmentModalStyles(theme);

  // Helper function to clean up biometric prompt credentials and flags
  const cleanupBiometricPromptCredentials = async () => {
    try {
      await AsyncStorage.removeItem("show_biometric_prompt");
      await AsyncStorage.removeItem("biometric_prompt_username");
      await AsyncStorage.removeItem("biometric_prompt_password");
      await SecureStore.deleteItemAsync("biometric_prompt_password");
    } catch {
      // Swallow cleanup errors
    }
  };

  // Check on mount if we should show the biometric enrollment prompt
  useEffect(() => {
    // Prevent multiple executions
    if (hasChecked.current) {
      return;
    }
    hasChecked.current = true;
    const checkForPrompt = async () => {
      try {
        const shouldShow = await AsyncStorage.getItem("show_biometric_prompt");
        const storedUsername = await AsyncStorage.getItem(
          "biometric_prompt_username"
        );

        // SECURITY FIX: Read password from SecureStore instead of AsyncStorage
        let storedPassword = await SecureStore.getItemAsync(
          "biometric_prompt_password"
        );

        // MIGRATION: Check for legacy insecure password in AsyncStorage
        if (!storedPassword) {
          const legacyPassword = await AsyncStorage.getItem(
            "biometric_prompt_password"
          );
          if (legacyPassword) {
            await UnifiedLogger.warn(
              "biometric_modal",
              "Found legacy password in AsyncStorage, migrating to SecureStore"
            );
            // Migrate to SecureStore
            try {
              await SecureStore.setItemAsync(
                "biometric_prompt_password",
                legacyPassword
              );
              storedPassword = legacyPassword;
              // Clean up legacy insecure storage
              await AsyncStorage.removeItem("biometric_prompt_password");
              await UnifiedLogger.info(
                "biometric_modal",
                "Successfully migrated password to SecureStore"
              );
            } catch (migrationError) {
              await UnifiedLogger.error(
                "biometric_modal",
                "Failed to migrate password to SecureStore",
                {
                  error:
                    migrationError instanceof Error
                      ? migrationError.message
                      : String(migrationError),
                }
              );
              // Clean up anyway for security
              await AsyncStorage.removeItem("biometric_prompt_password");
            }
          }
        }

        if (shouldShow === "true" && storedUsername && storedPassword) {
          try {
            await UnifiedLogger.info(
              "biometric_modal",
              "Showing biometric enrollment modal on dashboard"
            );

            try {
              const typeName = await BiometricService.getBiometricTypeName();
              setBiometricType(typeName);
            } catch (typeError) {
              await UnifiedLogger.warn(
                "biometric_modal",
                "Failed to get biometric type name, using default",
                {
                  error:
                    typeError instanceof Error
                      ? typeError.message
                      : String(typeError),
                }
              );
              setBiometricType("Biometric");
            }

            setUsername(storedUsername);
            setPassword(storedPassword);
            setShowPrompt(true);
          } finally {
            // Always clear flags to avoid repeated prompts (including password for security)
            await cleanupBiometricPromptCredentials();
          }
        } else if (
          !storedPassword &&
          (shouldShow === "true" || storedUsername)
        ) {
          // Handle case where credentials are incomplete/expired
          await UnifiedLogger.warn(
            "biometric_modal",
            "Incomplete biometric prompt credentials, cleaning up flags",
            {
              hasFlag: shouldShow === "true",
              hasUsername: !!storedUsername,
              hasPassword: false,
            }
          );
          await cleanupBiometricPromptCredentials();
        } else if (storedPassword && shouldShow !== "true") {
          // Clean up any stray stored credentials if flag is not set
          await UnifiedLogger.warn(
            "biometric_modal",
            "Stray biometric prompt credentials found without flag, cleaning up",
            {
              hasFlag: false,
              hasUsername: !!storedUsername,
              hasPassword: true,
            }
          );
          await cleanupBiometricPromptCredentials();
        }
      } catch (error) {
        await UnifiedLogger.error(
          "biometric_modal",
          "Failed to check biometric prompt flag",
          { error: error instanceof Error ? error.message : String(error) }
        );
        // Clean up on error for security
        await cleanupBiometricPromptCredentials();
      }
    };

    checkForPrompt();
  }, []);

  const handleEnableBiometrics = async () => {
    if (!username || !password) {
      setShowPrompt(false);
      setUsername(null);
      setPassword(null);
      return;
    }

    try {
      await UnifiedLogger.info(
        "biometric_modal",
        "User accepted biometrics enrollment"
      );

      await enableBiometrics(username, password);
      setShowPrompt(false);
      setUsername(null);
      setPassword(null);

      Alert.alert(
        "Success",
        `${biometricType} authentication enabled. You can now use ${biometricType.toLowerCase()}s to log in.`
      );
    } catch (error: any) {
      setShowPrompt(false);
      setUsername(null);
      setPassword(null);

      // Suppress alerts for user-initiated cancellations
      const errorCode = error.errorCode || error.code;
      const shouldSuppressAlert =
        errorCode === BiometricErrorCode.USER_CANCELLED ||
        errorCode === BiometricErrorCode.SYSTEM_CANCELLED;

      if (!shouldSuppressAlert) {
        Alert.alert(
          "Error",
          `Failed to enable ${biometricType.toLowerCase()}s authentication. You can enable it later in settings.`
        );
      }

      await UnifiedLogger.warn(
        "biometric_modal",
        "Biometric enrollment failed or cancelled",
        {
          errorCode,
          suppressed: shouldSuppressAlert,
        }
      );
    }
  };

  const handleSkip = async () => {
    await UnifiedLogger.info(
      "biometric_modal",
      "User skipped biometric enrollment"
    );
    setShowPrompt(false);
    setUsername(null);
    setPassword(null);
  };

  // Don't call setState during render - just return early
  if (!showPrompt) {
    return null;
  }

  return (
    <Modal
      visible={showPrompt}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
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
            color={theme.colors.primary}
            style={styles.modalIcon}
          />
          <Text accessibilityRole="header" style={styles.modalTitle}>
            Enable {biometricType}s?
          </Text>
          <Text style={styles.modalMessage}>
            Use {biometricType.toLowerCase()} to sign in quickly and securely.
            You can change this later in settings.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.button}
            onPress={handleEnableBiometrics}
          >
            <Text style={styles.buttonText}>Enable {biometricType}s</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.button, styles.secondaryButton]}
            onPress={handleSkip}
          >
            <Text style={styles.secondaryButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

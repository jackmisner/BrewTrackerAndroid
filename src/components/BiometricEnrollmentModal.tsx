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

import React, { useEffect, useState, useRef, useMemo } from "react";
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

// Storage keys for biometric enrollment prompt
// Exported for use in login screen and other components
export const BIOMETRIC_PROMPT_STORAGE_KEYS = {
  SHOW_PROMPT: "show_biometric_prompt",
  USERNAME: "biometric_prompt_username",
  PASSWORD: "biometric_prompt_password",
} as const;

export const BiometricEnrollmentModal: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [biometricType, setBiometricType] = useState<string>("Biometrics");
  const { enableBiometrics } = useAuth();
  const theme = useTheme();
  const hasChecked = useRef(false);

  // SECURITY: Use ref instead of state to avoid keeping password in component memory
  // Ref is cleared immediately after use to prevent retention
  const passwordRef = useRef<string | null>(null);

  // Memoize style creation to avoid re-creating StyleSheet on every render
  const styles = useMemo(
    () => createBiometricEnrollmentModalStyles(theme),
    [theme]
  );

  // Helper function to clean up biometric prompt credentials and flags
  const cleanupBiometricPromptCredentials = async () => {
    try {
      await AsyncStorage.removeItem(BIOMETRIC_PROMPT_STORAGE_KEYS.SHOW_PROMPT);
      await AsyncStorage.removeItem(BIOMETRIC_PROMPT_STORAGE_KEYS.USERNAME);
      await AsyncStorage.removeItem(BIOMETRIC_PROMPT_STORAGE_KEYS.PASSWORD);
      await SecureStore.deleteItemAsync(BIOMETRIC_PROMPT_STORAGE_KEYS.PASSWORD);
    } catch (error) {
      // Swallow cleanup errors but log for observability
      await UnifiedLogger.warn(
        "biometric_modal",
        "Failed to clean up biometric prompt credentials",
        { error: error instanceof Error ? error.message : String(error) }
      );
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
        const shouldShow = await AsyncStorage.getItem(
          BIOMETRIC_PROMPT_STORAGE_KEYS.SHOW_PROMPT
        );
        const storedUsername = await AsyncStorage.getItem(
          BIOMETRIC_PROMPT_STORAGE_KEYS.USERNAME
        );

        // SECURITY FIX: Read password from SecureStore instead of AsyncStorage
        let storedPassword = await SecureStore.getItemAsync(
          BIOMETRIC_PROMPT_STORAGE_KEYS.PASSWORD
        );

        // MIGRATION: Check for legacy insecure password in AsyncStorage
        if (!storedPassword) {
          const legacyPassword = await AsyncStorage.getItem(
            BIOMETRIC_PROMPT_STORAGE_KEYS.PASSWORD
          );
          if (legacyPassword) {
            await UnifiedLogger.warn(
              "biometric_modal",
              "Found legacy password in AsyncStorage, migrating to SecureStore"
            );
            // Migrate to SecureStore
            try {
              await SecureStore.setItemAsync(
                BIOMETRIC_PROMPT_STORAGE_KEYS.PASSWORD,
                legacyPassword
              );
              storedPassword = legacyPassword;
              // Clean up legacy insecure storage
              await AsyncStorage.removeItem(
                BIOMETRIC_PROMPT_STORAGE_KEYS.PASSWORD
              );
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
              await AsyncStorage.removeItem(
                BIOMETRIC_PROMPT_STORAGE_KEYS.PASSWORD
              );
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
            // SECURITY: Store password in ref, not state
            passwordRef.current = storedPassword;
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
    if (!username) {
      setShowPrompt(false);
      setUsername(null);
      // SECURITY: Clear password ref immediately
      passwordRef.current = null;
      return;
    }

    try {
      await UnifiedLogger.info(
        "biometric_modal",
        "User accepted biometric enrollment with device token"
      );

      await enableBiometrics(username);

      setShowPrompt(false);
      setUsername(null);

      Alert.alert(
        "Success",
        `${biometricType} authentication enabled. You can now use ${biometricType.toLowerCase()}s to log in.`
      );
    } catch (error: any) {
      // SECURITY: Clear password ref immediately on error
      passwordRef.current = null;

      setShowPrompt(false);
      setUsername(null);

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

    // SECURITY: Clear password ref immediately
    passwordRef.current = null;

    setShowPrompt(false);
    setUsername(null);
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

/**
 * Biometric Enrollment Modal Component
 *
 * Shows a modal prompt to enable biometric authentication after successful login.
 * Checks AsyncStorage for a flag set during login and displays the enrollment prompt.
 * Automatically clears the flag after showing or when dismissed.
 */

import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@contexts/AuthContext";
import { useTheme } from "@contexts/ThemeContext";
import {
  BiometricService,
  BiometricErrorCode,
} from "@services/BiometricService";
import { UnifiedLogger } from "@services/logger/UnifiedLogger";

export const BiometricEnrollmentModal: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [biometricType, setBiometricType] = useState<string>("Biometrics");
  const { enableBiometrics } = useAuth();
  const { colors } = useTheme();

  // Check on mount if we should show the biometric enrollment prompt
  useEffect(() => {
    const checkForPrompt = async () => {
      try {
        const shouldShow = await AsyncStorage.getItem("show_biometric_prompt");
        const storedUsername = await AsyncStorage.getItem(
          "biometric_prompt_username"
        );

        if (shouldShow === "true" && storedUsername) {
          await UnifiedLogger.info(
            "biometric_modal",
            "Showing biometric enrollment modal on dashboard"
          );

          // Get biometric type name for display
          const typeName = await BiometricService.getBiometricTypeName();
          setBiometricType(typeName);
          setUsername(storedUsername);
          setShowPrompt(true);

          // Clear the flags immediately so modal doesn't show again
          await AsyncStorage.removeItem("show_biometric_prompt");
          await AsyncStorage.removeItem("biometric_prompt_username");
        }
      } catch (error) {
        await UnifiedLogger.error(
          "biometric_modal",
          "Failed to check biometric prompt flag",
          { error: error instanceof Error ? error.message : String(error) }
        );
      }
    };

    checkForPrompt();
  }, []);

  const handleEnableBiometrics = async () => {
    if (!username) {
      setShowPrompt(false);
      return;
    }

    try {
      await UnifiedLogger.info(
        "biometric_modal",
        "User accepted biometrics enrollment"
      );

      await enableBiometrics(username);
      setShowPrompt(false);

      Alert.alert(
        "Success",
        `${biometricType} authentication enabled. You can now use ${biometricType.toLowerCase()}s to log in.`
      );
    } catch (error: any) {
      setShowPrompt(false);

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
  };

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
        <View
          style={[styles.modalContent, { backgroundColor: colors.background }]}
        >
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
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Enable {biometricType}s?
          </Text>
          <Text style={[styles.modalMessage, { color: colors.textMuted }]}>
            Use {biometricType.toLowerCase()} to sign in quickly and securely.
            You can change this later in settings.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleEnableBiometrics}
          >
            <Text style={styles.buttonText}>Enable {biometricType}s</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.secondaryButton,
              {
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: colors.primary,
              },
            ]}
            onPress={handleSkip}
          >
            <Text
              style={[styles.secondaryButtonText, { color: colors.primary }]}
            >
              Skip
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    width: "100%",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    marginBottom: 0,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

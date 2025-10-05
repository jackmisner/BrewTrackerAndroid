/**
 * Login Screen Styles
 *
 * StyleSheet definitions for the login authentication screen.
 * Provides a clean, professional login interface with proper spacing,
 * typography, and interactive elements.
 *
 * Features:
 * - Responsive layout with keyboard handling
 * - Consistent form input styling
 * - Branded color scheme and typography
 * - Interactive button states
 * - Error message styling
 * - Loading state indicators
 * - Theme-aware colors for dark mode support
 */

import { StyleSheet } from "react-native";
import { ThemeColors } from "@contexts/ThemeContext";
import { buttonStyles } from "@styles/common/buttons";

export const loginStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: "center",
      padding: 20,
    },
    header: {
      alignItems: "center",
      marginBottom: 40,
    },
    title: {
      fontSize: 32,
      fontWeight: "bold",
      color: colors.primary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    form: {
      width: "100%",
    },
    inputContainer: {
      marginBottom: 16,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      backgroundColor: colors.inputBackground,
      color: colors.text,
    },
    divider: {
      alignItems: "center",
      marginVertical: 20,
    },
    dividerText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      marginBottom: 12,
      textAlign: "center",
    },
    forgotPasswordContainer: {
      alignItems: "flex-end",
      marginBottom: 16,
    },
    forgotPasswordText: {
      color: colors.primary,
      fontSize: 14,
      textDecorationLine: "underline",
    },
    // Password reset specific styles
    formContainer: {
      flex: 1,
      padding: 20,
      justifyContent: "center",
    },
    errorContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fee2e2",
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    successContainer: {
      backgroundColor: "#f0f9ff",
      padding: 16,
      borderRadius: 8,
      marginBottom: 24,
    },
    successText: {
      color: colors.success,
      fontSize: 16,
      fontWeight: "500",
      marginBottom: 8,
    },
    successSubtext: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    inputWrapper: {
      position: "relative",
      marginBottom: 16,
    },
    inputIcon: {
      position: "absolute",
      left: 12,
      top: 14,
      zIndex: 1,
    },
    passwordToggle: {
      position: "absolute",
      right: 12,
      top: 14,
      zIndex: 1,
    },
    helpText: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 4,
      marginBottom: 8,
    },
    passwordStrengthContainer: {
      marginTop: 4,
      marginBottom: 8,
    },
    passwordStrengthText: {
      fontSize: 12,
      fontWeight: "500",
    },
    passwordWeak: {
      color: colors.error,
    },
    passwordMedium: {
      color: colors.warning,
    },
    passwordStrong: {
      color: colors.success,
    },
    buttonContainer: {
      marginTop: 8,
      marginBottom: 20,
    },
    resetPrimaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: "center",
    },
    primaryButtonDisabled: {
      backgroundColor: colors.border,
    },
    resetPrimaryButtonText: {
      color: colors.primaryText,
      fontSize: 16,
      fontWeight: "600",
    },
    primaryButtonTextDisabled: {
      color: colors.textSecondary,
    },
    footerLinks: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 20,
    },
    linkText: {
      color: colors.primary,
      fontSize: 14,
      textDecorationLine: "underline",
    },
    linkSeparator: {
      color: colors.textSecondary,
      marginHorizontal: 12,
    },
    // Biometric authentication styles
    biometricButton: {
      alignItems: "center",
      marginTop: 24,
      padding: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.primary,
      borderStyle: "dashed",
    },
    biometricText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
      marginTop: 8,
    },
    // Biometric enrollment modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: 16,
      padding: 24,
      width: "100%",
      maxWidth: 400,
      alignItems: "center",
    },
    modalIcon: {
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 12,
      textAlign: "center",
    },
    modalMessage: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 24,
    },
    modalButton: {
      width: "100%",
      marginBottom: 12,
    },
    // Re-export button styles for consistency
    ...buttonStyles,
  });

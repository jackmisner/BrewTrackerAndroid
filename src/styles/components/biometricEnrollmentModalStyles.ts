import { StyleSheet } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";

export const createBiometricEnrollmentModalStyles = (
  theme: ThemeContextValue
) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: theme.colors.background,
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
      color: theme.colors.text,
    },
    modalMessage: {
      fontSize: 14,
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 20,
      color: theme.colors.textMuted,
    },
    button: {
      width: "100%",
      padding: 16,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 12,
      backgroundColor: theme.colors.primary,
    },
    buttonText: {
      // Use dedicated button text color for proper contrast on primary background
      // Priority: buttonText (if exists) -> primaryText -> white (safe default for primary buttons)
      color:
        (theme.colors as any).buttonText || theme.colors.primaryText || "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    secondaryButton: {
      marginBottom: 0,
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.primary,
    },
  });

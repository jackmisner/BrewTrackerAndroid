import { StyleSheet } from "react-native";
import { colors } from "@styles/common/colors";

/**
 * Common button styles used throughout the app
 */
export const buttonStyles = StyleSheet.create({
  // Base button style
  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  // Primary button (filled with brand color)
  primaryButton: {
    backgroundColor: colors.primary,
  },

  // Secondary button (outlined)
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.primary,
  },

  // Button text styles
  buttonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: "600",
  },

  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },

  // Disabled button
  disabledButton: {
    backgroundColor: colors.textMuted,
    opacity: 0.6,
  },

  disabledButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: "600",
  },
});

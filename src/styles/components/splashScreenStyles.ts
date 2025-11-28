/**
 * Splash Screen Component Styles
 *
 * Styles for the initial data loading splash screen.
 */

import { StyleSheet } from "react-native";
import { ThemeColors } from "@contexts/ThemeContext";

export const splashScreenStyles = (theme: { colors: ThemeColors }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    content: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      maxWidth: 400,
    },
    logoContainer: {
      alignItems: "center",
      marginBottom: 80,
    },
    appLogo: {
      width: 80,
      height: 80,
    },
    appTitle: {
      fontSize: 32,
      fontWeight: "bold",
      color: theme.colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    appSubtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    progressSection: {
      width: "100%",
      alignItems: "center",
    },
    stepIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.backgroundSecondary,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 24,
    },
    progressBarContainer: {
      width: "100%",
      alignItems: "center",
      marginBottom: 16,
    },
    progressBarBackground: {
      width: "100%",
      height: 8,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 8,
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 4,
    },
    progressPercent: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    progressMessage: {
      fontSize: 16,
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: 24,
      minHeight: 24, // Prevent layout jumps
    },
    loadingIndicator: {
      marginBottom: 16,
    },
    errorContainer: {
      alignItems: "center",
      paddingHorizontal: 16,
    },
    errorText: {
      fontSize: 16,
      color: theme.colors.error,
      textAlign: "center",
      marginBottom: 8,
    },
    errorSubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    successContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    successText: {
      fontSize: 16,
      color: theme.colors.success || "#4CAF50",
      marginLeft: 8,
      fontWeight: "600",
    },
    footer: {
      paddingBottom: 40,
    },
    footerText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      textAlign: "center",
    },
  });

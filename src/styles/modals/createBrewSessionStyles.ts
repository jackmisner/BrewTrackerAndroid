import { StatusBar, StyleSheet } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";

export const createBrewSessionStyles = (theme: ThemeContextValue) =>
  StyleSheet.create({
    // Main container
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 60,

      paddingBottom: 16,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      elevation: 2,
      shadowColor: theme.colors.shadow || "#000",

      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    headerButton: {
      padding: 8,
      borderRadius: 20,
      minWidth: 40,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      textAlign: "center",
      flex: 1,
      marginHorizontal: 16,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    saveButtonDisabled: {
      backgroundColor: theme.colors.textSecondary,
      opacity: 0.6,
    },
    saveButtonText: {
      color: theme.colors.primaryText || "#fff",

      fontWeight: "600",
      fontSize: 16,
    },

    // Content
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
    },

    // Recipe Preview Section
    recipePreview: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    recipeHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    recipeTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginLeft: 8,
      flex: 1,
    },
    recipeStyle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontStyle: "italic",
      marginBottom: 8,
    },
    recipeDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: 16,
    },

    // Recipe Metrics
    recipeMetrics: {
      gap: 12,
    },
    metricRow: {
      flexDirection: "row",
      gap: 16,
    },
    metric: {
      flex: 1,
      alignItems: "center",
    },
    metricLabel: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: 4,
    },
    metricValue: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
      textAlign: "center",
    },

    // Form Section
    formSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 20,
    },

    // Form Groups
    formGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.colors.text,
      marginBottom: 8,
    },

    // Text Inputs
    textInput: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.text,
      minHeight: 48, // Minimum touch target
    },
    textArea: {
      minHeight: 100,
      paddingTop: 12, // Ensure proper top padding for multiline
    },

    // Date Picker
    datePickerButton: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    datePickerText: {
      fontSize: 16,
      color: theme.colors.text,
      flex: 1,
    },
    datePickerPlaceholder: {
      color: theme.colors.textSecondary,
    },

    // Status Info
    statusContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      minHeight: 48,
    },
    statusText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginLeft: 8,
      flex: 1,
    },

    // Bottom spacing
    bottomSpacing: {
      height: 40,
    },

    // Loading State
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      paddingHorizontal: 20,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 16,
      textAlign: "center",
    },

    // Error State
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      paddingHorizontal: 20,
    },
    errorText: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.error,
      marginTop: 16,
      textAlign: "center",
    },
    errorSubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 8,
      textAlign: "center",
      lineHeight: 20,
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 24,
      minHeight: 48,
      justifyContent: "center",
      alignItems: "center",
    },
    retryButtonText: {
      color: theme.colors.primaryText || "#fff",

      fontSize: 16,
      fontWeight: "600",
    },
  });

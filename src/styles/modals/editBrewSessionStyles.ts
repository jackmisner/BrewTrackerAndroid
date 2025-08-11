import { StyleSheet } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";

export const editBrewSessionStyles = (theme: ThemeContextValue) =>
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
      paddingTop: 60, // Account for status bar
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

    // Form Sections
    formSection: {
      marginBottom: 32,
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

    // Status Selection
    statusContainer: {
      gap: 8,
    },
    statusOption: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 48,
    },
    statusOptionSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    statusOptionText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 2,
    },
    statusOptionTextSelected: {
      color: theme.colors.primaryText || "#fff",
    },
    statusOptionDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    statusOptionDescriptionSelected: {
      color: "rgba(255, 255, 255, 0.8)",
    },

    // Measurement Groups
    measurementRow: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 16,
    },
    measurementGroup: {
      flex: 1,
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

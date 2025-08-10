import { StyleSheet } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";

export const ingredientPickerStyles = (theme: ThemeContextValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    // Header styles
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 60, // Account for status bar
      paddingBottom: 16,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
    },

    // Search styles
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      margin: 16,
      marginBottom: 12,
      gap: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
    },

    // Category filter styles
    categoryContainer: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 8,
    },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    categoryChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    categoryChipText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.text,
    },
    categoryChipTextActive: {
      color: theme.colors.primaryText,
    },

    // List styles
    listContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    ingredientItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
    },
    ingredientInfo: {
      flex: 1,
    },
    ingredientName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 4,
    },
    ingredientDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: 8,
    },
    ingredientSpecs: {
      flexDirection: "row",
      gap: 12,
    },
    specText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      backgroundColor: theme.colors.inputBackground,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      fontWeight: "500",
    },

    // State containers
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textMuted,
      marginTop: 16,
    },

    errorContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginTop: 16,
      textAlign: "center",
    },
    errorMessage: {
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
    },
    retryButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.primaryText,
    },

    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginTop: 16,
      textAlign: "center",
    },
    emptyMessage: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 8,
      textAlign: "center",
      lineHeight: 20,
    },

    // Quantity input overlay
    quantityContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    quantityHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 60,
      paddingBottom: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    quantityTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      flex: 1,
    },
    quantityContent: {
      padding: 24,
    },
    quantityLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 16,
    },
    quantityInputContainer: {
      marginBottom: 32,
    },
    quantityInput: {
      backgroundColor: theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
      fontSize: 18,
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: 16,
    },

    // Unit picker in quantity input
    unitPickerContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "center",
    },
    unitButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      minWidth: 60,
      alignItems: "center",
    },
    unitButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    unitButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
    },
    unitButtonTextActive: {
      color: theme.colors.primaryText,
    },

    // Confirm button
    confirmButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    confirmButtonText: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.primaryText,
    },
  });

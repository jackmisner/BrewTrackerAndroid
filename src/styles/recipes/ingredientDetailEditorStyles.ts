import { StyleSheet } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";

export const ingredientDetailEditorStyles = (theme: ThemeContextValue) =>
  StyleSheet.create({
    // Overlay and container
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
      paddingHorizontal: 20,
    },
    container: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 16,
      padding: 24,
      width: "100%",
      maxWidth: 500,
      maxHeight: "85%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 8,
    },
    scrollContent: {
      maxHeight: 500,
      marginBottom: 16,
    },

    // Header
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    closeButton: {
      padding: 4,
    },

    // Ingredient info
    ingredientName: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 4,
    },
    ingredientType: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 24,
      textTransform: "capitalize",
    },

    // Sections
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 12,
    },

    // Amount section
    amountContainer: {
      gap: 12,
    },
    amountInputContainer: {
      flex: 1,
    },
    amountInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.error,
      marginTop: 4,
    },
    // Time section
    timeContainer: {
      gap: 12,
    },
    timeInputContainer: {
      flex: 1,
    },
    timeInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
    },
    timeInputError: {
      borderColor: theme.colors.error,
    },
    timeInputLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },

    // Adjustment buttons with left/right layout
    adjustmentContainer: {
      flexDirection: "row",
      marginTop: 12,
      gap: 12,
      alignItems: "flex-start",
    },
    adjustmentSide: {
      flex: 1,
      flexDirection: "column",
      gap: 6,
    },
    adjustmentSideLeft: {
      alignItems: "flex-end", // Right-align negative button rows (towards center)
    },
    adjustmentSideRight: {
      alignItems: "flex-start", // Left-align positive button rows (towards center)
    },
    adjustmentRow: {
      flexDirection: "row",
      gap: 6,
    },
    adjustmentDivider: {
      width: 1,
      backgroundColor: theme.colors.border,
      alignSelf: "stretch",
      minHeight: 40,
    },
    adjustButton: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      minWidth: 40,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    adjustButtonNegative: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.error,
    },
    adjustButtonPositive: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.primary,
    },
    adjustButtonText: {
      fontSize: 12,
      fontWeight: "500",
    },
    adjustButtonTextNegative: {
      color: theme.colors.error,
    },
    adjustButtonTextPositive: {
      color: theme.colors.primary,
    },

    // Unit buttons
    unitButtons: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    unitButton: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      minWidth: 48,
      alignItems: "center",
    },
    unitButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    unitButtonText: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: "500",
    },
    unitButtonTextActive: {
      color: "#fff",
      fontWeight: "600",
    },

    // Usage buttons (hops)
    usageButtons: {
      flexDirection: "row",
      gap: 12,
    },
    usageButton: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
    },
    usageButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    usageButtonText: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: "500",
    },
    usageButtonTextActive: {
      color: "#fff",
      fontWeight: "600",
    },

    // Time presets (hops)
    timePresets: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    timeButton: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignItems: "center",
    },
    timeButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    timeButtonText: {
      fontSize: 12,
      color: theme.colors.text,
      fontWeight: "500",
    },
    timeButtonTextActive: {
      color: "#fff",
      fontWeight: "600",
    },

    // Action buttons
    actionButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 8,
      gap: 12,
    },
    deleteButton: {
      backgroundColor: theme.colors.error,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    deleteButtonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "600",
    },
    primaryActions: {
      flexDirection: "row",
      gap: 12,
      flex: 1,
      justifyContent: "flex-end",
    },
    cancelButton: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    cancelButtonText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    saveButtonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "600",
    },
  });

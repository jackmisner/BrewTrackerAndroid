import { StyleSheet } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";

export const ingredientDetailEditorStyles = (theme: ThemeContextValue) =>
  StyleSheet.create({
    // Overlay and container
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },
    container: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 16,
      padding: 24,
      width: "100%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 8,
    },
    scrollContent: {
      flexGrow: 1,
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
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    layoutToggle: {
      padding: 8,
      borderRadius: 6,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
    amountInputRow: {
      flexDirection: "row",
      alignItems: "flex-start",
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
    zeroButton: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minWidth: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    zeroButtonText: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: "600",
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

    // Classic layout - enhanced single row
    adjustmentContainer: {
      marginTop: 12,
    },
    classicAdjustmentRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
    },
    // Classic layout - responsive vertical stacking for small screens
    classicAdjustmentColumn: {
      gap: 12,
    },
    classicAdjustmentSection: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
    },
    adjustmentDivider: {
      width: 2,
      height: 32,
      backgroundColor: theme.colors.border,
      marginHorizontal: 8,
    },
    adjustButton: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minWidth: 52,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      maxWidth: 80,
    },
    adjustButtonNegative: {
      borderColor: theme.colors.error,
    },
    adjustButtonPositive: {
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

    // Compact layout - radio + action buttons
    compactAdjustmentContainer: {
      flexDirection: "row",
      marginTop: 12,
      gap: 16,
      alignItems: "stretch",
      minHeight: 120,
    },
    incrementSelector: {
      flex: 1,
    },
    incrementSelectorLabel: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.text,
      marginBottom: 8,
    },
    incrementOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      gap: 12,
    },
    radioButton: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    radioButtonInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary,
    },
    incrementOptionText: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: "500",
    },
    compactActionButtons: {
      gap: 16,
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
    },
    actionButton: {
      width: 56,
      height: 56,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
    },
    actionButtonNegative: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.error,
    },
    actionButtonPositive: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.primary,
    },

    // Unit buttons (legacy - kept for compatibility)
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

    // Full-width unit buttons
    unitButtonsFullWidth: {
      flexDirection: "row",
      gap: 8,
    },
    unitButtonFullWidth: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
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

    // Unit dropdown for other ingredients
    unitDropdownButton: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    unitDropdownButtonActive: {
      borderColor: theme.colors.primary,
    },
    unitDropdownText: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: "500",
    },
    unitDropdownMenu: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: 4,
      maxHeight: 200,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    unitDropdownItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    unitDropdownItemLast: {
      borderBottomWidth: 0,
    },
    unitDropdownItemText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    unitDropdownItemTextSelected: {
      color: theme.colors.primary,
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

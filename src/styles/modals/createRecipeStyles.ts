import { StyleSheet } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";

export const createRecipeStyles = (theme: ThemeContextValue) =>
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

    // Old progress styles - replaced by comprehensive styles at bottom
    // Content styles - replaced by comprehensive styles at bottom
    progressBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    progressCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    progressCircleActive: {
      backgroundColor: theme.colors.primary,
    },
    progressStepText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textMuted,
    },
    progressStepTextActive: {
      color: theme.colors.primaryText,
    },
    progressStepLabel: {
      fontSize: 12,
      color: theme.colors.textMuted,
      textAlign: "center",
    },
    progressStepLabelActive: {
      color: theme.colors.text,
      fontWeight: "500",
    },
    placeholderText: {
      fontSize: 16,
      color: theme.colors.textMuted,
      textAlign: "center",
      marginTop: 50,
    },

    // Navigation styles
    navigationContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 20,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    navigationButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      minWidth: 120,
      gap: 8,
    },
    navigationButtonPrimary: {
      backgroundColor: theme.colors.primary,
    },
    navigationButtonSecondary: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    navigationButtonDisabled: {
      opacity: 0.5,
    },
    navigationButtonText: {
      fontSize: 16,
      fontWeight: "500",
    },
    navigationButtonPrimaryText: {
      color: theme.colors.primaryText,
    },
    navigationButtonSecondaryText: {
      color: theme.colors.text,
    },
    navigationButtonDisabledText: {
      color: theme.colors.textMuted,
    },

    // Form styles (for future steps)
    formSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 16,
    },
    inputContainer: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.text,
      marginBottom: 8,
    },
    inputRequired: {
      color: theme.colors.error,
    },
    textInput: {
      backgroundColor: theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.text,
      minHeight: 48,
    },
    textInputMultiline: {
      minHeight: 100,
      textAlignVertical: "top",
    },
    textInputError: {
      borderColor: theme.colors.error,
    },
    inputError: {
      fontSize: 12,
      color: theme.colors.error,
      marginTop: 4,
    },

    // Picker styles
    pickerContainer: {
      backgroundColor: theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      minHeight: 48,
      justifyContent: "center",
    },
    pickerButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    pickerButtonText: {
      fontSize: 16,
      color: theme.colors.text,
    },
    pickerPlaceholder: {
      color: theme.colors.textMuted,
    },

    // Switch styles
    switchContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
    },
    switchLabel: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: "500",
    },
    switchLabelContainer: {
      flex: 1,
      marginRight: 16,
    },
    switchDescription: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },

    // Character count
    characterCount: {
      fontSize: 12,
      color: theme.colors.textMuted,
      textAlign: "right",
      marginTop: 4,
    },

    // Form container
    formContainer: {
      flex: 1,
    },

    // Batch size specific
    batchSizeContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    batchSizeInput: {
      flex: 1,
    },
    unitPicker: {
      flexDirection: "row",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden",
    },
    unitButton: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.inputBackground,
    },
    unitButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    unitButtonText: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: "500",
    },
    unitButtonTextActive: {
      color: theme.colors.primaryText,
    },

    // Style picker
    stylePickerContainer: {
      position: "absolute",
      top: 0,
      left: -16,
      right: -16,
      bottom: -16,
      backgroundColor: theme.colors.background,
      zIndex: 1000,
    },
    stylePickerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    stylePickerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
    },
    stylePickerContent: {
      flex: 1,
      paddingHorizontal: 16,
    },
    stylePickerItem: {
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    stylePickerItemRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    stylePickerItemId: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
      width: 50,
      marginRight: 12,
    },
    stylePickerItemText: {
      fontSize: 16,
      color: theme.colors.text,
      flex: 1,
    },
    // Search container for style picker
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginHorizontal: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },

    // Input helpers and info
    inputHelper: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 4,
      fontStyle: "italic",
    },

    // Presets
    presetsContainer: {
      marginTop: 12,
    },
    presetsLabel: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginBottom: 8,
    },
    presetsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    presetButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 6,
    },
    presetButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    presetButtonText: {
      fontSize: 12,
      color: theme.colors.text,
      fontWeight: "500",
    },
    presetButtonTextActive: {
      color: theme.colors.primaryText,
    },

    // Info section
    infoSection: {
      backgroundColor: theme.colors.backgroundSecondary,
      padding: 16,
      borderRadius: 8,
      marginTop: 24,
    },
    infoHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
      gap: 8,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
    },
    infoText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },

    // Section descriptions
    sectionDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 20,
      lineHeight: 20,
    },

    // Ingredients form
    ingredientSection: {
      marginBottom: 24,
    },
    ingredientSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    ingredientSectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
    },
    addIngredientButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 4,
    },
    addIngredientText: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: "500",
    },
    emptyIngredientContainer: {
      padding: 20,
      alignItems: "center",
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 8,
      borderStyle: "dashed",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyIngredientText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: "center",
    },
    ingredientsList: {
      gap: 8,
    },
    ingredientItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
    },
    ingredientInfo: {
      flex: 1,
    },
    ingredientName: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.text,
    },
    ingredientAmount: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    ingredientDetails: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 1,
      fontStyle: "italic",
    },
    ingredientActions: {
      flexDirection: "row",
      gap: 8,
    },
    ingredientEditButton: {
      padding: 6,
      borderRadius: 4,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    ingredientRemoveButton: {
      padding: 6,
      borderRadius: 4,
      backgroundColor: theme.colors.backgroundSecondary,
    },

    // Review form
    reviewSection: {
      marginBottom: 24,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    reviewSectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 12,
    },
    reviewRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingVertical: 6,
    },
    reviewLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: "500",
      flex: 1,
    },
    reviewValue: {
      fontSize: 14,
      color: theme.colors.text,
      flex: 2,
      textAlign: "right",
    },

    // Ingredient type sections in review
    ingredientTypeSection: {
      marginBottom: 16,
    },
    ingredientTypeTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 8,
    },
    ingredientReviewItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    ingredientReviewInfo: {
      flex: 1,
      marginRight: 12,
    },
    ingredientReviewName: {
      fontSize: 13,
      color: theme.colors.text,
      fontWeight: "500",
    },
    ingredientReviewDetails: {
      fontSize: 11,
      color: theme.colors.textMuted,
      fontStyle: "italic",
      marginTop: 2,
    },
    ingredientReviewAmount: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: "500",
    },

    // Metrics display in review
    metricsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 16,
      marginBottom: 12,
    },
    metricItem: {
      alignItems: "center",
      minWidth: 60,
    },
    metricLabel: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontWeight: "500",
      marginBottom: 4,
    },
    metricValue: {
      fontSize: 18,
      color: theme.colors.text,
      fontWeight: "600",
    },
    metricsNote: {
      fontSize: 11,
      color: theme.colors.textMuted,
      fontStyle: "italic",
      textAlign: "center",
    },

    // Loading and error states
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 16,
      textAlign: "center",
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.error,
      marginTop: 16,
      textAlign: "center",
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 8,
      textAlign: "center",
      lineHeight: 20,
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 20,
    },
    retryButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },

    // Additional styles for editRecipe
    cancelButton: {
      padding: 8,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
      flex: 1,
      textAlign: "center",
    },
    placeholder: {
      width: 40,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    saveButtonDisabled: {
      backgroundColor: theme.colors.backgroundSecondary,
      opacity: 0.6,
    },
    saveButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },

    // Progress indicator styles
    progressContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    progressStep: {
      alignItems: "center",
      flex: 1,
    },
    progressDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    progressDotActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    progressDotCompleted: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
    },
    progressDotText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    progressDotTextActive: {
      color: "#fff",
    },
    progressLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    progressLabelActive: {
      color: theme.colors.primary,
      fontWeight: "600",
    },

    // Navigation styles
    navigation: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.colors.backgroundSecondary,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 8,
    },
    backButtonText: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: "500",
    },
    backButtonDisabled: {
      opacity: 0.5,
    },
    backButtonTextDisabled: {
      color: theme.colors.textMuted,
    },
    cancelButtonDisabled: {
      opacity: 0.5,
    },
    cancelButtonTextDisabled: {
      color: theme.colors.textMuted,
    },
    navigationRight: {
      flexDirection: "row",
      alignItems: "center",
    },
    nextButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    nextButtonDisabled: {
      backgroundColor: theme.colors.backgroundSecondary,
      opacity: 0.6,
    },
    nextButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    nextButtonTextDisabled: {
      color: theme.colors.textMuted,
    },

    // Content area
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },

    // BeerXML Import specific styles
    beerxmlLoadingContainer: {
      flexDirection: "column" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      padding: 32,
      gap: 16,
    },
    beerxmlLoadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: "center" as const,
    },
    beerxmlProgressContainer: {
      marginBottom: 24,
    },
    progressText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: 8,
    },
    beerxmlProgressBar: {
      height: 4,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 2,
      overflow: "hidden" as const,
    },
    progressFill: {
      height: "100%",
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    },
    recipeOptionsContainer: {
      gap: 8,
    },
    recipeOption: {
      backgroundColor: theme.colors.backgroundSecondary,
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    selectedRecipeOption: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    recipeOptionName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 4,
    },
    recipeOptionDetails: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    recipePreview: {
      backgroundColor: theme.colors.backgroundSecondary,
      padding: 16,
      borderRadius: 8,
      marginTop: 16,
    },
    previewTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 12,
    },
    previewRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
      gap: 16,
    },
    previewLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: "500",
      flex: 0,
      minWidth: 80,
    },
    previewValue: {
      fontSize: 14,
      color: theme.colors.text,
      flex: 1,
      textAlign: "right",
    },
    ingredientSummary: {
      marginTop: 8,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    ingredientTypeCount: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      backgroundColor: theme.colors.backgroundSecondary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    ingredientCard: {
      backgroundColor: theme.colors.backgroundSecondary,
      padding: 16,
      borderRadius: 8,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    matchingOptions: {
      gap: 12,
    },
    optionsTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 8,
    },
    matchOption: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor: theme.colors.backgroundSecondary,
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 12,
    },
    selectedMatchOption: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    matchOptionContent: {
      flex: 1,
    },
    matchOptionName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 2,
    },
    matchOptionConfidence: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: "500",
    },
    matchOptionReasons: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    matchOptionDetails: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    noMatchContainer: {
      backgroundColor: theme.colors.backgroundSecondary,
      padding: 16,
      borderRadius: 8,
      marginTop: 16,
      alignItems: "center",
    },
    noMatchText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: 8,
    },
    newIngredientName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      textAlign: "center",
    },
    navigationButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 24,
      gap: 16,
    },
    summaryContainer: {
      gap: 16,
    },
    summaryItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    summaryText: {
      flex: 1,
    },
    summaryLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
    },
    recipeDetails: {
      gap: 12,
    },
    detailRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "flex-start" as const,
      gap: 16,
    },
    detailLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: "500" as const,
      minWidth: 100,
    },
    detailValue: {
      fontSize: 14,
      color: theme.colors.text,
      flex: 1,
      textAlign: "right" as const,
    },
    resetButton: {
      padding: 8,
    },

    // Basic BeerXML styles
    section: {
      marginBottom: 24,
    },
    button: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      gap: 8,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    secondaryButton: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600" as const,
    },
    primaryButtonText: {
      color: theme.colors.primaryText,
    },
    secondaryButtonText: {
      color: theme.colors.text,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: "500" as const,
      color: theme.colors.text,
      marginBottom: 8,
    },
    buttonGroup: {
      flexDirection: "row" as const,
      gap: 16,
      marginTop: 24,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 32,
    },
  });

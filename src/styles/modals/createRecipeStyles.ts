import { StyleSheet } from 'react-native';
import { ThemeContextValue } from '@contexts/ThemeContext';

export const createRecipeStyles = (theme: ThemeContextValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    // Header styles
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },

    // Progress bar styles
    progressContainer: {
      paddingHorizontal: 16,
      paddingVertical: 20,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    progressBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    progressStep: {
      alignItems: 'center',
      flex: 1,
    },
    progressCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    progressCircleActive: {
      backgroundColor: theme.colors.primary,
    },
    progressStepText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    progressStepTextActive: {
      color: theme.colors.primaryText,
    },
    progressStepLabel: {
      fontSize: 12,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    progressStepLabelActive: {
      color: theme.colors.text,
      fontWeight: '500',
    },

    // Content styles
    content: {
      flex: 1,
      padding: 16,
    },
    placeholderText: {
      fontSize: 16,
      color: theme.colors.textMuted,
      textAlign: 'center',
      marginTop: 50,
    },

    // Navigation styles
    navigationContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 20,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    navigationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
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
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    navigationButtonDisabled: {
      opacity: 0.5,
    },
    navigationButtonText: {
      fontSize: 16,
      fontWeight: '500',
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
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
    },
    inputContainer: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
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
      textAlignVertical: 'top',
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
      justifyContent: 'center',
    },
    pickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    switchLabel: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: '500',
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
      textAlign: 'right',
      marginTop: 4,
    },

    // Form container
    formContainer: {
      flex: 1,
    },

    // Batch size specific
    batchSizeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    batchSizeInput: {
      flex: 1,
    },
    unitPicker: {
      flexDirection: 'row',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
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
      fontWeight: '500',
    },
    unitButtonTextActive: {
      color: theme.colors.primaryText,
    },

    // Style picker
    stylePickerContainer: {
      position: 'absolute',
      top: 0,
      left: -16,
      right: -16,
      bottom: -16,
      backgroundColor: theme.colors.background,
      zIndex: 1000,
    },
    stylePickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    stylePickerTitle: {
      fontSize: 18,
      fontWeight: '600',
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
    stylePickerItemText: {
      fontSize: 16,
      color: theme.colors.text,
    },

    // Input helpers and info
    inputHelper: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 4,
      fontStyle: 'italic',
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
      flexDirection: 'row',
      flexWrap: 'wrap',
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
      fontWeight: '500',
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
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: '600',
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    ingredientSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    addIngredientButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 4,
    },
    addIngredientText: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    emptyIngredientContainer: {
      padding: 20,
      alignItems: 'center',
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 8,
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyIngredientText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    ingredientsList: {
      gap: 8,
    },
    ingredientItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
      fontWeight: '500',
      color: theme.colors.text,
    },
    ingredientAmount: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    ingredientRemoveButton: {
      padding: 4,
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
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    reviewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 6,
    },
    reviewLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '500',
      flex: 1,
    },
    reviewValue: {
      fontSize: 14,
      color: theme.colors.text,
      flex: 2,
      textAlign: 'right',
    },

    // Ingredient type sections in review
    ingredientTypeSection: {
      marginBottom: 16,
    },
    ingredientTypeTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    ingredientReviewItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 12,
    },
    ingredientReviewName: {
      fontSize: 13,
      color: theme.colors.text,
      flex: 1,
    },
    ingredientReviewAmount: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },

    // Metrics display in review
    metricsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      marginBottom: 12,
    },
    metricItem: {
      alignItems: 'center',
      minWidth: 60,
    },
    metricLabel: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontWeight: '500',
      marginBottom: 4,
    },
    metricValue: {
      fontSize: 18,
      color: theme.colors.text,
      fontWeight: '600',
    },
    metricsNote: {
      fontSize: 11,
      color: theme.colors.textMuted,
      fontStyle: 'italic',
      textAlign: 'center',
    },
  });
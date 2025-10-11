/**
 * AI Recipe Analysis Component Styles
 *
 * Theme-aware styling for AI analysis button, results modal, and related UI components.
 * Uses existing color system and follows established mobile design patterns.
 *
 * @module styles/ai/aiStyles
 */

import { StyleSheet } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";
import { withAlpha } from "@utils/colorUtils";

export const createAIStyles = (theme: ThemeContextValue) =>
  StyleSheet.create({
    // AI Analysis Button Styles
    analysisButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      minHeight: 48, // Touch target
      marginVertical: 8,
    },
    analysisButtonDisabled: {
      backgroundColor: theme.colors.textMuted,
      opacity: 0.6,
    },
    analysisButtonText: {
      color: theme.colors.primaryText,
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
    },
    analysisButtonIcon: {
      marginRight: 4,
    },

    // Icon Button Styles (compact variant)
    iconButton: {
      padding: 8,
      minHeight: 48,
      minWidth: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    iconButtonDisabled: {
      opacity: 0.5,
    },

    // Results Modal Container
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: 20,
      maxHeight: "80%",
      width: "90%",
      maxWidth: 600,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.text,
      flex: 1,
    },
    closeButton: {
      padding: 8,
      minHeight: 48, // Touch target
      minWidth: 48,
      alignItems: "center",
      justifyContent: "center",
    },

    // Optimization Results Summary
    summaryContainer: {
      backgroundColor: withAlpha(theme.colors.primary, 0.1),
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: withAlpha(theme.colors.primary, 0.3),
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 8,
    },
    summaryText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    iterationsText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 4,
      fontStyle: "italic",
    },

    // Metrics Comparison Section
    metricsContainer: {
      marginBottom: 16,
    },
    metricsSectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 12,
    },
    metricRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: withAlpha(theme.colors.border, 0.5),
    },
    metricRowLast: {
      borderBottomWidth: 0,
    },
    metricName: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.text,
      width: 60,
    },
    metricValues: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginLeft: 12,
    },
    metricOriginal: {
      fontSize: 14,
      color: theme.colors.textMuted,
      flex: 1,
      textAlign: "center",
    },
    metricArrow: {
      fontSize: 14,
      color: theme.colors.textMuted,
      marginHorizontal: 8,
    },
    metricOptimized: {
      fontSize: 14,
      fontWeight: "600",
      flex: 1,
      textAlign: "center",
    },
    metricImproved: {
      color: theme.colors.success,
    },
    metricUnchanged: {
      color: theme.colors.textSecondary,
    },
    metricInRange: {
      backgroundColor: withAlpha(theme.colors.success, 0.15),
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },

    // Recipe Changes Section
    changesContainer: {
      marginBottom: 16,
    },
    changesSectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 12,
    },
    changeGroupTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginTop: 12,
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    changeItem: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      borderLeftWidth: 4,
    },
    changeItemModification: {
      borderLeftColor: theme.colors.warning,
    },
    changeItemAddition: {
      borderLeftColor: theme.colors.success,
    },
    changeItemRemoval: {
      borderLeftColor: theme.colors.error,
    },
    changeItemParameter: {
      borderLeftColor: theme.colors.info,
    },
    changeDescription: {
      fontSize: 14,
      color: theme.colors.text,
      marginBottom: 4,
    },
    changeReason: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontStyle: "italic",
      lineHeight: 16,
    },

    // Action Buttons
    actionsContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 16,
      gap: 12,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      minHeight: 48, // Touch target
    },
    applyButton: {
      backgroundColor: theme.colors.success,
    },
    dismissButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
    },
    applyButtonText: {
      color: theme.colors.primaryText,
    },
    dismissButtonText: {
      color: theme.colors.text,
    },

    // Loading State
    loadingContainer: {
      padding: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 16,
      textAlign: "center",
    },
    loadingSubtext: {
      fontSize: 14,
      color: theme.colors.textMuted,
      marginTop: 8,
      textAlign: "center",
    },

    // Error State
    errorContainer: {
      padding: 20,
      backgroundColor: withAlpha(theme.colors.error, 0.1),
      borderRadius: 12,
      borderWidth: 1,
      borderColor: withAlpha(theme.colors.error, 0.3),
      marginBottom: 16,
    },
    errorTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.error,
      marginBottom: 8,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginTop: 12,
      alignItems: "center",
      minHeight: 48, // Touch target
    },
    retryButtonText: {
      color: theme.colors.primaryText,
      fontSize: 14,
      fontWeight: "600",
    },

    // Empty State
    emptyStateContainer: {
      padding: 40,
      alignItems: "center",
    },
    emptyStateIcon: {
      marginBottom: 16,
      opacity: 0.5,
    },
    emptyStateTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
    },

    // Badge Components
    badge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: "flex-start",
    },
    badgeSuccess: {
      backgroundColor: withAlpha(theme.colors.success, 0.15),
    },
    badgeWarning: {
      backgroundColor: withAlpha(theme.colors.warning, 0.15),
    },
    badgeError: {
      backgroundColor: withAlpha(theme.colors.error, 0.15),
    },
    badgeInfo: {
      backgroundColor: withAlpha(theme.colors.info, 0.15),
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "600",
    },
    badgeTextSuccess: {
      color: theme.colors.success,
    },
    badgeTextWarning: {
      color: theme.colors.warning,
    },
    badgeTextError: {
      color: theme.colors.error,
    },
    badgeTextInfo: {
      color: theme.colors.info,
    },

    // Divider
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 16,
    },

    // ScrollView Content
    scrollContent: {
      paddingBottom: 20,
    },

    // Online Indicator
    onlineRequired: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: withAlpha(theme.colors.info, 0.1),
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginBottom: 12,
    },
    onlineRequiredText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginLeft: 8,
      fontStyle: "italic",
    },
  });

export type AIStyles = ReturnType<typeof createAIStyles>;

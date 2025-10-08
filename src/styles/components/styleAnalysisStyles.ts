/**
 * Styles for StyleAnalysis Component
 *
 * Theme-aware styling for beer style adherence analysis display.
 * Supports both compact and detailed variants for mobile optimization.
 */

import { StyleSheet } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";

export const createStyleAnalysisStyles = (theme: ThemeContextValue) =>
  StyleSheet.create({
    // Container styles
    container: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 16,
      marginVertical: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    compactContainer: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 12,
      marginVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    // Header styles
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    compactHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerLeft: {
      flex: 1,
    },
    headerRight: {
      marginLeft: 12,
    },

    // Title styles
    title: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 4,
    },
    compactTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
    },
    styleName: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },

    // Match percentage styles
    matchBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      minWidth: 80,
      justifyContent: "center",
    },
    matchBadgeExcellent: {
      backgroundColor: `${theme.colors.success}20`,
    },
    matchBadgeGood: {
      backgroundColor: `${theme.colors.warning}20`,
    },
    matchBadgeNeeds: {
      backgroundColor: `${theme.colors.error}20`,
    },
    matchPercentage: {
      fontSize: 16,
      fontWeight: "700",
    },
    matchPercentageCompact: {
      fontSize: 14,
      fontWeight: "700",
    },
    matchPercentageExcellent: {
      color: theme.colors.success,
    },
    matchPercentageGood: {
      color: theme.colors.warning,
    },
    matchPercentageNeeds: {
      color: theme.colors.error,
    },
    matchLabel: {
      fontSize: 12,
      fontWeight: "500",
      marginTop: 2,
    },
    matchLabelExcellent: {
      color: theme.colors.success,
    },
    matchLabelGood: {
      color: theme.colors.warning,
    },
    matchLabelNeeds: {
      color: theme.colors.error,
    },

    // Progress bar
    progressBarContainer: {
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      overflow: "hidden",
      marginTop: 8,
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 4,
    },
    progressBarExcellent: {
      backgroundColor: theme.colors.success,
    },
    progressBarGood: {
      backgroundColor: theme.colors.warning,
    },
    progressBarNeeds: {
      backgroundColor: theme.colors.error,
    },

    // Spec breakdown styles - 3 column table layout
    specsContainer: {
      marginTop: 16,
    },
    specRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: `${theme.colors.border}50`,
    },
    specRowLast: {
      borderBottomWidth: 0,
    },

    // Column 1: Icon + Metric Name (fixed width)
    specColumn1: {
      flexDirection: "row",
      alignItems: "center",
      width: 100,
    },
    specIcon: {
      marginRight: 8,
    },
    specName: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
    },

    // Column 2: Current Value (flex, centered)
    specColumn2: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 8,
    },
    specCurrentValue: {
      fontSize: 15,
      fontWeight: "600",
    },
    specValueMatch: {
      color: theme.colors.success,
    },
    specValueNoMatch: {
      color: theme.colors.error,
    },

    // Column 3: Target Range (flex, right-aligned)
    specColumn3: {
      flex: 1,
      alignItems: "flex-end",
    },
    specRange: {
      fontSize: 13,
      color: theme.colors.textMuted,
    },

    // Expand/collapse button
    expandButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      paddingVertical: 8,
      minHeight: 48, // Touch target
    },
    expandButtonText: {
      fontSize: 14,
      color: theme.colors.primary,
      marginRight: 4,
      fontWeight: "500",
    },

    // Empty states
    emptyStateContainer: {
      padding: 24,
      alignItems: "center",
    },
    emptyStateIcon: {
      marginBottom: 12,
      opacity: 0.5,
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: "center",
    },
    emptyStateHelpText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      textAlign: "center",
      marginTop: 8,
      fontStyle: "italic",
    },

    // Loading state
    loadingContainer: {
      padding: 24,
      alignItems: "center",
    },
    loadingText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      marginTop: 8,
    },

    // Error state
    errorContainer: {
      padding: 16,
      backgroundColor: `${theme.colors.error}10`,
      borderRadius: 8,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.error,
      textAlign: "center",
    },

    // Divider
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 12,
    },

    // Summary row (for compact view)
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    summaryText: {
      fontSize: 13,
      color: theme.colors.textMuted,
      marginTop: 4,
    },
  });

export type StyleAnalysisStyles = ReturnType<typeof createStyleAnalysisStyles>;

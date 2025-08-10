import { StyleSheet } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";

export const brewingMetricsStyles = (theme: ThemeContextValue, compact: boolean = false) =>
  StyleSheet.create({
    // Main container for metrics
    container: {
      marginVertical: compact ? 8 : 16,
    },
    
    // Grid layout for metric cards
    metricsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: compact ? 8 : 12,
      justifyContent: "flex-start",
    },
    
    // Individual metric card
    metricCard: {
      backgroundColor: theme.colors.inputBackground,
      borderRadius: compact ? 6 : 8,
      padding: compact ? 12 : 16,
      alignItems: "center",
      flexBasis: "30%",
      flexGrow: 0,
      flexShrink: 1,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    
    // Metric label styling
    metricLabel: {
      fontSize: compact ? 10 : 12,
      color: theme.colors.textSecondary,
      fontWeight: "500",
      marginBottom: compact ? 2 : 4,
      textAlign: "center",
    },
    
    // Metric value styling
    metricValue: {
      fontSize: compact ? 16 : 18,
      fontWeight: "bold",
      color: theme.colors.text,
      textAlign: "center",
    },
    
    // Loading skeleton for metric values
    loadingSkeleton: {
      width: compact ? 40 : 50,
      height: compact ? 16 : 18,
      backgroundColor: theme.colors.textMuted,
      opacity: 0.2,
      borderRadius: 4,
    },
    
    // SRM color indicator (for beer color visualization)
    srmColorIndicator: {
      width: compact ? 20 : 24,
      height: compact ? 20 : 24,
      borderRadius: compact ? 10 : 12,
      marginTop: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    
    // Error state styling
    errorContainer: {
      backgroundColor: theme.colors.inputBackground,
      borderRadius: compact ? 6 : 8,
      padding: compact ? 12 : 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    
    errorText: {
      fontSize: compact ? 12 : 14,
      color: theme.colors.error,
      textAlign: "center",
      marginBottom: 8,
    },
    
    retryButton: {
      backgroundColor: theme.colors.error,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
    },
    
    retryButtonText: {
      color: theme.colors.background,
      fontSize: 12,
      fontWeight: "600",
    },
    
    // Empty state when no metrics available
    emptyState: {
      backgroundColor: theme.colors.inputBackground,
      borderRadius: compact ? 6 : 8,
      padding: compact ? 16 : 20,
      alignItems: "center",
      opacity: 0.7,
    },
    
    emptyStateText: {
      fontSize: compact ? 12 : 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      fontStyle: "italic",
    },
    
    // Section title for metrics (when used independently)
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: compact ? 12 : 16,
    },
  });
import { StyleSheet } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";

export const viewBrewSessionStyles = (theme: ThemeContextValue) =>
  StyleSheet.create({
    // Container and Layout
    container: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 32,
    },

    // Header and Navigation
    header: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingTop: 20, // Account for status bar
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      zIndex: 1,
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      textAlign: "center",
    },

    // Title and Status
    titleContainer: {
      backgroundColor: theme.colors.background,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 12,
      padding: 20,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 12,
    },
    statusBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    statusText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
    },

    // Metadata
    metadataContainer: {
      backgroundColor: theme.colors.background,
      marginHorizontal: 16,
      marginTop: 8,
      borderRadius: 12,
      padding: 16,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    metadataText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },

    // Metrics Grid
    metricsContainer: {
      backgroundColor: theme.colors.background,
      marginHorizontal: 16,
      marginTop: 8,
      borderRadius: 12,
      padding: 16,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    metricCard: {
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 8,
      padding: 16,
      alignItems: "center",
      // Use flexBasis for percentage sizing
      flexBasis: "30%",
      flex: 1,
    },
    metricLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: "500",
      marginBottom: 4,
      textAlign: "center",
    },
    metricValue: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
      textAlign: "center",
    },

    // Details Sections
    detailsContainer: {
      backgroundColor: theme.colors.background,
      marginHorizontal: 16,
      marginTop: 8,
      borderRadius: 12,
      padding: 16,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    detailsTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 12,
    },
    detailsText: {
      fontSize: 15,
      color: theme.colors.text,
      lineHeight: 22,
    },

    // Rating System
    ratingContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    ratingStar: {
      marginRight: 4,
    },
    ratingText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginLeft: 8,
    },

    // Loading State
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 16,
    },

    // Error State
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
      marginTop: 16,
      marginBottom: 8,
      textAlign: "center",
    },
    errorText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 24,
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: theme.colors.primaryText,
      fontSize: 16,
      fontWeight: "600",
    },
  });

import { StyleSheet } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";

export const viewRecipeStyles = (theme: ThemeContextValue) =>
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
      paddingBottom: 100, // Space for FAB
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
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
    },
    actionButton: {
      padding: 8,
      marginLeft: 8,
    },

    // Content Sections
    section: {
      backgroundColor: theme.colors.background,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 12,
      padding: 16,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 16,
    },

    // Recipe Card
    recipeCard: {
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
    recipeName: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 8,
    },
    recipeStyle: {
      fontSize: 16,
      color: theme.colors.primary,
      fontWeight: "600",
      marginBottom: 12,
    },
    recipeDescription: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      lineHeight: 22,
      marginBottom: 16,
    },

    // Metadata
    metadataContainer: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
      paddingTop: 16,
      gap: 8,
    },
    metadataItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    metadataText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },

    // Metrics Grid
    metricsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      justifyContent: "space-between",
    },
    metricCard: {
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 8,
      padding: 16,
      alignItems: "center",
      minWidth: "30%",
      flex: 1,
    },
    metricLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: "500",
      marginBottom: 4,
    },
    metricValue: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
    },

    // Details
    detailsContainer: {
      gap: 12,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 4,
    },
    detailLabel: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      fontWeight: "500",
    },
    detailValue: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: "600",
    },

    // Notes
    notesContainer: {
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 8,
      padding: 16,
    },
    notesText: {
      fontSize: 15,
      color: theme.colors.text,
      lineHeight: 22,
    },

    // Placeholder sections
    ingredientNote: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 8,
      padding: 16,
      gap: 12,
    },
    ingredientNoteText: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontStyle: "italic",
    },

    // Ingredients styling
    ingredientGroup: {
      marginBottom: 20,
    },
    ingredientGroupHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
      gap: 8,
    },
    ingredientGroupTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
    },
    ingredientItem: {
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    ingredientName: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 4,
    },
    ingredientAmount: {
      fontSize: 14,
      color: theme.colors.textSecondary,
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

    // Floating Action Button
    fab: {
      position: "absolute",
      bottom: 24,
      right: 24,
      backgroundColor: theme.colors.primary,
      borderRadius: 28,
      paddingHorizontal: 20,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    fabText: {
      color: theme.colors.primaryText,
      fontSize: 16,
      fontWeight: "600",
    },

    // Spacing
    bottomSpacing: {
      height: 32,
    },
  });

/**
 * Recipe Selector Component Styles
 *
 * Styles for the boil timer recipe selection modal.
 */

import { StyleSheet } from "react-native";
import { ThemeColors } from "@contexts/ThemeContext";

export const recipeSelectorStyles = (_colors: ThemeColors) =>
  StyleSheet.create({
    selector: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginVertical: 8,
    },
    selectorContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    selectorText: {
      marginLeft: 12,
      flex: 1,
    },
    selectedName: {
      fontSize: 16,
      fontWeight: "600",
    },
    selectedDetails: {
      fontSize: 14,
      marginTop: 2,
    },
    placeholderText: {
      fontSize: 16,
      fontWeight: "500",
    },
    placeholderSubtext: {
      fontSize: 14,
      marginTop: 2,
    },
    modalContainer: {
      flex: 1,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottomWidth: 1,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      margin: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 16,
    },
    manualOption: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
    },
    manualOptionText: {
      flex: 1,
      marginLeft: 12,
    },
    manualTitle: {
      fontSize: 16,
      fontWeight: "600",
    },
    manualSubtitle: {
      fontSize: 14,
      marginTop: 2,
    },
    recipeList: {
      flex: 1,
    },
    recipeListContent: {
      padding: 16,
    },
    recipeItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 12,
    },
    recipeItemContent: {
      flex: 1,
    },
    recipeName: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 4,
    },
    recipeStyle: {
      fontSize: 14,
      marginBottom: 8,
    },
    recipeMetrics: {
      flexDirection: "row",
      alignItems: "center",
    },
    boilTime: {
      fontSize: 14,
      fontWeight: "500",
      marginRight: 16,
    },
    hopCount: {
      fontSize: 14,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    loadingText: {
      fontSize: 16,
      marginTop: 16,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    errorText: {
      fontSize: 18,
      fontWeight: "600",
      marginTop: 16,
      textAlign: "center",
    },
    errorSubtext: {
      fontSize: 14,
      marginTop: 8,
      textAlign: "center",
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: "600",
      marginTop: 16,
      textAlign: "center",
    },
    emptySubtext: {
      fontSize: 14,
      marginTop: 8,
      textAlign: "center",
    },
  });

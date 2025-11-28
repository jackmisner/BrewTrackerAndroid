/**
 * Fermentation Data Component Styles
 *
 * Styles for the fermentation entries table component.
 */

import { StyleSheet } from "react-native";
import { ThemeColors } from "@contexts/ThemeContext";

export const fermentationDataStyles = (_colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      borderRadius: 8,
      overflow: "hidden",
      marginTop: 8,
    },
    list: {
      flexGrow: 0,
    },
    headerRow: {
      flexDirection: "row",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(0,0,0,0.1)",
    },
    headerCell: {
      flex: 1,
      alignItems: "center",
    },
    headerText: {
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    entryRow: {
      flexDirection: "row",
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(0,0,0,0.05)",
      minHeight: 48,
    },
    entryCell: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    entryText: {
      fontSize: 14,
      textAlign: "center",
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 32,
      paddingHorizontal: 16,
    },
    emptyStateText: {
      fontSize: 16,
      fontWeight: "500",
      marginTop: 12,
      textAlign: "center",
    },
    emptyStateSubtext: {
      fontSize: 14,
      marginTop: 4,
      textAlign: "center",
      opacity: 0.7,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginTop: 8,
      borderRadius: 8,
      minHeight: 48,
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 8,
    },
  });

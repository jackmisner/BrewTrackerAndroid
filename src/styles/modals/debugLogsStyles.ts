/**
 * Debug Logs Modal Styles
 *
 * Styles for the production debug logs screen that allows viewing
 * and sharing redacted logs and storage data.
 */

import { StyleSheet } from "react-native";
import { ThemeColors } from "@contexts/ThemeContext";

export const debugLogsStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    headerActions: {
      flexDirection: "row",
      gap: 12,
    },
    iconButton: {
      padding: 8,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    warningBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 12,
      borderLeftWidth: 3,
      borderLeftColor: colors.success,
    },
    warningIcon: {
      marginRight: 8,
    },
    warningText: {
      flex: 1,
      fontSize: 12,
      color: colors.success,
      fontWeight: "600",
    },
    logsContainer: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      padding: 12,
    },
    logText: {
      fontFamily: "monospace",
      fontSize: 10,
      color: colors.textSecondary,
      lineHeight: 14,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 12,
      color: colors.textSecondary,
    },
    tabContainer: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabActive: {
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
  });

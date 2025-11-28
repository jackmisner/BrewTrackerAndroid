/**
 * DevIdDebugger Component Styles
 *
 * Styles for the development-only ID debugger component.
 */

import { StyleSheet } from "react-native";
import { ThemeColors } from "@contexts/ThemeContext";

export const devIdDebuggerStyles = (_colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      margin: 8,
      padding: 12,
      borderRadius: 8,
      borderWidth: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    label: {
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    statusText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#FFF",
    },
    idRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    idLabel: {
      fontSize: 11,
      fontWeight: "600",
    },
    idValue: {
      flex: 1,
      fontSize: 11,
      fontFamily: "monospace",
      fontWeight: "500",
    },
    metadata: {
      gap: 4,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: "rgba(0,0,0,0.1)",
    },
    metadataText: {
      fontSize: 10,
      fontWeight: "500",
    },
    syncRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    syncBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      borderWidth: 1,
    },
    syncText: {
      fontSize: 9,
      fontWeight: "700",
    },
  });

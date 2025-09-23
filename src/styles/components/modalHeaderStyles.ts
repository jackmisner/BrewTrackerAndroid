import { StyleSheet } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";

export const createModalHeaderStyles = (theme: ThemeContextValue) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 22,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      textAlign: "center",
      marginHorizontal: 12,
    },
  });

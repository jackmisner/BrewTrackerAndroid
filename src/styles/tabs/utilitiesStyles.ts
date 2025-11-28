/**
 * Utilities Tab Styles
 *
 * Styles for the brewing calculators grid screen.
 */

import { StyleSheet } from "react-native";
import { ThemeColors } from "@contexts/ThemeContext";

export const utilitiesStyles = (_colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      padding: 20,
      paddingBottom: 10,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 16,
      lineHeight: 22,
    },
    calculatorGrid: {
      padding: 10,
    },
    calculatorCard: {
      margin: 10,
      borderRadius: 12,
      borderWidth: 1,
      overflow: "hidden",
    },
    calculatorContent: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      minHeight: 72,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    textContainer: {
      flex: 1,
      marginRight: 12,
    },
    calculatorTitle: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 4,
    },
    calculatorDescription: {
      fontSize: 14,
      lineHeight: 18,
    },
  });

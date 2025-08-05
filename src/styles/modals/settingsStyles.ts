import { StyleSheet } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";

export const settingsStyles = (theme: ThemeContextValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    scrollView: {
      flex: 1,
    },

    // Header
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
    headerSpacer: {
      width: 40, // Same width as back button for centering
    },

    // Sections
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

    // Menu Items
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    menuContent: {
      flex: 1,
      marginLeft: 12,
    },
    menuText: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: "500",
    },
    menuSubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },

    // Theme Selection
    settingGroup: {
      marginBottom: 8,
    },
    groupTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 12,
    },
    groupContent: {
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 8,
      padding: 4,
    },
    optionItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 6,
      marginBottom: 2,
    },
    optionContent: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.colors.text,
    },
    optionSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    radioButton: {
      marginLeft: 12,
    },

    // Spacing
    bottomSpacing: {
      height: 32,
    },
  });

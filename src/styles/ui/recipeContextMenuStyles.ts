import { StyleSheet } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";

export const recipeContextMenuStyles = (theme: ThemeContextValue) =>
  StyleSheet.create({
    // Modal overlay
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.4)",
      justifyContent: "center",
      alignItems: "center",
    },

    // Menu container
    menuContainer: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12,
      minWidth: 200,
      maxWidth: 280,
      margin: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 8,
    },

    // Menu header
    menuHeader: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    menuTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 2,
    },
    menuSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },

    // Actions list
    actionsList: {
      paddingVertical: 8,
    },
    actionItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 48, // Accessible touch target
      gap: 12,
    },
    actionItemDisabled: {
      opacity: 0.5,
    },
    actionItemDestructive: {
      // No special styling here, color is handled by icon and text
    },
    actionText: {
      fontSize: 16,
      color: theme.colors.text,
      flex: 1,
    },
    actionTextDisabled: {
      color: theme.colors.textMuted,
    },
    actionTextDestructive: {
      color: theme.colors.error,
    },

    // Cancel button
    cancelButton: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
      paddingHorizontal: 16,
      paddingVertical: 16,
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    cancelButtonText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      fontWeight: "500",
    },

    // Press states (handled by TouchableOpacity activeOpacity)
    actionItemPressed: {
      backgroundColor: theme.colors.background,
    },
  });

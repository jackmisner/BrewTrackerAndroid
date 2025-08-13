import { StyleSheet } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";

export const profileStyles = (theme: ThemeContextValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    header: {
      backgroundColor: theme.colors.background,
      alignItems: "center",
      padding: 24,
      marginBottom: 16,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.borderLight,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    username: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 4,
    },
    email: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    verificationBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.isDark ? "#2d1b0f" : "#fff3e0", // Warning background color
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginTop: 8,
      gap: 4,
    },
    verificationText: {
      fontSize: 12,
      color: theme.colors.warning,
      fontWeight: "500",
    },
    section: {
      backgroundColor: theme.colors.background,
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 12,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    menuText: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
      marginLeft: 12,
    },
    logoutText: {
      color: theme.colors.error,
    },
    donateIcon: {
      width: 24,
      height: 24,
    },
    footer: {
      alignItems: "center",
      padding: 24,
      marginTop: 16,
    },
    version: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    copyright: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
  });

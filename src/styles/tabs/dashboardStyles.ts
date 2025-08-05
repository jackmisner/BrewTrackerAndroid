import { StyleSheet } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";

export const dashboardStyles = (theme: ThemeContextValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.backgroundSecondary,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 16,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.backgroundSecondary,
      padding: 32,
    },
    errorText: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.error,
      marginTop: 16,
      textAlign: "center",
    },
    errorSubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 8,
      textAlign: "center",
    },
    header: {
      backgroundColor: theme.colors.background,
      padding: 20,
      marginBottom: 16,
    },
    greeting: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    statsContainer: {
      flexDirection: "row",
      paddingHorizontal: 16,
      marginBottom: 16,
      gap: 8,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 16,
      borderRadius: 12,
      alignItems: "center",
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    statNumber: {
      fontSize: 28,
      fontWeight: "bold",
      color: theme.colors.text,
      marginTop: 8,
    },
    statLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    section: {
      backgroundColor: theme.colors.background,
      marginHorizontal: 16,
      marginBottom: 16,
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
    actionCard: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
      marginBottom: 12,
    },
    actionContent: {
      flex: 1,
      marginLeft: 12,
    },
    actionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
    },
    actionSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    horizontalList: {
      flexDirection: "row",
      paddingHorizontal: 0,
      gap: 12,
    },
    verticalList: {
      gap: 12,
    },
    recentCard: {
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    recentHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
      gap: 8,
    },
    recentTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      flex: 1,
    },
    recentSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    recentDate: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 32,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 12,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textMuted,
      marginTop: 4,
    },
    versionFooter: {
      alignItems: "center",
      paddingVertical: 16,
      marginTop: 8,
    },
    versionText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontWeight: "500",
    },
  });

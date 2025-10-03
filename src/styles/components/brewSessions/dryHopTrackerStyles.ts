import { StyleSheet } from "react-native";

export const dryHopTrackerStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
      gap: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.primaryText,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 32,
      gap: 12,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.colors.textSecondary,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      paddingHorizontal: 24,
    },
    listContainer: {
      gap: 16,
    },
    dryHopItem: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 16,
      gap: 12,
    },
    hopInfo: {
      gap: 4,
    },
    hopName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.primaryText,
    },
    hopDetails: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    statusContainer: {
      gap: 8,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 6,
    },
    statusIcon: {
      marginRight: 2,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "600",
    },
    timingInfo: {
      gap: 2,
    },
    timingText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    daysText: {
      fontWeight: "600",
      color: theme.colors.primaryText,
    },
    actionContainer: {
      marginTop: 4,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      gap: 8,
      minHeight: 48, // 48dp touch target
    },
    addButton: {
      backgroundColor: theme.colors.success,
    },
    removeButton: {
      backgroundColor: theme.colors.warning,
    },
    actionButtonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "600",
    },
    completeContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
    },
    completeText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.success,
    },
  });

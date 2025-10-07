/**
 * Help & Support Screen Styles
 *
 * Styles for the comprehensive help and support screen including
 * FAQ sections, user guides, and external resource links.
 */

import { StyleSheet, StatusBar } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";

export const helpAndSupportStyles = (theme: ThemeContextValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    // Header Styles
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: (StatusBar.currentHeight ?? 0) + 16,
      paddingBottom: 16,
      backgroundColor: theme.colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      elevation: 2,
      shadowColor: theme.colors.shadow || "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    backButton: {
      padding: 8,
      minWidth: 48,
      minHeight: 48,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.colors.text,
    },
    headerSpacer: {
      width: 48,
    },

    // ScrollView
    scrollView: {
      flex: 1,
    },

    // Section
    section: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 12,
    },

    // Card Styles
    card: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },

    // Action Items (Quick Actions)
    actionItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
      minHeight: 48,
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      justifyContent: "center",
      alignItems: "center",
    },
    actionContent: {
      flex: 1,
    },
    actionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 2,
    },
    actionSubtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },

    // Divider
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 8,
    },

    // Guide Section
    guideSection: {
      paddingVertical: 8,
    },
    iconHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 8,
    },
    guideTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
    },
    guideText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },

    // Category Filter
    categoryScroll: {
      marginBottom: 12,
    },
    categoryContainer: {
      gap: 8,
      paddingRight: 16,
    },
    categoryButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 36,
      justifyContent: "center",
      alignItems: "center",
    },
    categoryButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    categoryButtonText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.text,
    },
    categoryButtonTextActive: {
      color: theme.colors.primaryText || "#fff",
    },

    // FAQ Items
    faqItem: {
      paddingVertical: 8,
    },
    faqQuestion: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      minHeight: 48,
    },
    faqQuestionText: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.text,
      lineHeight: 20,
    },
    faqAnswer: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
      marginTop: 8,
      paddingRight: 24,
    },

    // Resource Items
    resourceItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
      minHeight: 48,
    },
    resourceContent: {
      flex: 1,
    },
    resourceTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 2,
    },
    resourceSubtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },

    // Bottom Spacing
    bottomSpacing: {
      height: 32,
    },
  });

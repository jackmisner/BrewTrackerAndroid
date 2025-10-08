/**
 * About Screen Styles
 *
 * Styles for the About screen displaying developer information,
 * project story, and contact details. Uses a card-based layout
 * with sections, icons, and lists.
 */

import { StyleSheet, StatusBar } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";
import { withAlpha } from "@/src/utils/colorUtils";

export const aboutStyles = (theme: ThemeContextValue) =>
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

    // Card Styles
    card: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12,
      padding: 16,
      shadowColor: theme.colors.shadow || "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 12,
    },
    highlightCard: {
      backgroundColor: withAlpha(theme.colors.primary, 0.08),
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    highlightText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.primary,
      textAlign: "center",
    },

    // Content Section
    contentSection: {
      marginTop: 8,
    },
    iconHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.colors.text,
    },
    bodyText: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.text,
      marginBottom: 12,
    },

    // Bullet List
    bulletList: {
      marginVertical: 8,
    },
    bulletItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 10,
    },
    bulletText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.text,
    },

    // Link List
    linkList: {
      marginTop: 12,
    },
    linkItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.background,
      marginBottom: 8,
      minHeight: 48,
    },
    linkText: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.primary,
      fontWeight: "500",
    },

    // Photo Section
    photoSection: {
      marginTop: 16,
      marginBottom: 8,
    },
    photo: {
      width: "100%",
      height: 200,
      borderRadius: 12,
      marginBottom: 8,
    },
    photoCaption: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.textSecondary,
      fontStyle: "italic",
      textAlign: "center",
    },

    // Bottom Spacing
    bottomSpacing: {
      height: 32,
    },
  });

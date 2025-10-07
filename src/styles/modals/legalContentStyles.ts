/**
 * Legal Content Styles
 *
 * Shared styles for legal content screens (Privacy Policy, Terms of Service).
 * Provides consistent formatting for long-form legal documents with sections,
 * headers, lists, and callout boxes.
 */

import { StyleSheet, StatusBar } from "react-native";
import { ThemeContextValue } from "@contexts/ThemeContext";
import { withAlpha } from "@/src/utils/colorUtils";

export const legalContentStyles = (theme: ThemeContextValue) =>
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

    // Intro Section
    introSection: {
      padding: 16,
      backgroundColor: theme.colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    introTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 8,
    },
    introSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    lastUpdated: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontStyle: "italic",
    },

    // Section
    section: {
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 12,
    },

    // Card Styles
    card: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },

    // Subsection
    subsectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginTop: 12,
      marginBottom: 8,
    },

    // Body Text
    bodyText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.text,
      marginBottom: 12,
    },

    // Lists
    bulletList: {
      marginVertical: 8,
    },
    bulletItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginBottom: 8,
      paddingLeft: 8,
    },
    bulletDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.primary,
      marginTop: 7,
    },
    bulletText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.text,
    },
    bulletStrong: {
      fontWeight: "600",
    },

    // Callout / Warning Box
    calloutBox: {
      backgroundColor: withAlpha(theme.colors.warning, 0.08),
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.warning,
      borderRadius: 8,
      padding: 12,
      marginVertical: 12,
    },
    calloutTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.warning,
      marginBottom: 8,
    },
    calloutText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.text,
      marginBottom: 8,
    },

    // Error/Critical Box
    criticalBox: {
      backgroundColor: withAlpha(theme.colors.error, 0.08),
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.error,
      borderRadius: 8,
      padding: 12,
      marginVertical: 12,
    },
    criticalTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.error,
      marginBottom: 8,
    },

    // Info Box
    infoBox: {
      backgroundColor: withAlpha(theme.colors.primary, 0.08),
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
      borderRadius: 8,
      padding: 12,
      marginVertical: 12,
    },
    infoTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.primary,
      marginBottom: 8,
    },
    infoText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.text,
    },

    // Links
    linkText: {
      color: theme.colors.primary,
      textDecorationLine: "underline",
    },

    // Bottom Spacing
    bottomSpacing: {
      height: 32,
    },
  });

/**
 * DevIdDebugger Component
 *
 * __DEV__ gated component that displays ID information for debugging purposes.
 * Shows whether an object is using a temp ID or server ID, and provides
 * visual indicators for sync status.
 *
 * Only renders in development mode (__DEV__ === true)
 */

import React from "react";
import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";
import { isTempId as isTempIdUtil } from "@/src/utils/recipeUtils";
import { devIdDebuggerStyles } from "@styles/components/devIdDebuggerStyles";

interface DevIdDebuggerProps {
  /**
   * The ID to display (can be temp or server ID)
   */
  id: string;
  /**
   * Label to display (e.g., "Recipe", "Brew Session")
   */
  label: string;
  /**
   * Additional metadata to display
   */
  metadata?: {
    name?: string;
    syncStatus?: "pending" | "syncing" | "synced" | "failed";
    lastModified?: number;
    [key: string]: any;
  };
}

export function DevIdDebugger({ id, label, metadata }: DevIdDebuggerProps) {
  const theme = useTheme();
  const styles = devIdDebuggerStyles(theme.colors);

  // Only render in development mode
  if (!__DEV__) {
    return null;
  }

  const isTempId = isTempIdUtil(id);
  const statusColor = isTempId ? "#FF9800" : "#4CAF50"; // Orange for temp, green for real
  const statusIcon = isTempId ? "warning" : "check-circle";
  const statusText = isTempId ? "TEMP ID" : "SERVER ID";

  // Sync status colors
  const syncColors = {
    pending: "#FF9800", // Orange
    syncing: "#2196F3", // Blue
    synced: "#4CAF50", // Green
    failed: "#F44336", // Red
  };

  const syncColor =
    metadata?.syncStatus && metadata.syncStatus in syncColors
      ? syncColors[metadata.syncStatus as keyof typeof syncColors]
      : theme.colors.textSecondary;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, borderColor: statusColor },
      ]}
    >
      {/* Header with label and status */}
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          🔍 DEV: {label}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <MaterialIcons name={statusIcon} size={12} color="#FFF" />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>

      {/* ID Display */}
      <View style={styles.idRow}>
        <Text style={[styles.idLabel, { color: theme.colors.textSecondary }]}>
          ID:
        </Text>
        <Text
          style={[styles.idValue, { color: theme.colors.primaryText }]}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {id}
        </Text>
      </View>

      {/* Metadata */}
      {metadata && (
        <View style={styles.metadata}>
          {metadata.name && (
            <Text
              style={[
                styles.metadataText,
                { color: theme.colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              Name: {metadata.name}
            </Text>
          )}
          {metadata.syncStatus && (
            <View style={styles.syncRow}>
              <Text
                style={[
                  styles.metadataText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Sync:
              </Text>
              <View
                style={[
                  styles.syncBadge,
                  { backgroundColor: `${syncColor}20`, borderColor: syncColor },
                ]}
              >
                <Text style={[styles.syncText, { color: syncColor }]}>
                  {metadata.syncStatus.toUpperCase()}
                </Text>
              </View>
            </View>
          )}
          {metadata.lastModified && (
            <Text
              style={[
                styles.metadataText,
                { color: theme.colors.textSecondary },
              ]}
            >
              Modified: {new Date(metadata.lastModified).toLocaleTimeString()}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

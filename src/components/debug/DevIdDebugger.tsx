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
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";

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

  // Only render in development mode
  if (!__DEV__) {
    return null;
  }

  const isTempId = id?.startsWith("temp_");
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

  const syncColor = metadata?.syncStatus
    ? syncColors[metadata.syncStatus]
    : undefined;

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
                  { backgroundColor: syncColor + "20", borderColor: syncColor },
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

const styles = StyleSheet.create({
  container: {
    margin: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFF",
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  idLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  idValue: {
    flex: 1,
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "500",
  },
  metadata: {
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  metadataText: {
    fontSize: 10,
    fontWeight: "500",
  },
  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  syncBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  syncText: {
    fontSize: 9,
    fontWeight: "700",
  },
});

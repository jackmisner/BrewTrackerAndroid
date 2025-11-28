/**
 * Debug Logs Modal
 *
 * Displays production logs stored on device via UnifiedLogger.
 * Allows viewing and sharing logs for debugging production issues.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  StyleSheet,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";
import { Logger } from "@services/logger/Logger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TEST_IDS } from "@constants/testIDs";

type ViewMode = "logs" | "storage";

export default function DebugLogsScreen() {
  const { colors } = useTheme();
  const [logs, setLogs] = useState<string>("");
  const [storageData, setStorageData] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("logs");

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      // Get last 100 log entries
      const recentLogs = await Logger.getRecentLogs(100);
      setLogs(recentLogs.join("\n"));
    } catch (error) {
      setLogs(
        `Error loading logs: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStorageData = useCallback(async () => {
    try {
      setLoading(true);

      // Keys to inspect for offline debugging
      const keysToInspect = [
        "offline_v2_pending_operations",
        "offline_v2_recipes",
        "offline_v2_brew_sessions",
        "offline_v2_ingredients_cache",
        "offline_v2_beer_styles_cache",
        "network_state",
        "userData",
      ];

      const storageInfo: string[] = [];
      storageInfo.push("=== AsyncStorage Contents ===\n");

      for (const key of keysToInspect) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            // Parse and format JSON for readability
            try {
              const parsed = JSON.parse(value);

              // Special handling for different data types
              if (key === "offline_v2_pending_operations") {
                storageInfo.push(`\n📋 ${key}:`);
                storageInfo.push(
                  `  Count: ${Array.isArray(parsed) ? parsed.length : "N/A"}`
                );
                if (Array.isArray(parsed) && parsed.length > 0) {
                  storageInfo.push(`  Operations:`);
                  parsed.forEach((op: any, index: number) => {
                    storageInfo.push(
                      `    ${index + 1}. ${op.type} ${op.entityType} (${op.id || op.tempId})`
                    );
                    storageInfo.push(
                      `       Status: ${op.status || "pending"}`
                    );
                    storageInfo.push(`       Attempts: ${op.retryCount || 0}`);
                    if (op.error) {
                      storageInfo.push(`       Error: ${op.error}`);
                    }
                  });
                }
              } else if (key.includes("_cache")) {
                storageInfo.push(`\n💾 ${key}:`);
                storageInfo.push(`  Version: ${parsed.version || "N/A"}`);
                storageInfo.push(
                  `  Cached at: ${parsed.cached_at ? new Date(parsed.cached_at).toLocaleString() : "N/A"}`
                );
                storageInfo.push(
                  `  Item count: ${Array.isArray(parsed.data) ? parsed.data.length : "N/A"}`
                );
              } else if (
                key.includes("recipes") ||
                key.includes("brew_sessions")
              ) {
                storageInfo.push(`\n📦 ${key}:`);
                const items = Array.isArray(parsed)
                  ? parsed
                  : parsed.data || [];
                storageInfo.push(`  Item count: ${items.length}`);
                if (items.length > 0) {
                  storageInfo.push(`  Items:`);
                  items.slice(0, 5).forEach((item: any, index: number) => {
                    storageInfo.push(
                      `    ${index + 1}. ${item.name || item.id || "Unknown"}`
                    );
                    storageInfo.push(
                      `       ID: ${item.id || item.tempId || "N/A"}`
                    );
                    storageInfo.push(
                      `       Temp: ${item.tempId ? "YES" : "NO"}`
                    );
                    storageInfo.push(
                      `       Modified: ${item.lastModified ? new Date(item.lastModified).toLocaleString() : "N/A"}`
                    );
                  });
                  if (items.length > 5) {
                    storageInfo.push(`    ... and ${items.length - 5} more`);
                  }
                }
              } else {
                storageInfo.push(`\n🔧 ${key}:`);
                storageInfo.push(JSON.stringify(parsed, null, 2));
              }
            } catch {
              // Not JSON, show raw value (truncated)
              storageInfo.push(`\n🔧 ${key}:`);
              storageInfo.push(value.substring(0, 500));
              if (value.length > 500) {
                storageInfo.push("... (truncated)");
              }
            }
          } else {
            storageInfo.push(`\n❌ ${key}: (empty)`);
          }
        } catch (error) {
          storageInfo.push(
            `\n⚠️ ${key}: Error reading - ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      // Get all keys count
      const allKeys = await AsyncStorage.getAllKeys();
      storageInfo.push(`\n\n📊 Total AsyncStorage Keys: ${allKeys.length}`);

      setStorageData(storageInfo.join("\n"));
    } catch (error) {
      setStorageData(
        `Error loading storage data: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCurrentView = useCallback(async () => {
    if (viewMode === "logs") {
      await loadLogs();
    } else {
      await loadStorageData();
    }
  }, [viewMode, loadLogs, loadStorageData]);

  useEffect(() => {
    loadCurrentView();
  }, [loadCurrentView]);

  const handleShare = async () => {
    try {
      const content = viewMode === "logs" ? logs : storageData;
      const title =
        viewMode === "logs"
          ? "BrewTracker Debug Logs"
          : "BrewTracker Storage Data";

      await Share.share({
        message: content,
        title,
      });
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  const handleClearLogs = async () => {
    try {
      await Logger.clearLogs();
      await loadLogs();
      Alert.alert("Success", "All log files have been cleared");
    } catch (error) {
      console.error("Failed to clear logs:", error);
      Alert.alert("Error", "Failed to clear logs");
    }
  };

  const handleClearStorage = async () => {
    Alert.alert(
      "Clear User Data?",
      "This will delete offline recipes, brew sessions, and pending operations. Cache data (ingredients/beer styles) will be preserved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear User Data",
          style: "destructive",
          onPress: async () => {
            try {
              // Only clear user-specific data, preserve static cache
              const keysToDelete = [
                "offline_v2_pending_operations",
                "offline_v2_recipes",
                "offline_v2_brew_sessions",
              ];

              await Promise.all(
                keysToDelete.map(key => AsyncStorage.removeItem(key))
              );
              await loadStorageData();
              Alert.alert("Success", "User data cleared. Cache preserved.");
            } catch (error) {
              console.error("Failed to clear storage:", error);
              Alert.alert("Error", "Failed to clear user data");
            }
          },
        },
        {
          text: "Clear Everything",
          style: "destructive",
          onPress: async () => {
            try {
              // Clear ALL offline data including cache
              const keysToDelete = [
                "offline_v2_pending_operations",
                "offline_v2_recipes",
                "offline_v2_brew_sessions",
                "offline_v2_ingredients_cache",
                "offline_v2_beer_styles_cache",
              ];

              await Promise.all(
                keysToDelete.map(key => AsyncStorage.removeItem(key))
              );
              await loadStorageData();
              Alert.alert("Success", "All offline data cleared");
            } catch (error) {
              console.error("Failed to clear all storage:", error);
              Alert.alert("Error", "Failed to clear all data");
            }
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    headerActions: {
      flexDirection: "row",
      gap: 12,
    },
    iconButton: {
      padding: 8,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    logsContainer: {
      flex: 1,
      backgroundColor: "#1e1e1e",
      borderRadius: 8,
      padding: 12,
    },
    logText: {
      fontFamily: "monospace",
      fontSize: 10,
      color: "#d4d4d4",
      lineHeight: 14,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 12,
      color: colors.textSecondary,
    },
    tabContainer: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabActive: {
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            testID={TEST_IDS.debugLogs.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Debug Logs</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={loadCurrentView}
            disabled={loading}
            testID={TEST_IDS.debugLogs.refreshButton}
          >
            <MaterialIcons
              name="refresh"
              size={24}
              color={loading ? colors.textSecondary : colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleShare}
            testID={TEST_IDS.debugLogs.shareButton}
          >
            <MaterialIcons name="share" size={24} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={viewMode === "logs" ? handleClearLogs : handleClearStorage}
            testID={TEST_IDS.debugLogs.deleteButton}
          >
            <MaterialIcons name="delete" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, viewMode === "logs" && styles.tabActive]}
          onPress={() => setViewMode("logs")}
        >
          <MaterialIcons
            name="article"
            size={20}
            color={viewMode === "logs" ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              viewMode === "logs" && styles.tabTextActive,
            ]}
          >
            Logs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, viewMode === "storage" && styles.tabActive]}
          onPress={() => setViewMode("storage")}
        >
          <MaterialIcons
            name="storage"
            size={20}
            color={
              viewMode === "storage" ? colors.primary : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabText,
              viewMode === "storage" && styles.tabTextActive,
            ]}
          >
            Storage
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>
              Loading {viewMode === "logs" ? "logs" : "storage data"}...
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.logsContainer}>
            <Text style={styles.logText}>
              {viewMode === "logs"
                ? logs || "No logs available"
                : storageData || "No storage data available"}
            </Text>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

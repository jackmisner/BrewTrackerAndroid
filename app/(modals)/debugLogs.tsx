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
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";
import { Logger } from "@services/logger/Logger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TEST_IDS } from "@constants/testIDs";
import {
  redactSensitiveData,
  redactLogs,
  getDebugDataWarning,
} from "@utils/redactPII";

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
      // Get last 100 log entries and redact PII
      const recentLogs = await Logger.getRecentLogs(100);
      const redactedLogs = redactLogs(recentLogs);
      setLogs(redactedLogs.join("\n"));
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
              // Redact sensitive data from parsed object
              const redacted = redactSensitiveData(parsed, key);

              // Special handling for different data types
              if (key === "offline_v2_pending_operations") {
                storageInfo.push(`\n📋 ${key}:`);
                storageInfo.push(
                  `  Count: ${Array.isArray(redacted) ? redacted.length : "N/A"}`
                );
                if (Array.isArray(redacted) && redacted.length > 0) {
                  storageInfo.push(`  Operations:`);
                  redacted.forEach((op: any, index: number) => {
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
                storageInfo.push(`  Version: ${redacted.version || "N/A"}`);
                storageInfo.push(
                  `  Cached at: ${redacted.cached_at ? new Date(redacted.cached_at).toLocaleString() : "N/A"}`
                );
                storageInfo.push(
                  `  Item count: ${Array.isArray(redacted.data) ? redacted.data.length : "N/A"}`
                );
              } else if (
                key.includes("recipes") ||
                key.includes("brew_sessions")
              ) {
                storageInfo.push(`\n📦 ${key}:`);
                const items = Array.isArray(redacted)
                  ? redacted
                  : redacted.data || [];
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
                storageInfo.push(JSON.stringify(redacted, null, 2));
              }
            } catch {
              // Not JSON, show raw value (truncated and redacted)
              storageInfo.push(`\n🔧 ${key}:`);
              const truncated = value.substring(0, 500);
              storageInfo.push(truncated);
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
    Alert.alert(
      "Share Debug Data",
      `This will share ${viewMode === "logs" ? "app logs" : "storage data"} for debugging.\n\n✅ Sensitive data has been redacted:\n• Auth tokens & session IDs\n• Email addresses & credentials\n• User profile information\n• API keys & secrets\n\n⚠️ Recipe author names preserved for context.\n\n⚠️ DO NOT SHARE PUBLICLY\nOnly share with developers or support staff.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Share",
          onPress: async () => {
            try {
              const content = viewMode === "logs" ? logs : storageData;
              const warning = getDebugDataWarning();
              const title =
                viewMode === "logs"
                  ? "BrewTracker Debug Logs"
                  : "BrewTracker Storage Data";

              await Share.share({
                message: warning + content,
                title,
              });
            } catch (error) {
              console.error("Failed to share:", error);
              Alert.alert("Error", "Failed to share debug data");
            }
          },
        },
      ]
    );
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
      "Clear Storage Data",
      "Choose what to delete from local storage:\n\n🔹 User Data Only:\n• Offline recipes & brew sessions\n• Pending sync operations\n• Preserves cached ingredients/beer styles\n\n🔸 Everything:\n• All user data (above)\n• Cached ingredients & beer styles\n• You will need to re-download static data\n\n⚠️ This does NOT delete synced server data.\nAuthentication tokens are NOT affected.",
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
              Alert.alert(
                "User Data Cleared",
                "Offline recipes, brew sessions, and pending operations have been removed.\n\nCached ingredients and beer styles preserved."
              );
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
              Alert.alert(
                "All Data Cleared",
                "All offline storage has been cleared.\n\nYou will need to re-download cached ingredients and beer styles on next use.\n\nServer data and authentication are unaffected."
              );
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
    warningBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 12,
      borderLeftWidth: 3,
      borderLeftColor: colors.success,
    },
    warningIcon: {
      marginRight: 8,
    },
    warningText: {
      flex: 1,
      fontSize: 12,
      color: colors.success,
      fontWeight: "600",
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
    <SafeAreaView style={styles.container} edges={["top"]}>
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
        {/* PII Redaction Warning Banner */}
        {!loading && (
          <View style={styles.warningBanner}>
            <MaterialIcons
              name="security"
              size={16}
              color={colors.success}
              style={styles.warningIcon}
            />
            <Text style={styles.warningText}>
              Sensitive data redacted • Safe for sharing with developers
            </Text>
          </View>
        )}

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
    </SafeAreaView>
  );
}

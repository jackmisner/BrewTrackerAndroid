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
  redactLogEntry,
  getDebugDataWarning,
} from "@utils/redactPII";
import { debugLogsStyles } from "@styles/modals/debugLogsStyles";
import { STORAGE_KEYS_V2 } from "@src/types/offlineV2";

type ViewMode = "logs" | "storage";

export default function DebugLogsScreen() {
  const { colors } = useTheme();
  const styles = debugLogsStyles(colors);
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

      // User-friendly name mapping for storage keys
      const keyDisplayNames: Record<string, string> = {
        [STORAGE_KEYS_V2.PENDING_OPERATIONS]: "Pending Sync Operations",
        [STORAGE_KEYS_V2.USER_RECIPES]: "Cached Recipes",
        [STORAGE_KEYS_V2.USER_BREW_SESSIONS]: "Cached Brew Sessions",
        [STORAGE_KEYS_V2.INGREDIENTS_DATA]: "Ingredients Database",
        [STORAGE_KEYS_V2.BEER_STYLES_DATA]: "Beer Styles Database",
        network_state: "Network State",
        userData: "User Profile Data",
      };

      // Keys to inspect for offline debugging (using centralized STORAGE_KEYS_V2)
      const keysToInspect = [
        STORAGE_KEYS_V2.PENDING_OPERATIONS,
        STORAGE_KEYS_V2.USER_RECIPES,
        STORAGE_KEYS_V2.USER_BREW_SESSIONS,
        STORAGE_KEYS_V2.INGREDIENTS_DATA,
        STORAGE_KEYS_V2.BEER_STYLES_DATA,
        "network_state", // Legacy key not in STORAGE_KEYS_V2
        "userData", // Legacy key not in STORAGE_KEYS_V2
      ];

      const storageInfo: string[] = [];
      storageInfo.push("=== AsyncStorage Contents ===\n");

      for (const key of keysToInspect) {
        try {
          const value = await AsyncStorage.getItem(key);
          const displayName = keyDisplayNames[key] || key;

          if (value) {
            // Parse and format JSON for readability
            try {
              const parsed = JSON.parse(value);

              // Get counts BEFORE redaction (redaction truncates arrays)
              let originalItemCount: number | null = null;
              if (
                key === STORAGE_KEYS_V2.INGREDIENTS_DATA ||
                key === STORAGE_KEYS_V2.BEER_STYLES_DATA
              ) {
                // Static data structure: { data: T[], version, cached_at, expires_never }
                originalItemCount = Array.isArray(parsed.data)
                  ? parsed.data.length
                  : 0;
              } else if (
                key === STORAGE_KEYS_V2.USER_RECIPES ||
                key === STORAGE_KEYS_V2.USER_BREW_SESSIONS
              ) {
                // User data structure: SyncableItem<T>[]
                originalItemCount = Array.isArray(parsed) ? parsed.length : 0;
              }

              // Redact sensitive data from parsed object
              const redacted = redactSensitiveData(parsed, key);

              // Special handling for different data types
              if (key === STORAGE_KEYS_V2.PENDING_OPERATIONS) {
                storageInfo.push(`\n📋 ${displayName}:`);
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
              } else if (
                key.includes("_cache") ||
                key === STORAGE_KEYS_V2.INGREDIENTS_DATA ||
                key === STORAGE_KEYS_V2.BEER_STYLES_DATA
              ) {
                storageInfo.push(`\n💾 ${displayName}:`);
                storageInfo.push(`  Version: ${redacted.version || "N/A"}`);
                storageInfo.push(
                  `  Cached at: ${redacted.cached_at ? new Date(redacted.cached_at).toLocaleString() : "N/A"}`
                );
                // Use originalItemCount from before redaction (redaction truncates arrays)
                storageInfo.push(`  Item count: ${originalItemCount ?? "N/A"}`);
              } else if (
                key === STORAGE_KEYS_V2.USER_RECIPES ||
                key === STORAGE_KEYS_V2.USER_BREW_SESSIONS
              ) {
                storageInfo.push(`\n📦 ${displayName}:`);
                // Use originalItemCount from before redaction
                storageInfo.push(`  Item count: ${originalItemCount ?? "N/A"}`);
                // Get items from redacted data for display
                const items = Array.isArray(redacted)
                  ? redacted
                  : redacted.data || [];
                if (items.length > 0) {
                  storageInfo.push(`  Items:`);
                  items.slice(0, 5).forEach((item: any, index: number) => {
                    // SyncableItem structure: { id, data: Recipe/BrewSession, ... }
                    const name = item.data?.name || item.name || "Unknown";
                    const itemId = item.id || item.data?.id || "N/A";
                    const isTempId = itemId.startsWith("temp_");

                    storageInfo.push(`    ${index + 1}. ${name}`);
                    storageInfo.push(`       ID: ${itemId}`);
                    storageInfo.push(`       Temp: ${isTempId ? "YES" : "NO"}`);
                    storageInfo.push(
                      `       Modified: ${item.lastModified ? new Date(item.lastModified).toLocaleString() : "N/A"}`
                    );
                    storageInfo.push(
                      `       Sync Status: ${item.syncStatus || "unknown"}`
                    );
                  });
                  if (items.length > 5) {
                    storageInfo.push(`    ... and ${items.length - 5} more`);
                  }
                }
              } else {
                storageInfo.push(`\n🔧 ${displayName}:`);
                storageInfo.push(JSON.stringify(redacted, null, 2));
              }
            } catch {
              // Not JSON, redact and show raw value (truncated)
              storageInfo.push(`\n🔧 ${displayName}:`);
              // Redact PII from raw string value
              const redactedValue = value ? redactLogEntry(value) : "";
              const truncated = redactedValue.substring(0, 500);
              storageInfo.push(truncated);
              if (redactedValue.length > 500) {
                storageInfo.push("... (truncated)");
              }
            }
          } else {
            storageInfo.push(`\n❌ ${displayName}: (empty)`);
          }
        } catch (error) {
          const displayName = keyDisplayNames[key] || key;
          storageInfo.push(
            `\n⚠️ ${displayName}: Error reading - ${error instanceof Error ? error.message : "Unknown error"}`
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

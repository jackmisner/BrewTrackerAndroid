/**
 * @fileoverview Brew sessions management screen - fermentation tracking hub
 *
 * @description
 * This screen provides a comprehensive interface for managing brew sessions throughout
 * the fermentation process. It features a tabbed layout separating active and completed
 * brew sessions, with detailed progress tracking, metric displays, and context-aware actions.
 *
 * @key_features
 * - Tabbed interface for active vs completed brew sessions
 * - Detailed session progress tracking with visual progress bars
 * - Brewing metrics display (OG, FG, ABV, fermentation days)
 * - Context menus for session management actions
 * - Pull-to-refresh functionality for real-time updates
 * - Status-based color coding and iconography
 * - Floating action button for quick session creation
 *
 * @navigation_patterns
 * - URL parameter-driven tab selection for deep linking
 * - Modal navigation for session creation and viewing
 * - Context menu navigation for edit/delete operations
 * - Integration with recipe selection flow
 * - Back navigation with preserved tab state
 *
 * @security_considerations
 * - User authentication required for session access
 * - Personal brew session data isolation
 * - JWT-authenticated API requests for all operations
 * - Context menu actions validate user permissions
 *
 * @data_handling
 * - React Query caching with 2-minute stale time for session data
 * - Real-time progress calculations based on brew dates
 * - Status filtering for active vs completed sessions
 * - Optimized list rendering with FlatList for performance
 * - Error handling with retry mechanisms and offline support
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BrewSession } from "@src/types";
import { useTheme } from "@contexts/ThemeContext";
import { brewSessionsStyles } from "@styles/tabs/brewSessionsStyles";
import { router, useLocalSearchParams } from "expo-router";
import { formatGravity, formatABV } from "@utils/formatUtils";
import {
  BrewSessionContextMenu,
  createDefaultBrewSessionActions,
} from "@src/components/ui/ContextMenu/BrewSessionContextMenu";
import { useContextMenu } from "@src/components/ui/ContextMenu/BaseContextMenu";
import { getTouchPosition } from "@src/components/ui/ContextMenu/contextMenuUtils";
import { useBrewSessions } from "@hooks/offlineV2/useUserData";
import { useOfflineSync } from "@hooks/offlineV2";
import { useNetwork } from "@contexts/NetworkContext";
import {
  getSyncStatusMessage,
  handlePullToRefreshSync,
} from "@utils/syncUtils";

export default function BrewSessionsScreen() {
  const theme = useTheme();
  const styles = brewSessionsStyles(theme);
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [refreshing, setRefreshing] = useState(false);
  const lastParamsRef = useRef<string | undefined>(undefined);

  // Context menu state
  const contextMenu = useContextMenu<BrewSession>();

  // Network and sync state
  const { isConnected } = useNetwork();
  const { isSyncing, pendingOperations, sync: syncMutation } = useOfflineSync();

  // Set active tab from URL parameters
  // Always respond to navigation with explicit activeTab parameters
  useEffect(() => {
    const currentActiveTabParam = params.activeTab as string | undefined;

    // Always set the tab based on the URL parameter
    if (currentActiveTabParam === "completed") {
      setActiveTab("completed");
    } else if (currentActiveTabParam === "active") {
      setActiveTab("active");
    }
    // If no parameter, don't change current state (for manual tab changes)

    lastParamsRef.current = currentActiveTabParam;
  }, [params.activeTab]);

  // Use offline V2 brew sessions hook
  const {
    data: brewSessions,
    isLoading,
    error,
    refresh,
    delete: deleteBrewSession,
  } = useBrewSessions();

  // Handle pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Trigger sync if online and there are pending changes
      await handlePullToRefreshSync(
        isConnected,
        pendingOperations,
        syncMutation
      );

      // Refresh brew sessions data
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  // Handle delete with offline support
  const handleDeleteSession = async (brewSessionId: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await deleteBrewSession(brewSessionId);

      Alert.alert(
        "Session Deleted",
        "The brew session has been deleted successfully.",
        [{ text: "OK", style: "default" }]
      );
    } catch (error) {
      console.error("Failed to delete brew session:", error);
      Alert.alert(
        "Delete Failed",
        "We couldn't queue the deletion. Please check your connection and try again.",
        [{ text: "OK", style: "default" }]
      );
    }
  };

  const allBrewSessions = brewSessions || [];
  const activeBrewSessions = allBrewSessions.filter(
    session => session.status !== "completed"
  );
  const completedBrewSessions = allBrewSessions.filter(
    session => session.status === "completed"
  );

  const currentBrewSessions =
    activeTab === "active" ? activeBrewSessions : completedBrewSessions;

  const handleBrewSessionPress = (brewSession: BrewSession) => {
    router.push({
      pathname: "/(modals)/(brewSessions)/viewBrewSession",
      params: { brewSessionId: brewSession.id },
    });
  };

  // Context menu handlers
  const handleBrewSessionLongPress = (brewSession: BrewSession, event: any) => {
    const position = getTouchPosition(event);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    contextMenu.showMenu(brewSession, position);
  };

  const contextMenuActions = createDefaultBrewSessionActions({
    onView: (brewSession: BrewSession) => {
      router.push({
        pathname: "/(modals)/(brewSessions)/viewBrewSession",
        params: { brewSessionId: brewSession.id },
      });
    },
    onEdit: (brewSession: BrewSession) => {
      router.push({
        pathname: "/(modals)/(brewSessions)/editBrewSession",
        params: { brewSessionId: brewSession.id },
      });
    },
    onAddFermentationEntry: (brewSession: BrewSession) => {
      Alert.alert(
        "Add Fermentation Entry",
        `Adding entry to "${brewSession.name}" - Feature coming soon!`
      );
    },
    onExportData: (brewSession: BrewSession) => {
      Alert.alert(
        "Export Data",
        `Exporting data for "${brewSession.name}" - Feature coming soon!`
      );
    },
    onArchive: (brewSession: BrewSession) => {
      Alert.alert(
        "Archive Session",
        `Archiving "${brewSession.name}" - Feature coming soon!`
      );
    },
    onDelete: (brewSession: BrewSession) => {
      Alert.alert(
        "Delete Session",
        `Are you sure you want to delete "${brewSession.name}"? This action cannot be undone.`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              contextMenu.hideMenu();
              handleDeleteSession(brewSession.id);
            },
          },
        ]
      );
    },
  });

  const handleStartBrewing = () => {
    // Navigate to recipes screen to select a recipe first
    router.push({
      pathname: "/(tabs)/recipes",
      params: { activeTab: "my" },
    });
  };

  const getStatusColor = (status: BrewSession["status"]) => {
    if (!status) {
      return "#4CAF50";
    } // Default for non-completed

    switch (status) {
      case "active":
      case "fermenting":
      case "in-progress": // Handle API status
        return "#4CAF50";
      case "paused":
        return "#FF9800";
      case "completed":
        return "#2196F3";
      case "failed":
        return "#f44336";
      default:
        return "#4CAF50"; // Default to active color for non-completed sessions
    }
  };

  const getStatusIcon = (status: BrewSession["status"]) => {
    if (!status) {
      return "help-outline";
    }

    switch (status) {
      case "active":
        return "play-circle-filled";
      case "fermenting":
        return "science";
      case "in-progress": // Handle API status
        return "science";

      case "paused":
        return "pause-circle-filled";
      case "completed":
        return "check-circle";
      case "failed":
        return "error";
      default:
        return "science"; // Default to science icon for active sessions
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const calculateDaysProgress = (
    fermentationStartDate?: string,
    fermentationEndDate?: string,
    brewDate?: string
  ) => {
    // Use fermentation_start_date if available, otherwise fall back to brew_date
    const startDateString = fermentationStartDate || brewDate;

    if (!startDateString) {
      return { daysPassed: 0, totalDays: null, progress: null };
    }

    const startDate = new Date(startDateString);

    // Use fermentation_end_date if available (for completed sessions), otherwise use today
    const endDateString = fermentationEndDate || new Date().toISOString();
    const endDate = new Date(endDateString);

    const daysPassed = Math.max(
      0,
      Math.floor(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    // Note: expectedCompletion is not used for day counting anymore
    // Days are always calculated from fermentation start to end (or today)
    return { daysPassed, totalDays: null, progress: null };
  };

  const renderBrewSessionItem = ({
    item: brewSession,
  }: {
    item: BrewSession;
  }) => {
    if (!brewSession || !brewSession.name) {
      return null;
    }

    const { daysPassed } = calculateDaysProgress(
      brewSession.fermentation_start_date,
      brewSession.fermentation_end_date,
      brewSession.brew_date
    );

    return (
      <TouchableOpacity
        style={styles.brewSessionCard}
        onPress={() => handleBrewSessionPress(brewSession)}
        onLongPress={event => handleBrewSessionLongPress(brewSession, event)}
      >
        <View style={styles.brewSessionHeader}>
          <View style={styles.brewSessionTitleRow}>
            <Text style={styles.brewSessionName} numberOfLines={1}>
              {brewSession.name}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(brewSession.status) },
              ]}
            >
              <MaterialIcons
                name={getStatusIcon(brewSession.status)}
                size={16}
                color="#fff"
              />
              <Text style={styles.statusText}>
                {brewSession.status
                  ? brewSession.status.charAt(0).toUpperCase() +
                    brewSession.status.slice(1)
                  : "Unknown"}
              </Text>
            </View>
          </View>
          <Text style={styles.recipeStyle}>
            Status:{" "}
            {brewSession.status
              ? brewSession.status.charAt(0).toUpperCase() +
                brewSession.status.slice(1)
              : "Unknown"}
          </Text>
        </View>

        {/* Only show progress/day counter for non-completed sessions */}
        {brewSession.status !== "completed" ? (
          <View style={styles.progressContainer}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressLabel}>Day {daysPassed}</Text>
              <Text style={styles.stageText}>
                {brewSession.brew_date
                  ? `Started: ${formatDate(brewSession.brew_date)}`
                  : brewSession.current_stage
                    ? brewSession.current_stage.charAt(0).toUpperCase() +
                      brewSession.current_stage.slice(1) +
                      " Fermentation"
                    : "Status: " + (brewSession.status || "Unknown")}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.brewSessionMetrics}>
          {brewSession.brew_date ? (
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Started</Text>
              <Text style={styles.metricValue}>
                {formatDate(brewSession.brew_date)}
              </Text>
            </View>
          ) : null}

          {brewSession.original_gravity ? (
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>OG</Text>
              <Text style={styles.metricValue}>
                {formatGravity(brewSession.original_gravity)}
              </Text>
            </View>
          ) : null}

          {brewSession.final_gravity ? (
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>FG</Text>
              <Text style={styles.metricValue}>
                {formatGravity(brewSession.final_gravity)}
              </Text>
            </View>
          ) : null}

          {brewSession.actual_abv != null &&
          brewSession.actual_abv !== undefined ? (
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>ABV</Text>
              <Text style={styles.metricValue}>
                {formatABV(brewSession.actual_abv)}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="science" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>
        {activeTab === "active" ? "No Active Brews" : "No Completed Brews"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === "active"
          ? "Start a brew session to track your fermentation progress"
          : "Completed brew sessions will appear here"}
      </Text>

      {activeTab === "active" ? (
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleStartBrewing}
        >
          <MaterialIcons name="play-arrow" size={24} color="#fff" />
          <Text style={styles.createButtonText}>Start Brewing</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header with tabs */}
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "active" && styles.activeTab]}
            onPress={() => {
              // Only navigate if not already on active tab
              if (activeTab !== "active") {
                router.push({
                  pathname: "/(tabs)/brewSessions",
                  params: { activeTab: "active" },
                });
              }
            }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "active" && styles.activeTabText,
              ]}
            >
              Active ({activeBrewSessions.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "completed" && styles.activeTab]}
            onPress={() => {
              // Only navigate if not already on completed tab
              if (activeTab !== "completed") {
                router.push({
                  pathname: "/(tabs)/brewSessions",
                  params: { activeTab: "completed" },
                });
              }
            }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "completed" && styles.activeTabText,
              ]}
            >
              Completed ({completedBrewSessions.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sync status and button */}
        {pendingOperations > 0 && (
          <View style={styles.syncStatusContainer}>
            <View style={styles.syncInfo}>
              <MaterialIcons
                name={isSyncing ? "sync" : "cloud-upload"}
                size={16}
                color={theme.colors.primary}
                style={isSyncing ? { transform: [{ rotate: "45deg" }] } : {}}
              />
              <Text style={styles.syncText}>
                {getSyncStatusMessage(pendingOperations, isSyncing)}
              </Text>
            </View>
            {isConnected && !isSyncing && (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await syncMutation();
                  } catch (error) {
                    console.error("Sync failed:", error);
                    Alert.alert(
                      "Sync Failed",
                      "Unable to sync changes. Please try again.",
                      [{ text: "OK" }]
                    );
                  }
                }}
                style={styles.syncButton}
              >
                <Text style={styles.syncButtonText}>Sync Now</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Create button for active brews */}
      {activeTab === "active" ? (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleStartBrewing}
          testID="brewSessions-fab"
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      ) : null}

      {/* Brew sessions list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f4511e" />
          <Text style={styles.loadingText}>Loading brew sessions...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={48} color="#f44336" />
          <Text style={styles.errorText}>Backend Not Available</Text>
          <Text style={styles.errorSubtext}>
            Brew sessions require a backend connection. The app will show empty
            states until the backend is running.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refresh()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={currentBrewSessions}
          renderItem={renderBrewSessionItem}
          keyExtractor={(item, index) =>
            item.id?.toString() || `brew-session-${index}`
          }
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {/* Context Menu */}
      <BrewSessionContextMenu
        visible={contextMenu.visible}
        brewSession={contextMenu.selectedItem}
        actions={contextMenuActions}
        onClose={contextMenu.hideMenu}
        position={contextMenu.position}
      />
    </View>
  );
}

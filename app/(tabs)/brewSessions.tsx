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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import ApiService from "@services/api/apiService";
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
import { QUERY_KEYS } from "@services/api/queryClient";
export default function BrewSessionsScreen() {
  const theme = useTheme();
  const styles = brewSessionsStyles(theme);
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [refreshing, setRefreshing] = useState(false);
  const lastParamsRef = useRef<string | undefined>(undefined);

  // Context menu state
  const contextMenu = useContextMenu<BrewSession>();

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

  // Handle pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // Query for brew sessions
  const {
    data: brewSessionsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["brewSessions"],
    queryFn: async () => {
      const response = await ApiService.brewSessions.getAll(1, 20);
      return response.data;
    },
    retry: 1,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });

  // Delete mutation
  const queryClient = useQueryClient();
  const deleteMutation = useMutation<unknown, unknown, string>({
    mutationKey: ["deleteBrewSession"],
    mutationFn: async (brewSessionId: string) => {
      return ApiService.brewSessions.delete(brewSessionId);
    },
    onSuccess: (_data, brewSessionId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BREW_SESSIONS });
      // Drop stale detail caches for the deleted session
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.BREW_SESSION(brewSessionId),
      });
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.FERMENTATION_DATA(brewSessionId),
      });
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.FERMENTATION_STATS(brewSessionId),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
    },
    onError: (error, brewSessionId) => {
      console.error("Failed to delete brew session:", error);
      Alert.alert(
        "Delete Failed",
        "Failed to delete brew session. Please try again.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Retry",
            onPress: () => deleteMutation.mutate(brewSessionId as string),
          },
        ]
      );
    },
  });

  const allBrewSessions = brewSessionsData?.brew_sessions || [];
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
              if (deleteMutation.isPending) {
                return;
              }
              contextMenu.hideMenu();
              deleteMutation.mutate(brewSession.id, {
                onSuccess: () => {
                  Alert.alert("Success", "Brew session deleted successfully");
                },
              });
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
    brewDate: string,
    expectedCompletion?: string
  ) => {
    const startDate = new Date(brewDate);
    const today = new Date();
    const daysPassed = Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (expectedCompletion) {
      const endDate = new Date(expectedCompletion);
      const totalDays = Math.floor(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (totalDays <= 0) {
        return { daysPassed, totalDays: null, progress: null };
      }
      return {
        daysPassed,
        totalDays,
        progress: Math.min(daysPassed / totalDays, 1),
      };
    }

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

    const { daysPassed, totalDays, progress } = calculateDaysProgress(
      brewSession.brew_date,
      brewSession.expected_completion_date
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

        <View style={styles.progressContainer}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>
              Day {daysPassed} {totalDays && `of ${totalDays}`}
            </Text>
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

          {progress !== null ? (
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(0, Math.min(progress, 1)) * 100}%` },
                ]}
              />
            </View>
          ) : null}
        </View>

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
      </View>

      {/* Create button for active brews */}
      {activeTab === "active" ? (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleStartBrewing}
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
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : currentBrewSessions.length === 0 ? (
        renderEmptyState()
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

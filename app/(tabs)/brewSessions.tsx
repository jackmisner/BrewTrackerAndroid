import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import ApiService from "@services/API/apiService";
import { BrewSession } from "@src/types";
import { useTheme } from "@contexts/ThemeContext";
import { brewSessionsStyles } from "@styles/tabs/brewSessionsStyles";
import { router, useLocalSearchParams } from "expo-router";

/**
 * Displays a tabbed interface for viewing, refreshing, and navigating brew sessions.
 *
 * Shows lists of active and completed brew sessions, allows switching between tabs, supports pull-to-refresh, and provides navigation to session details or starting a new brew session. Handles loading, error, and empty states with appropriate UI feedback.
 */
export default function BrewSessionsScreen() {
  const theme = useTheme();
  const styles = brewSessionsStyles(theme);
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [refreshing, setRefreshing] = useState(false);
  const lastParamsRef = useRef<string | undefined>(undefined);

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

  const handleStartBrewing = () => {
    // TODO: Navigate to create brew session screen when implemented
    console.log("Navigate to create brew session");
  };

  const getStatusColor = (status: BrewSession["status"]) => {
    if (!status) return "#4CAF50"; // Default for non-completed

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
    if (!status) return "help-outline";

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

          {progress !== null && (
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progress * 100}%` }]}
              />
            </View>
          )}
        </View>

        <View style={styles.brewSessionMetrics}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Started</Text>
            <Text style={styles.metricValue}>
              {formatDate(brewSession.brew_date)}
            </Text>
          </View>

          {brewSession.original_gravity && (
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>OG</Text>
              <Text style={styles.metricValue}>
                {brewSession.original_gravity.toFixed(3)}
              </Text>
            </View>
          )}

          {brewSession.final_gravity && (
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>FG</Text>
              <Text style={styles.metricValue}>
                {brewSession.final_gravity.toFixed(3)}
              </Text>
            </View>
          )}

          {brewSession.actual_abv && (
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>ABV</Text>
              <Text style={styles.metricValue}>
                {brewSession.actual_abv.toFixed(1)}%
              </Text>
            </View>
          )}
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

      {activeTab === "active" && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleStartBrewing}
        >
          <MaterialIcons name="play-arrow" size={24} color="#fff" />
          <Text style={styles.createButtonText}>Start Brewing</Text>
        </TouchableOpacity>
      )}
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
      {activeTab === "active" && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleStartBrewing}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}

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
    </View>
  );
}

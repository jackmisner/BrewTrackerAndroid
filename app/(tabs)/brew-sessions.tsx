import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import ApiService from "../../src/services/API/apiService";
import { BrewSession } from "../../src/types";

export default function BrewSessionsScreen() {
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [refreshing, setRefreshing] = useState(false);

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
    // TODO: Navigate to brew session detail screen when implemented
    console.log("Navigate to brew session:", brewSession.session_id);
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
    // Add safety checks for brew session data
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
            onPress={() => setActiveTab("active")}
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
            onPress={() => setActiveTab("completed")}
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
            item.session_id?.toString() || `brew-session-${index}`
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  activeTabText: {
    color: "#f4511e",
    fontWeight: "600",
  },
  floatingButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f4511e",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  brewSessionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  brewSessionHeader: {
    marginBottom: 12,
  },
  brewSessionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  brewSessionName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 8,
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
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  recipeName: {
    fontSize: 16,
    color: "#333",
    marginBottom: 2,
  },
  recipeStyle: {
    fontSize: 14,
    color: "#f4511e",
    fontWeight: "500",
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  stageText: {
    fontSize: 12,
    color: "#666",
    textTransform: "capitalize",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 2,
  },
  brewSessionMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metric: {
    alignItems: "center",
    minWidth: 60,
  },
  metricLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: "#f44336",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  retryButton: {
    backgroundColor: "#f4511e",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4511e",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

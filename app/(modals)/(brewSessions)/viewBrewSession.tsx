import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import ApiService from "@services/api/apiService";
import { BrewSession, BrewSessionStatus, Recipe } from "@/src/types";
import { viewBrewSessionStyles } from "@styles/modals/viewBrewSessionStyles";
import { useTheme } from "@contexts/ThemeContext";
import { TEST_IDS } from "@src/constants/testIDs";
import { FermentationChart } from "@src/components/brewSessions/FermentationChart";
import { FermentationData } from "@src/components/brewSessions/FermentationData";

export default function ViewBrewSession() {
  const { brewSessionId } = useLocalSearchParams<{ brewSessionId: string }>();

  const [refreshing, setRefreshing] = useState(false);
  const [chartRefreshCounter, setChartRefreshCounter] = useState(0);
  const theme = useTheme();
  const styles = viewBrewSessionStyles(theme);
  const queryClient = useQueryClient();
  const {
    data: brewSessionData,
    isLoading,
    error,
    refetch,
    dataUpdatedAt, // Track when data was last updated
  } = useQuery<BrewSession>({
    queryKey: ["brewSession", brewSessionId],
    queryFn: async () => {
      if (!brewSessionId) {
        throw new Error("Brew session ID is required");
      }
      const response = await ApiService.brewSessions.getById(brewSessionId);
      return response.data;
    },
    enabled: !!brewSessionId, // Only run query if brewSessionId exists
    retry: 1,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Fetch recipe data for expected FG reference line
  const { data: recipeData } = useQuery<Recipe | undefined>({
    queryKey: ["recipe", brewSessionData?.recipe_id],
    queryFn: async () => {
      if (!brewSessionData?.recipe_id) {
        return undefined;
      }
      const response = await ApiService.recipes.getById(
        brewSessionData.recipe_id
      );
      return response.data;
    },
    enabled: !!brewSessionData?.recipe_id, // Only run when we have recipe_id
    retry: 1,
    staleTime: 1000 * 60 * 10, // Cache recipe data longer (10 minutes)
  });

  // Force chart refresh when brew session data is updated
  React.useEffect(() => {
    if (dataUpdatedAt) {
      setChartRefreshCounter(prev => prev + 1);
    }
  }, [dataUpdatedAt]);

  // Force chart refresh when screen comes into focus (handles navigation back from modals)
  useFocusEffect(
    React.useCallback(() => {
      setChartRefreshCounter(prev => prev + 1);
    }, [])
  );
  /**
   * Pull-to-refresh handler
   * Manually triggers a refetch of the brew session data and chart refresh
   * Also handles dimension recalculation for foldable devices
   */
  const onRefresh = async () => {
    setRefreshing(true);
    const currentRecipeId = brewSessionData?.recipe_id;
    try {
      await refetch();
      // Also refresh recipe (FG) if present
      if (currentRecipeId) {
        await queryClient.invalidateQueries({
          queryKey: ["recipe", currentRecipeId],
        });
      }
      // Force chart refresh for foldable devices
      setChartRefreshCounter(prev => prev + 1);
    } catch (error) {
      console.error("Error refreshing brew session:", error);
    } finally {
      setRefreshing(false);
    }
  };
  /**
   * Navigation handler for back button
   * Uses router.back() to return to previous screen
   */
  const handleGoBack = () => {
    router.back();
  };

  /**
   * Format date strings for display
   * Converts ISO date strings to readable format
   */
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) {
      return "Not set";
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    return date.toLocaleDateString();
  };

  /**
   * Format brewing metrics with proper precision
   */
  const formatMetric = (
    value: number | undefined,
    decimals: number = 2
  ): string => {
    return value !== undefined && value !== null
      ? value.toFixed(decimals)
      : "—";
  };

  /**
   * Get status badge styling based on brew session status
   */
  const getStatusColor = (
    status: BrewSessionStatus | null | undefined
  ): string => {
    if (!status || typeof status !== "string") {
      return "#9E9E9E"; // Default gray for unknown/invalid status
    }

    switch (status) {
      case "planned":
        return "#9E9E9E";
      case "in-progress":
        return "#2196F3";
      case "fermenting":
        return "#FF9800";
      case "conditioning":
        return "#9C27B0";
      case "completed":
        return "#4CAF50";
      case "archived":
        return "#607D8B";
      default:
        return "#9E9E9E";
    }
  };

  /**
   * Render a metric section (ABV, OG, FG, etc.)
   * Reusable component for displaying brewing metrics
   * **/
  const renderMetric = (
    label: string,
    value: string | number | undefined,
    unit?: string
  ) => {
    // Generate testID based on label for testing
    const testId = TEST_IDS.patterns.metricValue(label);

    return (
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue} testID={testId}>
          {(() => {
            if (value === undefined || value === null) {
              return "—";
            }
            if (typeof value === "number") {
              const decimals =
                label === "ABV" ? 1 : label.includes("G") ? 3 : 0;
              return `${formatMetric(value, decimals)}${unit || ""}`;
            }
            return `${value}${unit || ""}`;
          })()}
        </Text>
      </View>
    );
  };
  /**
   * Loading State
   * Show spinner and loading text while fetching data
   */
  if (isLoading) {
    return (
      <View style={styles.container}>
        {/* Header with back button - always visible */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            testID={TEST_IDS.header.backButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Brew Session Details</Text>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f4511e" />
          <Text style={styles.loadingText}>Loading brew session...</Text>
        </View>
      </View>
    );
  }

  /**
   * Error State
   * Show error message and retry button when API call fails
   */
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            testID={TEST_IDS.header.backButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Brew Session Details</Text>
        </View>

        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={64} color="#f44336" />
          <Text style={styles.errorTitle}>Failed to Load Brew Session</Text>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /**
   * Empty State
   * Show message when no brew session data is returned
   */
  if (!brewSessionData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            testID={TEST_IDS.header.backButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Brew Session Details</Text>
        </View>

        <View style={styles.errorContainer}>
          <MaterialIcons name="help-outline" size={64} color="#ccc" />
          <Text style={styles.errorTitle}>Brew Session Not Found</Text>
          <Text style={styles.errorText}>
            This brew session could not be found or may have been deleted.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleGoBack}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /**
   * Success State
   * Render the full recipe details
   */
  const brewSession = brewSessionData;

  return (
    <View style={styles.container}>
      {/* Header with back button - always visible */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          testID={TEST_IDS.header.backButton}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Brew Session Details</Text>
      </View>

      {/* Scrollable content area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Brew Session Title and Status */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{brewSession.name}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: getStatusColor(brewSession.status),
              },
            ]}
          >
            <Text style={styles.statusText}>
              {(() => {
                const status = brewSession.status;
                if (
                  !status ||
                  typeof status !== "string" ||
                  status.length === 0
                ) {
                  return "Unknown";
                }
                return status.charAt(0).toUpperCase() + status.slice(1);
              })()}
            </Text>
          </View>
        </View>

        {/* Brew Session Metadata */}
        <View style={styles.metadataContainer}>
          <Text style={styles.metadataText}>
            Brew Date: {formatDate(brewSession.brew_date)}
          </Text>
          {brewSession.fermentation_start_date ? (
            <Text style={styles.metadataText}>
              Fermentation Started:{" "}
              {formatDate(brewSession.fermentation_start_date)}
            </Text>
          ) : null}
          {brewSession.fermentation_end_date ? (
            <Text style={styles.metadataText}>
              Fermentation Ended:{" "}
              {formatDate(brewSession.fermentation_end_date)}
            </Text>
          ) : null}
          {brewSession.packaging_date ? (
            <Text style={styles.metadataText}>
              Packaged: {formatDate(brewSession.packaging_date)}
            </Text>
          ) : null}
        </View>

        {/* Brew Session Metrics */}
        <View style={styles.metricsContainer}>
          {renderMetric("OG", brewSession.actual_og)}
          {renderMetric("FG", brewSession.actual_fg)}
          {renderMetric("ABV", brewSession.actual_abv, "%")}
          {renderMetric("Efficiency", brewSession.actual_efficiency, "%")}
          {brewSession.mash_temp &&
            renderMetric(
              "Mash Temp",
              brewSession.mash_temp,
              `°${brewSession.temperature_unit || "F"}`
            )}
        </View>

        {/* Brew Notes */}
        {brewSession.notes ? (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Brew Notes</Text>
            <Text style={styles.detailsText}>{brewSession.notes}</Text>
          </View>
        ) : null}

        {/* Tasting Notes */}
        {brewSession.tasting_notes ? (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Tasting Notes</Text>
            <Text style={styles.detailsText}>{brewSession.tasting_notes}</Text>
          </View>
        ) : null}

        {/* Batch Rating */}
        {brewSession.batch_rating ? (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Batch Rating</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map(star => (
                <MaterialIcons
                  key={star}
                  name="star"
                  size={24}
                  color={
                    star <= (brewSession.batch_rating || 0)
                      ? "#FFD700"
                      : "#E0E0E0"
                  }
                  style={styles.ratingStar}
                />
              ))}
              <Text style={styles.ratingText}>
                {brewSession.batch_rating}/5
              </Text>
            </View>
          </View>
        ) : null}

        {/* Fermentation Chart */}
        <FermentationChart
          fermentationData={brewSession.fermentation_data || []}
          expectedFG={brewSession.target_fg}
          actualOG={brewSession.actual_og}
          temperatureUnit={brewSession.temperature_unit}
          forceRefresh={chartRefreshCounter}
          recipeData={recipeData}
        />

        {/* Fermentation Entries */}
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Fermentation Entries</Text>
          <FermentationData
            fermentationData={brewSession.fermentation_data || []}
            expectedFG={recipeData?.estimated_fg ?? brewSession.target_fg}
            actualOG={brewSession.actual_og}
            temperatureUnit={brewSession.temperature_unit}
            brewSessionId={brewSessionId}
          />
        </View>
      </ScrollView>
    </View>
  );
}

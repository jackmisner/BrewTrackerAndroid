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
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import ApiService from "../../../src/services/API/apiService";
import { BrewSession, BrewSessionStatus } from "@/src/types";
import { viewBrewSessionStyles } from "../../../src/styles/modals/viewBrewSessionStyles";
import { useTheme } from "../../../src/contexts/ThemeContext";

export default function ViewBrewSession() {
  const { brewSessionId } = useLocalSearchParams<{ brewSessionId: string }>();

  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  const styles = viewBrewSessionStyles(theme);
  const {
    data: brewSessionData,
    isLoading,
    error,
    refetch,
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
  /**
   * Pull-to-refresh handler
   * Manually triggers a refetch of the brew session data
   */
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
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
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  /**
   * Format brewing metrics with proper precision
   */
  const formatMetric = (
    value: number | undefined,
    decimals: number = 2
  ): string => {
    return value ? value.toFixed(decimals) : "—";
  };

  /**
   * Get status badge styling based on brew session status
   */
  const getStatusColor = (status: BrewSessionStatus): string => {
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
   */
  const renderMetric = (
    label: string,
    value: string | number | undefined,
    unit?: string
  ) => (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value !== undefined && value !== null
          ? `${typeof value === "number" ? formatMetric(value, label === "ABV" ? 1 : label.includes("G") ? 3 : 0) : value}${unit || ""}`
          : "—"}
      </Text>
    </View>
  );

  /**
   * Loading State
   * Show spinner and loading text while fetching data
   */
  if (isLoading) {
    return (
      <View style={styles.container}>
        {/* Header with back button - always visible */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
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
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
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
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
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
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
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
                backgroundColor: getStatusColor(
                  brewSession.status as BrewSessionStatus
                ),
              },
            ]}
          >
            <Text style={styles.statusText}>
              {brewSession.status.charAt(0).toUpperCase() +
                brewSession.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Brew Session Metadata */}
        <View style={styles.metadataContainer}>
          <Text style={styles.metadataText}>
            Brew Date: {formatDate(brewSession.brew_date)}
          </Text>
          {brewSession.fermentation_start_date && (
            <Text style={styles.metadataText}>
              Fermentation Started:{" "}
              {formatDate(brewSession.fermentation_start_date)}
            </Text>
          )}
          {brewSession.fermentation_end_date && (
            <Text style={styles.metadataText}>
              Fermentation Ended:{" "}
              {formatDate(brewSession.fermentation_end_date)}
            </Text>
          )}
          {brewSession.packaging_date && (
            <Text style={styles.metadataText}>
              Packaged: {formatDate(brewSession.packaging_date)}
            </Text>
          )}
        </View>

        {/* Brew Session Metrics */}
        <View style={styles.metricsContainer}>
          {renderMetric("ABV", brewSession.actual_abv, "%")}
          {renderMetric("OG", brewSession.actual_og)}
          {renderMetric("FG", brewSession.actual_fg)}
          {renderMetric("Efficiency", brewSession.actual_efficiency, "%")}
          {brewSession.mash_temp &&
            renderMetric("Mash Temp", brewSession.mash_temp, "°F")}
        </View>

        {/* Brew Notes */}
        {brewSession.notes && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Brew Notes</Text>
            <Text style={styles.detailsText}>{brewSession.notes}</Text>
          </View>
        )}

        {/* Tasting Notes */}
        {brewSession.tasting_notes && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Tasting Notes</Text>
            <Text style={styles.detailsText}>{brewSession.tasting_notes}</Text>
          </View>
        )}

        {/* Batch Rating */}
        {brewSession.batch_rating && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Batch Rating</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map(star => (
                <MaterialIcons
                  key={star}
                  name="star"
                  size={24}
                  color={
                    star <= brewSession.batch_rating! ? "#FFD700" : "#E0E0E0"
                  }
                  style={styles.ratingStar}
                />
              ))}
              <Text style={styles.ratingText}>
                {brewSession.batch_rating}/5
              </Text>
            </View>
          </View>
        )}

        {/* Fermentation Data Summary */}
        {brewSession.fermentation_data &&
          brewSession.fermentation_data.length > 0 && (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsTitle}>Fermentation Tracking</Text>
              <Text style={styles.detailsText}>
                {brewSession.fermentation_data.length} readings recorded
              </Text>
              <Text style={styles.metadataText}>
                Latest reading:{" "}
                {formatDate(
                  brewSession.fermentation_data[
                    brewSession.fermentation_data.length - 1
                  ]?.date
                )}
              </Text>
            </View>
          )}
      </ScrollView>
    </View>
  );
}

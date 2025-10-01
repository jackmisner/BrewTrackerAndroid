import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import ApiService from "@services/api/apiService";
import { BrewSession, BrewSessionStatus, Recipe } from "@/src/types";
import { viewBrewSessionStyles } from "@styles/modals/viewBrewSessionStyles";
import { useTheme } from "@contexts/ThemeContext";
import { TEST_IDS } from "@src/constants/testIDs";
import { FermentationChart } from "@src/components/brewSessions/FermentationChart";
import { FermentationData } from "@src/components/brewSessions/FermentationData";
import { useBrewSessions } from "@hooks/offlineV2/useUserData";
import { ModalHeader } from "@src/components/ui/ModalHeader";

export default function ViewBrewSession() {
  const { brewSessionId } = useLocalSearchParams<{ brewSessionId: string }>();

  const [refreshing, setRefreshing] = useState(false);
  const [chartRefreshCounter, setChartRefreshCounter] = useState(0);
  const [brewSessionData, setBrewSessionData] = useState<BrewSession | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const styles = viewBrewSessionStyles(theme);
  const queryClient = useQueryClient();

  // Use offline-first brew sessions hook
  const brewSessionsHook = useBrewSessions();
  const { getById, update } = brewSessionsHook; // Extract functions to use in dependency array

  // Load brew session data using offline-first approach
  useEffect(() => {
    let cancelled = false;
    const loadBrewSession = async () => {
      if (!brewSessionId) {
        if (!cancelled) {
          setError("Brew session ID is required");
          setIsLoading(false);
        }
        return;
      }

      try {
        if (cancelled) {
          return;
        }
        setIsLoading(true);
        setError(null);
        console.log(`[ViewBrewSession] Loading brew session: ${brewSessionId}`);

        const session = await getById(brewSessionId);
        console.log(
          `[ViewBrewSession] Loaded session:`,
          session ? "found" : "not found"
        );
        if (session) {
          setBrewSessionData(session);
        } else {
          setError("Brew session not found");
        }
      } catch (err) {
        console.error("[ViewBrewSession] Error loading brew session:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load brew session";
        if (!cancelled) {
          setError(errorMessage);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadBrewSession();
    return () => {
      cancelled = true;
    };
  }, [brewSessionId, getById]); // Include getById which should be stable via useCallback

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

  // Force chart refresh and reload brew session when screen comes into focus
  // This handles navigation back from modals (e.g., after adding/editing fermentation entries)
  useFocusEffect(
    React.useCallback(() => {
      setChartRefreshCounter(prev => prev + 1);

      // Reload brew session data to get fresh fermentation entries
      const reloadBrewSession = async () => {
        if (!brewSessionId) {
          return;
        }

        try {
          const session = await getById(brewSessionId);
          if (session) {
            setBrewSessionData(session);
          }
        } catch (error) {
          console.error(
            "[ViewBrewSession.useFocusEffect] Failed to reload session:",
            error
          );
        }
      };

      reloadBrewSession();
    }, [brewSessionId, getById])
  );

  /**
   * Pull-to-refresh handler
   * Manually triggers a refresh of the brew session data and chart refresh
   * Uses the offline-first approach with fallback to cached data
   */
  const onRefresh = async () => {
    if (!brewSessionId) {
      return;
    }

    setRefreshing(true);
    const currentRecipeId = brewSessionData?.recipe_id;
    try {
      console.log(
        `[ViewBrewSession.onRefresh] Refreshing brew session: ${brewSessionId}`
      );

      // First try to refresh the overall brew sessions data
      await brewSessionsHook.refresh();

      // Then reload the specific session
      const session = await brewSessionsHook.getById(brewSessionId);
      if (session) {
        setBrewSessionData(session);
        setError(null);
      } else {
        console.warn(
          `[ViewBrewSession.onRefresh] Session ${brewSessionId} not found after refresh`
        );
        // Session was deleted - clear data and show error
        setBrewSessionData(null);
        setError("This brew session has been deleted");
      }

      // Also refresh recipe (FG) if present
      if (currentRecipeId) {
        await queryClient.invalidateQueries({
          queryKey: ["recipe", currentRecipeId],
        });
      }

      // Force chart refresh for foldable devices
      setChartRefreshCounter(prev => prev + 1);
    } catch (error) {
      console.error(
        "[ViewBrewSession.onRefresh] Error refreshing brew session:",
        error
      );
      // Don't set error state on refresh failure - preserve offline data
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
   * Navigation handler for home button
   * Invalidates dashboard cache and navigates to home
   */
  const handleHomeNavigation = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    router.push({ pathname: "/(tabs)" });
  };

  /**
   * Navigation handler for editing the brew session
   */
  const handleEditBrewSession = () => {
    if (brewSessionId) {
      router.push({
        pathname: "/(modals)/(brewSessions)/editBrewSession",
        params: { brewSessionId: brewSessionId },
      });
    }
  };

  /**
   * Navigation handler for adding a fermentation entry
   */
  const handleAddFermentationEntry = () => {
    if (brewSessionId) {
      router.push({
        pathname: "/(modals)/(brewSessions)/addFermentationEntry",
        params: { brewSessionId: brewSessionId },
      });
    }
  };

  /**
   * Handler for data changes (e.g., after fermentation entry deletion)
   * Reloads the brew session data to reflect changes
   */
  const handleDataChange = React.useCallback(async () => {
    if (!brewSessionId) {
      return;
    }

    try {
      console.log(
        `[ViewBrewSession.handleDataChange] Reloading brew session: ${brewSessionId}`
      );
      const session = await getById(brewSessionId);
      if (session) {
        setBrewSessionData(session);
        // Also increment chart refresh counter to update the chart
        setChartRefreshCounter(prev => prev + 1);
      }
    } catch (error) {
      console.error(
        "[ViewBrewSession.handleDataChange] Failed to reload session:",
        error
      );
    }
  }, [brewSessionId, getById]);

  /**
   * Handler for updating batch rating with optimistic UI update
   * Updates the UI immediately, then syncs with backend
   */
  const handleRatingUpdate = React.useCallback(
    async (newRating: number) => {
      if (!brewSessionId || !brewSessionData) {
        return;
      }

      // Store the previous rating for rollback if needed
      const previousRating = brewSessionData.batch_rating;

      try {
        console.log(
          `[ViewBrewSession.handleRatingUpdate] Optimistically updating rating to: ${newRating}`
        );

        // Optimistic update - immediately update the UI
        setBrewSessionData(prev => {
          if (!prev) {
            return prev;
          }
          return { ...prev, batch_rating: newRating };
        });

        // Provide haptic feedback immediately for responsive feel
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Update in background
        await update(brewSessionId, { batch_rating: newRating });

        console.log(
          `[ViewBrewSession.handleRatingUpdate] Successfully updated rating to: ${newRating}`
        );
      } catch (error) {
        console.error(
          "[ViewBrewSession.handleRatingUpdate] Failed to update rating:",
          error
        );

        // Rollback optimistic update on error
        setBrewSessionData(prev => {
          if (!prev) {
            return prev;
          }
          return { ...prev, batch_rating: previousRating };
        });

        Alert.alert(
          "Update Failed",
          "Failed to update batch rating. Please try again.",
          [{ text: "OK" }]
        );
      }
    },
    [brewSessionId, brewSessionData, update]
  );

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
        <ModalHeader
          title="Brew Session Details"
          onBack={handleGoBack}
          showHomeButton={true}
          testID="header"
        />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f4511e" />
          <Text style={styles.loadingText}>Loading brew session...</Text>
        </View>
      </View>
    );
  }

  /**
   * Error State
   * Show error message and retry button when loading fails
   */
  if (error) {
    console.log(`[ViewBrewSession] Rendering error state: ${error}`);

    return (
      <View style={styles.container}>
        <ModalHeader
          title="Brew Session Details"
          onBack={handleGoBack}
          showHomeButton={true}
          testID="header"
        />

        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={64} color="#f44336" />
          <Text style={styles.errorTitle}>Failed to Load Brew Session</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={async () => {
              console.log(
                `[ViewBrewSession] Retry button pressed for session: ${brewSessionId}`
              );
              if (!brewSessionId) {
                console.warn(
                  `[ViewBrewSession] No brew session ID available for retry`
                );
                return;
              }

              try {
                setIsLoading(true);
                setError(null);
                console.log(
                  `[ViewBrewSession] Retrying load for session: ${brewSessionId}`
                );

                // Try to refresh the data first
                await brewSessionsHook.refresh();

                // Then get the specific session
                const session = await brewSessionsHook.getById(brewSessionId);
                console.log(
                  `[ViewBrewSession] Retry result:`,
                  session ? "found" : "not found"
                );

                if (session) {
                  setBrewSessionData(session);
                } else {
                  setError("Brew session not found");
                }
              } catch (err) {
                console.error("[ViewBrewSession] Retry failed:", err);
                const errorMessage =
                  err instanceof Error
                    ? err.message
                    : "Failed to load brew session";
                setError(errorMessage);
              } finally {
                setIsLoading(false);
              }
            }}
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
        <ModalHeader
          title="Brew Session Details"
          onBack={handleGoBack}
          showHomeButton={true}
          testID="header"
        />

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
      <ModalHeader
        title="Brew Session Details"
        onBack={handleGoBack}
        rightActions={
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              style={{ padding: 8, marginLeft: 8 }}
              onPress={handleEditBrewSession}
              testID={TEST_IDS.patterns.touchableOpacityAction(
                "edit-brew-session"
              )}
            >
              <MaterialIcons
                name="edit"
                size={22}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ padding: 8, marginLeft: 8 }}
              onPress={handleAddFermentationEntry}
              testID={TEST_IDS.patterns.touchableOpacityAction(
                "add-fermentation-entry"
              )}
            >
              <MaterialIcons
                name="add"
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ padding: 8, marginLeft: 12 }}
              onPress={handleHomeNavigation}
              testID={TEST_IDS.patterns.touchableOpacityAction("home")}
            >
              <MaterialIcons
                name="home"
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>
        }
        showHomeButton={false}
        testID="header"
      />

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

        {/* Batch Rating - Clickable Stars */}
        {brewSession.batch_rating !== undefined &&
        brewSession.batch_rating !== null ? (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Batch Rating</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleRatingUpdate(star)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                >
                  <MaterialIcons
                    name="star"
                    size={24}
                    color={
                      star <= (brewSession.batch_rating || 0)
                        ? "#FFD700"
                        : "#E0E0E0"
                    }
                    style={styles.ratingStar}
                  />
                </TouchableOpacity>
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
            brewSessionUserId={brewSession.user_id}
            onDataChange={handleDataChange}
          />
        </View>
      </ScrollView>
    </View>
  );
}

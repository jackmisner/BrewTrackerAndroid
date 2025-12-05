/**
 * Stale Data Banner Component
 *
 * Displays a warning when cached data is outdated (>24 hours old).
 * Encourages users to go online to fetch fresh data while still allowing
 * access to stale cache for offline functionality.
 *
 * Features:
 * - Automatic detection of stale React Query cache
 * - Non-intrusive warning with manual refresh option
 * - Theme-aware styling with proper contrast
 * - Only shows when offline OR when data is very old
 * - Dismissible with local storage persistence
 *
 * @example
 * ```typescript
 * // Add to app layout below NetworkStatusBanner
 * <StaleDataBanner />
 * ```
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useNetwork } from "@contexts/NetworkContext";
import { useTheme } from "@contexts/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { bannerStyles } from "@styles/components/banners/bannerStyles";
import { UnifiedLogger } from "@services/logger/UnifiedLogger";

interface StaleDataBannerProps {
  /**
   * Optional callback when user taps refresh button
   */
  onRefresh?: () => void;
  /**
   * Threshold in hours for showing stale warning (default: 24)
   */
  staleThresholdHours?: number;
  /**
   * Custom styling for the banner
   */
  style?: StyleProp<ViewStyle>;
}

const DISMISS_STORAGE_KEY = "stale_data_banner_dismissed_at";
const DISMISS_DURATION = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Stale Data Banner Component
 *
 * Shows warning when cached data is older than threshold and user is offline
 * or hasn't refreshed in a long time.
 */
export const StaleDataBanner: React.FC<StaleDataBannerProps> = ({
  onRefresh,
  staleThresholdHours = 24,
  style,
}) => {
  const queryClient = useQueryClient();
  const { isOffline } = useNetwork();
  const { colors } = useTheme();
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasStaleData, setHasStaleData] = useState(false);
  const [oldestDataAge, setOldestDataAge] = useState<string | null>(null);

  // Refs for cleanup
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Set mounted state on mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear any pending refresh timeout on unmount
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, []);

  const checkDismissalStatus = useCallback(async () => {
    try {
      const dismissedAt = await AsyncStorage.getItem(DISMISS_STORAGE_KEY);
      if (dismissedAt) {
        const dismissedTime = parseInt(dismissedAt, 10);
        const now = Date.now();
        if (now - dismissedTime < DISMISS_DURATION) {
          setIsDismissed(true);
        } else {
          // Dismissal expired, clear it
          await AsyncStorage.removeItem(DISMISS_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.warn("Failed to check dismissal status:", error);
    }
  }, []);

  const checkStaleData = useCallback(async () => {
    const queries = queryClient.getQueryCache().getAll();
    const staleThresholdMs = staleThresholdHours * 60 * 60 * 1000;
    const now = Date.now();

    let oldestDataTimestamp = now;
    let hasAnyStaleData = false;
    const staleQueries: any[] = [];

    // Only check "list/dashboard" queries, not individual item queries
    // This prevents false positives from cached individual recipe/session views
    const relevantQueryPrefixes = [
      "dashboard",
      "recipes", // Only check if it's a list query (not ['recipes', 'specific-id'])
      "brew-sessions",
      "ingredients",
      "beer-styles",
    ];

    queries.forEach(query => {
      if (query.state.status === "success" && query.state.dataUpdatedAt) {
        const queryKey = query.queryKey;
        const firstKey = queryKey[0] as string;

        // Skip individual item queries (e.g., ['recipes', '123abc'])
        // These are meant to be cached for navigation and shouldn't trigger stale warnings
        // Individual item queries typically have exactly 2 keys where second is an ID
        // Check for common ID patterns (UUID, ObjectId, alphanumeric)
        const isIndividualItemQuery =
          queryKey.length === 2 &&
          typeof queryKey[1] === "string" &&
          /^[a-f0-9-]{8,}$/i.test(queryKey[1]); // Matches UUIDs, ObjectIds, etc.

        const isRelevantQuery =
          relevantQueryPrefixes.includes(firstKey) && !isIndividualItemQuery;

        if (!isRelevantQuery) {
          return; // Skip this query
        }

        const age = now - query.state.dataUpdatedAt;
        const ageHours = Math.floor(age / (60 * 60 * 1000));

        if (age > staleThresholdMs) {
          hasAnyStaleData = true;
          staleQueries.push({
            queryKey: query.queryKey,
            ageHours,
            dataUpdatedAt: query.state.dataUpdatedAt,
          });

          if (query.state.dataUpdatedAt < oldestDataTimestamp) {
            oldestDataTimestamp = query.state.dataUpdatedAt;
          }
        }
      }
    });

    setHasStaleData(hasAnyStaleData);

    if (hasAnyStaleData) {
      const ageHours = Math.floor(
        (now - oldestDataTimestamp) / (60 * 60 * 1000)
      );

      await UnifiedLogger.info(
        "StaleDataBanner.checkStaleData",
        "Stale data detected",
        {
          staleQueryCount: staleQueries.length,
          oldestDataAgeHours: ageHours,
          staleQueries: staleQueries.slice(0, 5), // Log first 5 stale queries
        }
      );

      if (ageHours < 48) {
        setOldestDataAge(`${ageHours}h ago`);
      } else {
        const ageDays = Math.floor(ageHours / 24);
        setOldestDataAge(`${ageDays}d ago`);
      }
    } else {
    }
  }, [queryClient, staleThresholdHours]);

  useEffect(() => {
    checkStaleData();
    checkDismissalStatus();

    // Check every 5 minutes
    const interval = setInterval(
      () => {
        checkStaleData();
        checkDismissalStatus();
      },
      5 * 60 * 1000
    );
    return () => clearInterval(interval);
  }, [checkStaleData, checkDismissalStatus]);

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString());
      setIsDismissed(true);
    } catch (error) {
      console.warn("Failed to save dismissal:", error);
    }
  };

  const handleRefresh = async () => {
    try {
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      await UnifiedLogger.info(
        "StaleDataBanner.handleRefresh",
        "Starting refresh of stale data"
      );

      // Trigger parent refresh (V2 hooks will fetch fresh data)
      if (onRefresh) {
        await Promise.resolve(onRefresh());
      }

      // Remove stale queries from cache entirely (clean slate approach)
      // This is necessary because V2 system uses AsyncStorage, not React Query for data storage
      const queries = queryClient.getQueryCache().getAll();
      const staleThresholdMs = staleThresholdHours * 60 * 60 * 1000;
      const now = Date.now();

      let removedCount = 0;
      queries.forEach(query => {
        if (query.state.status === "success" && query.state.dataUpdatedAt) {
          const age = now - query.state.dataUpdatedAt;
          if (age > staleThresholdMs) {
            queryClient.removeQueries({ queryKey: query.queryKey });
            removedCount++;
          }
        }
      });

      await UnifiedLogger.info(
        "StaleDataBanner.handleRefresh",
        "Cleared stale queries from cache",
        {
          removedCount,
        }
      );

      // Check stale data again after cleanup, only if still mounted
      refreshTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          checkStaleData();
        }
        refreshTimeoutRef.current = null;
      }, 500);
    } catch (error) {
      await UnifiedLogger.error(
        "StaleDataBanner.handleRefresh",
        "Failed to refresh data",
        { error }
      );
    }
  };

  // Only show if:
  // 1. Has stale data (older than threshold, default 24h)
  // 2. Not dismissed recently
  if (!hasStaleData || isDismissed) {
    if (hasStaleData && isDismissed) {
    } else if (!hasStaleData) {
    }
    return null;
  }

  void UnifiedLogger.info("StaleDataBanner.render", "Banner shown", {
    hasStaleData,
    isDismissed,
    oldestDataAge,
    isOffline,
  });

  // Note: We show the banner whenever data exceeds the threshold (default 24h)
  // regardless of online status. Users can dismiss it if they don't want to refresh.

  const combinedBannerStyles = [
    bannerStyles.banner,
    {
      backgroundColor: colors.warning || "#ff9800",
    },
    style,
  ];

  return (
    <View style={combinedBannerStyles} testID="stale-data-banner">
      <View style={bannerStyles.content}>
        <MaterialIcons
          name="schedule"
          size={20}
          color="#fff"
          style={bannerStyles.icon}
        />

        <View style={bannerStyles.textContainer}>
          <Text style={bannerStyles.statusText}>
            Data may be outdated {oldestDataAge}
          </Text>
          <Text style={bannerStyles.subText}>
            {isOffline
              ? "Go online to refresh"
              : "Tap refresh to get latest data"}
          </Text>
        </View>

        <View style={bannerStyles.actions}>
          {!isOffline && (
            <TouchableOpacity
              onPress={handleRefresh}
              style={bannerStyles.actionButton}
              testID="refresh-stale-data-button"
              accessible={true}
              accessibilityLabel="Refresh data"
              accessibilityRole="button"
            >
              <MaterialIcons name="refresh" size={20} color="#fff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleDismiss}
            style={bannerStyles.actionButton}
            testID="dismiss-stale-data-banner"
            accessible={true}
            accessibilityLabel="Dismiss warning"
            accessibilityRole="button"
          >
            <MaterialIcons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default StaleDataBanner;

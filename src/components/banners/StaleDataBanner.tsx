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

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useNetwork } from "@contexts/NetworkContext";
import { useTheme } from "@contexts/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { bannerStyles } from "@styles/components/banners/bannerStyles";

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
  style?: any;
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
  const [oldestDataAgeHours, setOldestDataAgeHours] = useState<number>(0);

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

  const checkStaleData = useCallback(() => {
    const queries = queryClient.getQueryCache().getAll();
    const staleThresholdMs = staleThresholdHours * 60 * 60 * 1000;
    const now = Date.now();

    let oldestDataTimestamp = now;
    let hasAnyStaleData = false;

    queries.forEach(query => {
      if (query.state.status === "success" && query.state.dataUpdatedAt) {
        const age = now - query.state.dataUpdatedAt;
        if (age > staleThresholdMs) {
          hasAnyStaleData = true;
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
      setOldestDataAgeHours(ageHours);
      if (ageHours < 48) {
        setOldestDataAge(`${ageHours}h ago`);
      } else {
        const ageDays = Math.floor(ageHours / 24);
        setOldestDataAge(`${ageDays}d ago`);
      }
    }
  }, [queryClient, staleThresholdHours]);

  useEffect(() => {
    checkStaleData();
    checkDismissalStatus();

    // Check every 5 minutes
    const interval = setInterval(checkStaleData, 5 * 60 * 1000);
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
      // Invalidate all queries to trigger refetch
      await queryClient.invalidateQueries();
      onRefresh?.();

      // Check stale data again after refresh attempt
      setTimeout(checkStaleData, 1000);
    } catch (error) {
      console.warn("Failed to refresh data:", error);
    }
  };

  // Only show if:
  // 1. Has stale data
  // 2. User is offline OR data is VERY old (>48h)
  // 3. Not dismissed recently
  if (!hasStaleData || isDismissed) {
    return null;
  }

  // If online and data isn't that old (<48h), don't show (background refresh will handle it)
  if (!isOffline && oldestDataAgeHours < 48) {
    return null;
  }

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

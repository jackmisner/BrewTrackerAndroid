/**
 * Network Status Banner Component
 *
 * Displays network connectivity status with visual indicators.
 * Shows offline banner when connection is lost and provides sync status.
 * Integrates with NetworkContext for real-time connectivity updates.
 *
 * Features:
 * - Sliding animation for smooth show/hide transitions
 * - Theme-aware styling with proper contrast
 * - Connection type indicators (WiFi, Cellular, etc.)
 * - Manual refresh/sync trigger
 * - Accessibility support
 *
 * @example
 * ```typescript
 * // Add to app layout or individual screens
 * <NetworkStatusBanner />
 * ```
 */

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNetwork } from "@contexts/NetworkContext";
import { useTheme } from "@contexts/ThemeContext";
import {
  bannerStyles,
  indicatorStyles,
} from "@styles/components/banners/bannerStyles";

interface NetworkStatusBannerProps {
  /**
   * Optional callback when user taps the banner for manual sync
   */
  onRetry?: () => void;
  /**
   * Show connection type details (WiFi, Cellular, etc.)
   */
  showConnectionType?: boolean;
  /**
   * Custom styling for the banner
   */
  style?: any;
}

/**
 * Network Status Banner Component
 *
 * Displays current network connectivity status with visual feedback.
 * Automatically shows/hides based on connection state changes.
 */
export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({
  onRetry,
  showConnectionType = false,
  style,
}) => {
  const { isConnected, isOffline, connectionType, refreshNetworkState } =
    useNetwork();
  const { colors } = useTheme();

  // Only show banner when offline
  if (isConnected) {
    return null;
  }

  const handleRetry = async () => {
    try {
      await refreshNetworkState();
      onRetry?.();
    } catch (error) {
      console.warn("Failed to refresh network state:", error);
    }
  };

  const getConnectionIcon = () => {
    if (isOffline) {
      return "wifi-off";
    }

    switch (connectionType) {
      case "wifi":
        return "wifi";
      case "cellular":
        return "signal-cellular-4-bar";
      default:
        return "signal-cellular-connected-no-internet-4-bar";
    }
  };

  const getStatusText = () => {
    if (isOffline) {
      return "No internet connection";
    }

    if (showConnectionType && connectionType !== "unknown") {
      return `Connected via ${connectionType}`;
    }

    return "Limited connectivity";
  };

  const combinedBannerStyles = [
    bannerStyles.banner,
    {
      backgroundColor: colors.error || "#f44336",
    },
    style,
  ];

  return (
    <View style={combinedBannerStyles} testID="network-status-banner">
      <View style={bannerStyles.content}>
        <MaterialIcons
          name={getConnectionIcon()}
          size={20}
          color="#fff"
          style={bannerStyles.icon}
        />

        <View style={bannerStyles.textContainer}>
          <Text style={bannerStyles.statusText}>{getStatusText()}</Text>
          <Text style={bannerStyles.subText}>
            Some features may be unavailable
          </Text>
        </View>

        {onRetry && (
          <TouchableOpacity
            onPress={handleRetry}
            style={bannerStyles.actionButton}
            testID="retry-connection-button"
            accessible={true}
            accessibilityLabel="Retry connection"
            accessibilityRole="button"
          >
            <MaterialIcons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

/**
 * Compact Network Status Indicator
 *
 * Minimal version for use in headers or status bars.
 */
export const NetworkStatusIndicator: React.FC<{
  showText?: boolean;
  onPress?: () => void;
}> = ({ showText = true, onPress }) => {
  const { isConnected, connectionType } = useNetwork();
  const { colors } = useTheme();

  const getIndicatorColor = () => {
    if (isConnected) {
      return colors.success || "#4caf50";
    }
    return colors.error || "#f44336";
  };

  const getIndicatorIcon = () => {
    if (isConnected) {
      return connectionType === "wifi" ? "wifi" : "signal-cellular-4-bar";
    }
    return "wifi-off";
  };

  const content = (
    <View style={indicatorStyles.indicator} testID="network-status-indicator">
      <MaterialIcons
        name={getIndicatorIcon()}
        size={16}
        color={getIndicatorColor()}
      />
      {showText && (
        <Text
          style={[
            indicatorStyles.indicatorText,
            { color: getIndicatorColor() },
          ]}
        >
          {isConnected ? "Online" : "Offline"}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        accessible={true}
        accessibilityLabel={`Network status: ${isConnected ? "Online" : "Offline"}`}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export default NetworkStatusBanner;

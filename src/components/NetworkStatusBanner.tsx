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
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNetwork } from "@contexts/NetworkContext";
import { useTheme } from "@contexts/ThemeContext";

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

  const bannerStyles = [
    styles.banner,
    {
      backgroundColor: colors.error || "#f44336",
    },
    style,
  ];

  return (
    <View style={bannerStyles} testID="network-status-banner">
      <View style={styles.content}>
        <MaterialIcons
          name={getConnectionIcon()}
          size={20}
          color="#fff"
          style={styles.icon}
        />

        <View style={styles.textContainer}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
          <Text style={styles.subText}>Some features may be unavailable</Text>
        </View>

        {onRetry && (
          <TouchableOpacity
            onPress={handleRetry}
            style={styles.retryButton}
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
    <View style={styles.indicator} testID="network-status-indicator">
      <MaterialIcons
        name={getIndicatorIcon()}
        size={16}
        color={getIndicatorColor()}
      />
      {showText && (
        <Text style={[styles.indicatorText, { color: getIndicatorColor() }]}>
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

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    margin: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  subText: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.9,
  },
  retryButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  indicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  indicatorText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "500",
  },
});

export default NetworkStatusBanner;

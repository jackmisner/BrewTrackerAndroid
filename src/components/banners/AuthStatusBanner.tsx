/**
 * Auth Status Banner Component
 *
 * Displays authentication status warnings to the user based on their
 * current auth state. Shows different messages for expired sessions
 * and unauthenticated users.
 *
 * Features:
 * - Automatic detection of auth status changes
 * - Different colors/messages for expired vs unauthenticated
 * - Re-authentication button for expired sessions
 * - Login button for unauthenticated users
 * - Theme-aware styling with proper contrast
 * - Only shows when auth action is needed
 *
 * Auth States:
 * - authenticated: No banner (full access)
 * - expired: Warning banner with re-auth option (read-only mode)
 * - unauthenticated: Info banner with login button (login required)
 *
 * @example
 * ```typescript
 * // Add to app root layout
 * <AuthStatusBanner onReAuth={() => setShowReAuthModal(true)} />
 * ```
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@contexts/AuthContext";
import { useTheme } from "@contexts/ThemeContext";
import { bannerStyles } from "@styles/components/banners/bannerStyles";

interface AuthStatusBannerProps {
  /**
   * Optional callback when user taps re-authenticate button
   * If not provided, will show login screen
   */
  onReAuth?: () => void;
  /**
   * Custom styling for the banner
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * Auth Status Banner Component
 *
 * Shows warning when user's session is expired or they're not authenticated.
 */
export const AuthStatusBanner: React.FC<AuthStatusBannerProps> = ({
  onReAuth,
  style,
}) => {
  const { authStatus, user } = useAuth();
  const { colors } = useTheme();

  const handleLoginPress = useCallback(() => {
    router.push("/(auth)/login");
  }, []);

  const handleReAuthPress = useCallback(() => {
    if (onReAuth) {
      onReAuth();
    } else {
      // Default: navigate to login screen
      router.push("/(auth)/login");
    }
  }, [onReAuth]);

  // Don't show banner if fully authenticated
  if (authStatus === "authenticated") {
    return null;
  }

  // Determine banner appearance based on auth status
  const isExpired = authStatus === "expired";

  const bannerConfig = isExpired
    ? {
        backgroundColor: colors.warning || "#ff9800",
        icon: "warning" as const,
        title: "Session Expired",
        subtitle: "Read-only mode - Sign in to save changes",
        buttonText: "Re-authenticate",
        onPress: handleReAuthPress,
        testId: "auth-status-banner-expired",
      }
    : {
        backgroundColor: colors.info || "#2196f3",
        icon: "info" as const,
        title: "Not Authenticated",
        subtitle: user
          ? "Limited access - Sign in for full features"
          : "Sign in to access all features",
        buttonText: "Sign In",
        onPress: handleLoginPress,
        testId: "auth-status-banner-unauthenticated",
      };

  const combinedBannerStyles = [
    bannerStyles.banner,
    {
      backgroundColor: bannerConfig.backgroundColor,
    },
    style,
  ];

  return (
    <View style={combinedBannerStyles} testID={bannerConfig.testId}>
      <View style={bannerStyles.content}>
        <MaterialIcons
          name={bannerConfig.icon}
          size={20}
          color="#fff"
          style={bannerStyles.icon}
        />

        <View style={bannerStyles.textContainer}>
          <Text style={bannerStyles.statusText}>{bannerConfig.title}</Text>
          <Text style={bannerStyles.subText}>{bannerConfig.subtitle}</Text>
        </View>

        <TouchableOpacity
          onPress={bannerConfig.onPress}
          style={bannerStyles.actionButton}
          testID={`${bannerConfig.testId}-action-button`}
          accessible={true}
          accessibilityLabel={bannerConfig.buttonText}
          accessibilityRole="button"
        >
          <MaterialIcons name="login" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AuthStatusBanner;

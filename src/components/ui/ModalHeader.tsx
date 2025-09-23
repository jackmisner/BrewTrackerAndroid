/**
 * ModalHeader Component
 *
 * A reusable header component for modal screens that provides consistent navigation
 * with back button on the left, title in the center, and home button on the right.
 *
 * Features:
 * - Consistent styling across all modals
 * - Back navigation with custom onBack handler
 * - Home button for quick navigation to dashboard
 * - Proper cache invalidation when navigating home
 * - Optional right-side action buttons
 * - Theme-aware styling
 */

import React from "react";
import { View, Text, TouchableOpacity, ViewStyle } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

import { useTheme } from "@contexts/ThemeContext";
import { QUERY_KEYS } from "@services/api/queryClient";
import { createModalHeaderStyles } from "@styles/components/modalHeaderStyles";
import { TEST_IDS } from "@src/constants/testIDs";

export interface ModalHeaderProps {
  title: string;
  onBack?: () => void;
  rightActions?: React.ReactNode;
  showHomeButton?: boolean;
  containerStyle?: ViewStyle;
  testID?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  onBack,
  rightActions,
  showHomeButton = true,
  containerStyle,
  testID = "modal-header",
}) => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const styles = createModalHeaderStyles(theme);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleHomeNavigation = () => {
    // Invalidate dashboard cache to ensure fresh data
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });

    // Navigate directly to dashboard tab using explicit pathname
    // This should provide smooth navigation without splash screen
    router.push({ pathname: "/(tabs)" });
  };

  const renderRightContent = () => {
    if (rightActions) {
      return rightActions;
    }

    if (showHomeButton) {
      return (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleHomeNavigation}
          testID={TEST_IDS.patterns.touchableOpacityAction(`${testID}-home`)}
        >
          <MaterialIcons name="home" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      );
    }

    // Empty spacer to maintain layout balance
    return <View style={styles.headerButton} />;
  };

  return (
    <View style={[styles.header, containerStyle]} testID={testID}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.headerButton}
        onPress={handleBack}
        testID={TEST_IDS.patterns.touchableOpacityAction(`${testID}-back`)}
      >
        <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>

      {/* Right Actions or Home Button */}
      {renderRightContent()}
    </View>
  );
};

export default ModalHeader;

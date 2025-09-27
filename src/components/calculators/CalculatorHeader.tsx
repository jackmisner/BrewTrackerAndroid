/**
 * CalculatorHeader Component
 *
 * Standardized header component for all calculator screens. Provides
 * consistent navigation, theming, and accessibility across calculator
 * modals with safe area handling and responsive design.
 *
 * Features:
 * - Consistent close button with navigation
 * - Centered title with calculator name
 * - Safe area inset handling for different devices
 * - Themed styling with primary color background
 * - Accessibility support with proper labels and hit targets
 * - Custom close handler support
 * - Router-based navigation fallback
 * - Touch-friendly button sizing
 *
 * Design:
 * - Three-column layout: Close | Title | Spacer
 * - Primary color background with contrasting text
 * - Material Icons for consistent visual language
 * - Safe area padding for notched devices
 * - 48dp minimum touch target for accessibility
 *
 * @example
 * Basic usage in calculator screens:
 * ```typescript
 * <CalculatorHeader title="ABV Calculator" />
 * ```
 *
 * @example
 * With custom close handler:
 * ```typescript
 * <CalculatorHeader
 *   title="Strike Water Calculator"
 *   onClose={() => {
 *     // Save state before closing
 *     saveCalculatorState();
 *     router.back();
 *   }}
 * />
 * ```
 */

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@contexts/ThemeContext";
import { useRouter } from "expo-router";
import { createCalculatorHeaderStyles } from "@styles/components/calculators/calculatorHeaderStyles";

/**
 * Props for the CalculatorHeader component
 * @interface CalculatorHeaderProps
 */
interface CalculatorHeaderProps {
  /** Calculator title to display in the header */
  title: string;
  /** Optional custom close handler (defaults to router.back()) */
  onClose?: () => void;
}

export function CalculatorHeader({ title, onClose }: CalculatorHeaderProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const calculatorHeaderStyles = createCalculatorHeaderStyles(insets);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        calculatorHeaderStyles.header,
        { backgroundColor: theme.colors.primary },
      ]}
    >
      <TouchableOpacity
        onPress={handleClose}
        style={calculatorHeaderStyles.headerButton}
        accessibilityRole="button"
        accessibilityLabel="Close calculator"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons
          name="close"
          size={24}
          color={theme.colors.primaryText}
        />
      </TouchableOpacity>

      <Text
        style={[
          calculatorHeaderStyles.headerTitle,
          { color: theme.colors.primaryText },
        ]}
      >
        {title}
      </Text>

      <View style={calculatorHeaderStyles.headerButton} />
    </View>
  );
}

/**
 * CalculatorCard Component
 *
 * Themed card container component designed for calculator screens.
 * Provides consistent styling and layout for calculator inputs and results
 * with a title header and content area.
 *
 * Features:
 * - Themed background and border colors
 * - Title header with consistent typography
 * - Flexible content area for any child components
 * - Optional style override support
 * - Responsive to theme changes
 *
 * @example
 * Basic usage:
 * ```typescript
 * <CalculatorCard title="Strike Water Calculator">
 *   <NumberInput label="Grain Weight" value={weight} onChangeText={setWeight} />
 *   <NumberInput label="Target Temp" value={temp} onChangeText={setTemp} />
 *   <ResultDisplay result={result} />
 * </CalculatorCard>
 * ```
 */

import React from "react";
import { View, Text, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "@contexts/ThemeContext";
import { calculatorCardStyles } from "@styles/components/calculators/calculatorCardStyles";

/**
 * Props for the CalculatorCard component
 * @interface CalculatorCardProps
 */
interface CalculatorCardProps {
  /** Title displayed at the top of the card */
  title: string;
  /** Content to display inside the card */
  children: React.ReactNode;
  /** Additional styles to apply to the card container */
  style?: StyleProp<ViewStyle>;
}

export function CalculatorCard({
  title,
  children,
  style,
}: CalculatorCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        calculatorCardStyles.card,
        {
          backgroundColor: theme.colors.backgroundSecondary,
          borderColor: theme.colors.borderLight,
        },
        style,
      ]}
    >
      <Text style={[calculatorCardStyles.title, { color: theme.colors.text }]}>
        {title}
      </Text>
      <View style={calculatorCardStyles.content}>{children}</View>
    </View>
  );
}

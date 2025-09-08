import React from "react";
import { View, Text, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "@contexts/ThemeContext";
import { calculatorCardStyles } from "@styles/components/calculators/calculatorCardStyles";

interface CalculatorCardProps {
  title: string;
  children: React.ReactNode;
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

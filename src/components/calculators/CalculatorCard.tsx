import React from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "@contexts/ThemeContext";

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
        styles.card,
        {
          backgroundColor: theme.colors.backgroundSecondary,
          borderColor: theme.colors.borderLight,
        },
        style,
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  content: {
    gap: 12,
  },
});

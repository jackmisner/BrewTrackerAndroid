import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";

interface ResultItem {
  label: string;
  value: string | number;
  unit?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  precision?: number;
}

interface ResultDisplayProps {
  results: ResultItem[];
  title?: string;
  style?: ViewStyle;
  highlight?: boolean;
}

export function ResultDisplay({
  results,
  title = "Results",
  style,
  highlight = false,
}: ResultDisplayProps) {
  const theme = useTheme();

  const formatValue = (
    value: string | number,
    precision: number = 2
  ): string => {
    if (typeof value === "string") return value;
    if (typeof value !== "number") return "-";

    return precision === 0
      ? Math.round(value).toString()
      : value.toFixed(precision);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: highlight
            ? theme.colors.primaryLight10
            : theme.colors.backgroundSecondary,
          borderColor: highlight
            ? theme.colors.primaryLight40
            : theme.colors.borderLight,
        },
        style,
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>

      <View style={styles.resultsList}>
        {results.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <View style={styles.resultLabelContainer}>
              {result.icon && (
                <MaterialIcons
                  name={result.icon}
                  size={18}
                  color={theme.colors.textSecondary}
                  style={styles.resultIcon}
                />
              )}
              <Text
                style={[
                  styles.resultLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {result.label}
              </Text>
            </View>

            <View style={styles.resultValueContainer}>
              <Text
                style={[
                  styles.resultValue,
                  {
                    color: highlight ? theme.colors.primary : theme.colors.text,
                    fontWeight: highlight ? "600" : "500",
                  },
                ]}
              >
                {formatValue(result.value, result.precision)}
              </Text>
              {result.unit && (
                <Text
                  style={[
                    styles.resultUnit,
                    {
                      color: highlight
                        ? theme.colors.primary
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {result.unit}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

interface SingleResultProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  precision?: number;
  size?: "small" | "medium" | "large";
  style?: ViewStyle;
}

export function SingleResult({
  label,
  value,
  unit,
  icon,
  precision = 2,
  size = "medium",
  style,
}: SingleResultProps) {
  const theme = useTheme();

  const sizeStyles = {
    small: {
      valueSize: 18,
      labelSize: 12,
      unitSize: 14,
      padding: 12,
    },
    medium: {
      valueSize: 24,
      labelSize: 14,
      unitSize: 16,
      padding: 16,
    },
    large: {
      valueSize: 32,
      labelSize: 16,
      unitSize: 18,
      padding: 20,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.singleResultContainer,
        {
          backgroundColor: theme.colors.primaryLight10,
          borderColor: theme.colors.primaryLight30,
          padding: currentSize.padding,
        },
        style,
      ]}
    >
      <View style={styles.singleResultHeader}>
        {icon && (
          <MaterialIcons
            name={icon}
            size={currentSize.labelSize + 4}
            color={theme.colors.textSecondary}
            style={styles.singleResultIcon}
          />
        )}
        <Text
          style={[
            styles.singleResultLabel,
            {
              color: theme.colors.textSecondary,
              fontSize: currentSize.labelSize,
            },
          ]}
        >
          {label}
        </Text>
      </View>

      <View style={styles.singleResultValueContainer}>
        <Text
          style={[
            styles.singleResultValue,
            {
              color: theme.colors.primary,
              fontSize: currentSize.valueSize,
            },
          ]}
        >
          {typeof value === "number"
            ? precision === 0
              ? Math.round(value)
              : value.toFixed(precision)
            : value}
        </Text>
        {unit && (
          <Text
            style={[
              styles.singleResultUnit,
              {
                color: theme.colors.primary,
                fontSize: currentSize.unitSize,
              },
            ]}
          >
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  resultsList: {
    gap: 8,
  },
  resultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  resultLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  resultIcon: {
    marginRight: 6,
  },
  resultLabel: {
    fontSize: 14,
  },
  resultValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  resultValue: {
    fontSize: 16,
    textAlign: "right",
  },
  resultUnit: {
    fontSize: 12,
  },

  // Single result styles
  singleResultContainer: {
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    marginVertical: 8,
  },
  singleResultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  singleResultIcon: {
    marginRight: 6,
  },
  singleResultLabel: {
    fontWeight: "500",
  },
  singleResultValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  singleResultValue: {
    fontWeight: "bold",
  },
  singleResultUnit: {
    fontWeight: "500",
  },
});

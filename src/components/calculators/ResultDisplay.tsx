import React from "react";
import { View, Text, StyleProp, ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";
import { resultDisplayStyles } from "@styles/components/calculators/resultDisplayStyles";

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
  style?: StyleProp<ViewStyle>;
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
    if (typeof value === "string") {
      return value;
    }
    if (typeof value !== "number") {
      return "-";
    }

    return precision === 0
      ? Math.round(value).toString()
      : value.toFixed(precision);
  };

  return (
    <View
      style={[
        resultDisplayStyles.container,
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
      <Text style={[resultDisplayStyles.title, { color: theme.colors.text }]}>
        {title}
      </Text>

      <View style={resultDisplayStyles.resultsList}>
        {results.map((result, index) => (
          <View key={index} style={resultDisplayStyles.resultItem}>
            <View style={resultDisplayStyles.resultLabelContainer}>
              {result.icon && (
                <MaterialIcons
                  name={result.icon}
                  size={18}
                  color={theme.colors.textSecondary}
                  style={resultDisplayStyles.resultIcon}
                />
              )}
              <Text
                style={[
                  resultDisplayStyles.resultLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {result.label}
              </Text>
            </View>

            <View style={resultDisplayStyles.resultValueContainer}>
              <Text
                style={[
                  resultDisplayStyles.resultValue,
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
                    resultDisplayStyles.resultUnit,
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
  style?: StyleProp<ViewStyle>;
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
        resultDisplayStyles.singleResultContainer,
        {
          backgroundColor: theme.colors.primaryLight10,
          borderColor: theme.colors.primaryLight30,
          padding: currentSize.padding,
        },
        style,
      ]}
    >
      <View style={resultDisplayStyles.singleResultHeader}>
        {icon && (
          <MaterialIcons
            name={icon}
            size={currentSize.labelSize + 4}
            color={theme.colors.textSecondary}
            style={resultDisplayStyles.singleResultIcon}
          />
        )}
        <Text
          style={[
            resultDisplayStyles.singleResultLabel,
            {
              color: theme.colors.textSecondary,
              fontSize: currentSize.labelSize,
            },
          ]}
        >
          {label}
        </Text>
      </View>

      <View style={resultDisplayStyles.singleResultValueContainer}>
        <Text
          style={[
            resultDisplayStyles.singleResultValue,
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
              resultDisplayStyles.singleResultUnit,
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

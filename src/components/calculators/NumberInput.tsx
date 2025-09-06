import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";
import { TEST_IDS } from "@constants/testIDs";

interface NumberInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  unit?: string;
  onUnitPress?: () => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  style?: ViewStyle;
  disabled?: boolean;
  helperText?: string;
  error?: string;
  testID?: string;
}

export function NumberInput({
  label,
  value,
  onChangeText,
  placeholder,
  unit,
  onUnitPress,
  min,
  max,
  step = 0.1,
  precision = 2,
  style,
  disabled = false,
  helperText,
  error,
  testID,
}: NumberInputProps) {
  const theme = useTheme();

  const handleStepUp = () => {
    const currentValue = parseFloat(value) || 0;
    const newValue = Math.min(max ?? Infinity, currentValue + step);
    onChangeText(newValue.toFixed(precision));
  };

  const handleStepDown = () => {
    const currentValue = parseFloat(value) || 0;
    const newValue = Math.max(min ?? 0, currentValue - step);
    onChangeText(newValue.toFixed(precision));
  };

  const handleTextChange = (text: string) => {
    // Remove non-numeric characters, allowing only valid number patterns
    let cleanedText = text.replace(/[^\d.-]/g, "");

    // Ensure only one decimal point
    const parts = cleanedText.split(".");
    if (parts.length > 2) {
      cleanedText = parts[0] + "." + parts.slice(1).join("");
    }

    // Ensure minus sign is only at the beginning
    const minusCount = (cleanedText.match(/-/g) || []).length;
    if (minusCount > 1) {
      cleanedText = "-" + cleanedText.replace(/-/g, "");
    } else if (cleanedText.indexOf("-") > 0) {
      cleanedText = cleanedText.replace(/-/g, "");
    }

    // Enforce min/max bounds at input level
    if (cleanedText && cleanedText !== "-" && cleanedText !== ".") {
      const numValue = parseFloat(cleanedText);
      if (isFinite(numValue)) {
        if (min !== undefined && numValue < min) {
          cleanedText = min.toString();
        } else if (max !== undefined && numValue > max) {
          cleanedText = max.toString();
        }
      }
    }

    onChangeText(cleanedText);
  };

  const inputBorderColor = error
    ? theme.colors.error
    : theme.colors.borderLight;

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.background,
            borderColor: inputBorderColor,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.text,
            },
          ]}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="numeric"
          editable={!disabled}
          testID={testID}
        />

        <View style={styles.controls}>
          {(min !== undefined || max !== undefined) && (
            <View style={styles.steppers}>
              <TouchableOpacity
                style={[
                  styles.stepperButton,
                  { backgroundColor: theme.colors.backgroundSecondary },
                ]}
                onPress={handleStepDown}
                disabled={
                  disabled || (min !== undefined && parseFloat(value) <= min)
                }
                testID={TEST_IDS.patterns.touchableOpacityAction("step-down")}
              >
                <MaterialIcons
                  name="remove"
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.stepperButton,
                  { backgroundColor: theme.colors.backgroundSecondary },
                ]}
                onPress={handleStepUp}
                disabled={
                  disabled || (max !== undefined && parseFloat(value) >= max)
                }
                testID={TEST_IDS.patterns.touchableOpacityAction("step-up")}
              >
                <MaterialIcons
                  name="add"
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          )}

          {unit && (
            <TouchableOpacity
              style={[
                styles.unitButton,
                {
                  backgroundColor: onUnitPress
                    ? theme.colors.primaryLight20
                    : theme.colors.backgroundSecondary,
                },
              ]}
              onPress={onUnitPress}
              disabled={!onUnitPress}
              testID={TEST_IDS.patterns.touchableOpacityAction("unit")}
            >
              <Text
                style={[
                  styles.unitText,
                  {
                    color: onUnitPress
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                  },
                ]}
              >
                {unit}
              </Text>
              {onUnitPress && (
                <MaterialIcons
                  name="expand-more"
                  size={16}
                  color={theme.colors.primary}
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {error && (
        <Text style={[styles.helperText, { color: theme.colors.error }]}>
          {error}
        </Text>
      )}

      {helperText && !error && (
        <Text
          style={[styles.helperText, { color: theme.colors.textSecondary }]}
        >
          {helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  steppers: {
    flexDirection: "row",
    gap: 4,
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  unitButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  unitText: {
    fontSize: 14,
    fontWeight: "500",
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

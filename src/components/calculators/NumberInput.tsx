import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";
import { TEST_IDS } from "@constants/testIDs";
import { numberInputStyles } from "@styles/components/calculators/numberInputStyles";

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
  // New validation modes
  validationMode?: "hard" | "soft"; // hard = immediate clamp, soft = allow input with warnings
  normalMin?: number; // warning threshold for "normal" range
  normalMax?: number; // warning threshold for "normal" range
  warningText?: string; // custom warning message for out-of-normal range
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
  validationMode = "hard",
  normalMin,
  normalMax,
  warningText,
}: NumberInputProps) {
  const theme = useTheme();

  const handleStepUp = () => {
    const currentValue = parseFloat(value);
    const base = Number.isFinite(currentValue) ? currentValue : (min ?? 0);
    const next = base + step;
    const rounded = Number(next.toFixed(precision)); // round first
    const clamped = Math.min(
      max ?? Infinity,
      Math.max(min ?? -Infinity, rounded)
    );
    onChangeText(clamped.toFixed(precision));
  };

  const handleStepDown = () => {
    const currentValue = parseFloat(value);
    const base = Number.isFinite(currentValue) ? currentValue : (min ?? 0);
    const next = base - step;
    const rounded = Number(next.toFixed(precision)); // round first
    const clamped = Math.max(
      min ?? -Infinity,
      Math.min(max ?? Infinity, rounded)
    );
    onChangeText(clamped.toFixed(precision));
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

    // Apply validation based on mode
    if (validationMode === "hard") {
      // Hard mode: Enforce min/max bounds at input level (original behavior)
      if (cleanedText && cleanedText !== "-" && cleanedText !== ".") {
        const numValue = parseFloat(cleanedText);
        if (Number.isFinite(numValue)) {
          if (min !== undefined && numValue < min) {
            cleanedText = min.toFixed(precision);
          } else if (max !== undefined && numValue > max) {
            cleanedText = max.toFixed(precision);
          }
        }
      }
    }
    // Soft mode: Allow all input, warnings will be shown below

    onChangeText(cleanedText);
  };

  // Determine warning state for soft validation
  const getValidationState = () => {
    if (error) {
      return { type: "error", message: error };
    }

    if (validationMode === "soft" && value && value !== "-" && value !== ".") {
      const numValue = parseFloat(value);
      if (isFinite(numValue)) {
        // Check absolute bounds (still enforce absolute limits)
        if (min !== undefined && numValue < min) {
          return { type: "error", message: `Value must be at least ${min}` };
        }
        if (max !== undefined && numValue > max) {
          return {
            type: "error",
            message: `Value must be no more than ${max}`,
          };
        }

        // Check normal range (show warnings)
        if (normalMin !== undefined && numValue < normalMin) {
          return {
            type: "warning",
            message:
              warningText ||
              (normalMax !== undefined
                ? `Value below typical range (${normalMin.toFixed(precision)} - ${normalMax.toFixed(precision)})`
                : `Value below typical minimum (${normalMin.toFixed(precision)})`),
          };
        }
        if (normalMax !== undefined && numValue > normalMax) {
          return {
            type: "warning",
            message:
              warningText ||
              (normalMin !== undefined
                ? `Value above typical range (${normalMin.toFixed(precision)} - ${normalMax.toFixed(precision)})`
                : `Value above typical maximum (${normalMax.toFixed(precision)})`),
          };
        }
      }
    }

    return null;
  };

  const validationState = getValidationState();

  const inputBorderColor =
    validationState?.type === "error"
      ? theme.colors.error
      : validationState?.type === "warning"
        ? theme.colors.warning
        : theme.colors.borderLight;

  return (
    <View style={[numberInputStyles.container, style]}>
      <Text style={[numberInputStyles.label, { color: theme.colors.text }]}>
        {label}
      </Text>

      <View
        style={[
          numberInputStyles.inputContainer,
          {
            backgroundColor: theme.colors.background,
            borderColor: inputBorderColor,
          },
        ]}
      >
        <TextInput
          style={[
            numberInputStyles.input,
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

        <View style={numberInputStyles.controls}>
          {(min !== undefined || max !== undefined) && (
            <View style={numberInputStyles.steppers}>
              <TouchableOpacity
                style={[
                  numberInputStyles.stepperButton,
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
                  numberInputStyles.stepperButton,
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
                numberInputStyles.unitButton,
                {
                  backgroundColor: onUnitPress
                    ? theme.colors.primaryLight20
                    : theme.colors.backgroundSecondary,
                },
              ]}
              onPress={onUnitPress}
              disabled={disabled || !onUnitPress}
              testID={TEST_IDS.patterns.touchableOpacityAction("unit")}
            >
              <Text
                style={[
                  numberInputStyles.unitText,
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

      {validationState && (
        <Text
          style={[
            numberInputStyles.helperText,
            {
              color:
                validationState.type === "error"
                  ? theme.colors.error
                  : validationState.type === "warning"
                    ? theme.colors.warning
                    : theme.colors.textSecondary,
            },
          ]}
        >
          {validationState.message}
        </Text>
      )}

      {helperText && !validationState && (
        <Text
          style={[
            numberInputStyles.helperText,
            { color: theme.colors.textSecondary },
          ]}
        >
          {helperText}
        </Text>
      )}
    </View>
  );
}

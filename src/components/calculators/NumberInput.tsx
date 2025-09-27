/**
 * NumberInput Component
 *
 * Advanced numeric input component designed for calculator screens and forms
 * requiring precise numeric input with validation, step controls, and units.
 * Supports both hard and soft validation modes for flexible user experience.
 *
 * Features:
 * - Numeric input with automatic formatting and validation
 * - Step up/down controls with configurable precision
 * - Unit display with optional toggle functionality
 * - Hard validation: Enforces min/max bounds at input level
 * - Soft validation: Allows input with warning messages
 * - Normal range warnings for values outside typical ranges
 * - Error and helper text display with color coding
 * - Themed styling with border color feedback
 * - Disabled state support
 * - Test ID integration for automated testing
 *
 * @example
 * Basic usage:
 * ```typescript
 * <NumberInput
 *   label="Temperature"
 *   value={temperature}
 *   onChangeText={setTemperature}
 *   unit="°F"
 *   min={32}
 *   max={212}
 *   step={1}
 *   precision={1}
 * />
 * ```
 *
 * @example
 * Soft validation with warning ranges:
 * ```typescript
 * <NumberInput
 *   label="Gravity"
 *   value={gravity}
 *   onChangeText={setGravity}
 *   validationMode="soft"
 *   min={1.000}
 *   max={1.150}
 *   normalMin={1.020}
 *   normalMax={1.120}
 *   warningText="OG outside typical brewing range (1.020-1.120). Valid for low/no-alcohol brewing."
 * />
 * ```
 */

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

/**
 * Props for the NumberInput component
 * @interface NumberInputProps
 */
interface NumberInputProps {
  /** Input label displayed above the field */
  label: string;
  /** Current input value as string */
  value: string;
  /** Callback fired when input value changes */
  onChangeText: (text: string) => void;
  /** Placeholder text for empty input */
  placeholder?: string;
  /** Unit label displayed as button (e.g., "°F", "gal") */
  unit?: string;
  /** Callback fired when unit button is pressed (enables unit toggle) */
  onUnitPress?: () => void;
  /** Minimum allowed value (enforced based on validationMode) */
  min?: number;
  /** Maximum allowed value (enforced based on validationMode) */
  max?: number;
  /** Step increment for +/- buttons (default: 0.1) */
  step?: number;
  /** Decimal precision for display (default: 2) */
  precision?: number;
  /** Additional styles for the container */
  style?: ViewStyle;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Helper text displayed below input when no errors */
  helperText?: string;
  /** Error message displayed below input (overrides helperText) */
  error?: string;
  /** Test ID for automated testing */
  testID?: string;
  /** Validation mode: "hard" enforces bounds immediately, "soft" allows input with warnings */
  validationMode?: "hard" | "soft";
  /** Lower bound for "normal" range (triggers warning in soft mode) */
  normalMin?: number;
  /** Upper bound for "normal" range (triggers warning in soft mode) */
  normalMax?: number;
  /** Custom warning message for out-of-normal range values */
  warningText?: string;
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

  /**
   * Increases the input value by the step amount
   * Respects min/max bounds and precision settings
   */
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

  /**
   * Decreases the input value by the step amount
   * Respects min/max bounds and precision settings
   */
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

  /**
   * Handles text input changes with validation and cleaning
   * Removes invalid characters and applies validation based on mode
   * @param text - Raw input text from TextInput
   */
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

  /**
   * Determines the current validation state and message
   * Returns error/warning state based on validation mode and ranges
   * @returns Validation state object or null if no issues
   */
  const getValidationState = () => {
    if (error) {
      return { type: "error", message: error };
    }

    if (validationMode === "soft" && value && value !== "-" && value !== ".") {
      const numValue = parseFloat(value);
      if (isFinite(numValue)) {
        // Check absolute bounds (still enforce absolute limits)
        if (min !== undefined && numValue < min) {
          return {
            type: "error",
            message: `Value must be at least ${(min as number).toFixed(precision)}`,
          };
        }
        if (max !== undefined && numValue > max) {
          return {
            type: "error",
            message: `Value must be no more than ${(max as number).toFixed(precision)}`,
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

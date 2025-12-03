/**
 * UnitToggle and DropdownToggle Components
 *
 * Flexible unit selection components for calculator screens. UnitToggle
 * provides a segmented control style for 2-3 options, while DropdownToggle
 * offers a modal picker for larger option sets.
 *
 * Features:
 * - Segmented control design with active state highlighting
 * - Modal dropdown with search and selection capabilities
 * - Optional labels and descriptions for options
 * - Disabled state support
 * - Themed styling with adaptive colors
 * - Test ID integration for automated testing
 * - Touch-friendly design with proper hit targets
 *
 * @example
 * UnitToggle for temperature units:
 * ```typescript
 * <UnitToggle
 *   label="Temperature Unit"
 *   value={tempUnit}
 *   onChange={setTempUnit}
 *   options={[
 *     { label: "°F", value: "F", description: "Fahrenheit" },
 *     { label: "°C", value: "C", description: "Celsius" }
 *   ]}
 * />
 * ```
 *
 * @example
 * DropdownToggle for formula selection:
 * ```typescript
 * <DropdownToggle
 *   label="Calculation Method"
 *   value={formula}
 *   onChange={setFormula}
 *   options={[
 *     { label: "Simple", value: "simple", description: "Standard formula" },
 *     { label: "Advanced", value: "advanced", description: "More accurate" }
 *   ]}
 * />
 * ```
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";
import { TEST_IDS } from "@constants/testIDs";
import { unitToggleStyles } from "@styles/components/calculators/unitToggleStyles";

/**
 * Props for the UnitToggle component
 * @interface UnitToggleProps
 */
interface UnitToggleProps {
  /** Currently selected value */
  value: string;
  /** Array of selectable options with labels and values */
  options: { label: string; value: string; description?: string }[];
  /** Callback fired when selection changes */
  onChange: (value: string) => void;
  /** Additional styles for the container */
  style?: StyleProp<ViewStyle>;
  /** Optional label displayed above the toggle */
  label?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
}

export function UnitToggle({
  value,
  options,
  onChange,
  style,
  label,
  disabled = false,
}: UnitToggleProps) {
  const theme = useTheme();

  return (
    <View style={[unitToggleStyles.container, style]}>
      {label && (
        <Text style={[unitToggleStyles.label, { color: theme.colors.text }]}>
          {label}
        </Text>
      )}

      <View
        style={[
          unitToggleStyles.toggleContainer,
          {
            backgroundColor: theme.colors.backgroundSecondary,
            borderColor: theme.colors.borderLight,
          },
        ]}
      >
        {options.map((option, index) => {
          const isSelected = value === option.value;
          const isFirst = index === 0;
          const isLast = index === options.length - 1;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                unitToggleStyles.toggleButton,
                {
                  backgroundColor: isSelected
                    ? theme.colors.primary
                    : "transparent",
                  borderTopLeftRadius: isFirst ? 6 : 0,
                  borderBottomLeftRadius: isFirst ? 6 : 0,
                  borderTopRightRadius: isLast ? 6 : 0,
                  borderBottomRightRadius: isLast ? 6 : 0,
                },
              ]}
              onPress={() => !disabled && onChange(option.value)}
              disabled={disabled}
              testID={TEST_IDS.patterns.touchableOpacityAction(
                `unit-toggle-${option.value}`
              )}
            >
              <Text
                style={[
                  unitToggleStyles.toggleText,
                  {
                    color: isSelected
                      ? theme.colors.primaryText
                      : theme.colors.text,
                    fontWeight: isSelected ? "600" : "400",
                  },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

interface DropdownToggleProps {
  value: string;
  options: { label: string; value: string; description?: string }[];
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function DropdownToggle({
  value,
  options,
  onChange,
  style,
  label,
  placeholder = "Select...",
  disabled = false,
}: DropdownToggleProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <View style={[unitToggleStyles.container, style]}>
      {label && (
        <Text style={[unitToggleStyles.label, { color: theme.colors.text }]}>
          {label}
        </Text>
      )}

      <TouchableOpacity
        style={[
          unitToggleStyles.dropdownButton,
          {
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.borderLight,
          },
        ]}
        onPress={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        testID={TEST_IDS.patterns.touchableOpacityAction("dropdown-main")}
      >
        <Text
          style={[
            unitToggleStyles.dropdownText,
            {
              color: selectedOption
                ? theme.colors.text
                : theme.colors.textSecondary,
            },
          ]}
        >
          {selectedOption?.label || placeholder}
        </Text>

        <MaterialIcons
          name={isOpen ? "expand-less" : "expand-more"}
          size={20}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      {isOpen && (
        <View
          style={[
            unitToggleStyles.dropdown,
            {
              backgroundColor: theme.colors.backgroundSecondary,
              borderColor: theme.colors.borderLight,
            },
          ]}
        >
          {options.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                unitToggleStyles.dropdownItem,
                {
                  backgroundColor:
                    value === option.value
                      ? theme.colors.primaryLight20
                      : "transparent",
                },
              ]}
              onPress={() => handleSelect(option.value)}
              testID={TEST_IDS.patterns.touchableOpacityAction(
                `dropdown-option-${option.value}`
              )}
            >
              <View style={unitToggleStyles.dropdownItemContent}>
                <Text
                  style={[
                    unitToggleStyles.dropdownItemText,
                    {
                      color:
                        value === option.value
                          ? theme.colors.primary
                          : theme.colors.text,
                      fontWeight: value === option.value ? "600" : "400",
                    },
                  ]}
                >
                  {option.label}
                </Text>
                {option.description && (
                  <Text
                    style={[
                      unitToggleStyles.dropdownItemDescription,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {option.description}
                  </Text>
                )}
              </View>

              {value === option.value && (
                <MaterialIcons
                  name="check"
                  size={18}
                  color={theme.colors.primary}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

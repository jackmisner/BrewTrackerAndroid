import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";
import { TEST_IDS } from "@constants/testIDs";

interface UnitToggleProps {
  value: string;
  options: Array<{ label: string; value: string; description?: string }>;
  onChange: (value: string) => void;
  style?: ViewStyle;
  label?: string;
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
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.toggleContainer,
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
                styles.toggleButton,
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
                  styles.toggleText,
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
  options: Array<{ label: string; value: string; description?: string }>;
  onChange: (value: string) => void;
  style?: ViewStyle;
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
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {label}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.dropdownButton,
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
            styles.dropdownText,
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
            styles.dropdown,
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
                styles.dropdownItem,
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
              <View style={styles.dropdownItemContent}>
                <Text
                  style={[
                    styles.dropdownItemText,
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
                      styles.dropdownItemDescription,
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

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  toggleContainer: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  toggleText: {
    fontSize: 14,
  },

  // Dropdown styles
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 44,
  },
  dropdownText: {
    fontSize: 14,
    flex: 1,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 1000,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 14,
  },
  dropdownItemDescription: {
    fontSize: 12,
    marginTop: 2,
  },
});

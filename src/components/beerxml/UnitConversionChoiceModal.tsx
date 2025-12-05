/**
 * Unit Conversion Choice Modal Component
 *
 * Modal for choosing which unit system to use when importing BeerXML recipes.
 * BeerXML files are always in metric per spec, but users can choose to import
 * as metric or convert to imperial.
 *
 * Features:
 * - Clear explanation that BeerXML is metric
 * - Recommendations based on user's preferred unit system
 * - Applies normalization to both choices (e.g., 28.3g -> 30g)
 * - Loading state during conversion
 * - Accessible design with proper ARIA labels
 *
 * @example
 * ```typescript
 * <UnitConversionChoiceModal
 *   visible={showUnitChoice}
 *   userUnitSystem="imperial"
 *   convertingTarget={null} // or "metric" | "imperial" when converting
 *   recipeName="My IPA"
 *   onChooseMetric={handleMetric}
 *   onChooseImperial={handleImperial}
 *   onCancel={handleCancel}
 * />
 * ```
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";
import { unitConversionModalStyles } from "@styles/components/beerxml/unitConversionModalStyles";
import { UnitSystem } from "@src/types";

interface UnitConversionChoiceModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean;
  /**
   * The user's preferred unit system (for recommendation)
   */
  userUnitSystem: UnitSystem;
  /**
   * Which unit system is currently being converted to, or null if no conversion in progress
   */
  convertingTarget: UnitSystem | null;
  /**
   * Optional recipe name to display
   */
  recipeName?: string;
  /**
   * Callback when user chooses metric
   */
  onChooseMetric: () => void;
  /**
   * Callback when user chooses imperial
   */
  onChooseImperial: () => void;
  /**
   * Callback when user cancels/closes the modal
   */
  onCancel: () => void;
}

/**
 * Unit Conversion Choice Modal Component
 *
 * Presents the user with a choice of which unit system to use when
 * importing a BeerXML recipe (always metric per spec).
 */
export const UnitConversionChoiceModal: React.FC<
  UnitConversionChoiceModalProps
> = ({
  visible,
  userUnitSystem,
  convertingTarget,
  recipeName,
  onChooseMetric,
  onChooseImperial,
  onCancel,
}) => {
  const { colors } = useTheme();

  // Determine which button is in loading state and which is just disabled
  const isConvertingMetric = convertingTarget === "metric";
  const isConvertingImperial = convertingTarget === "imperial";
  const isAnyConversion = convertingTarget !== null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityLabel="Unit conversion choice dialog"
    >
      <View style={unitConversionModalStyles.modalOverlay}>
        <View style={unitConversionModalStyles.backdrop} />
        <View
          style={[
            unitConversionModalStyles.modalContent,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          {/* Header */}
          <View style={unitConversionModalStyles.header}>
            <MaterialIcons
              name="swap-horiz"
              size={32}
              color={colors.primary}
              accessibilityLabel="Unit conversion icon"
            />
            <Text
              style={[unitConversionModalStyles.title, { color: colors.text }]}
            >
              Choose Import Units
            </Text>
          </View>

          {/* Message */}
          <View style={unitConversionModalStyles.messageContainer}>
            {recipeName && (
              <Text
                style={[
                  unitConversionModalStyles.recipeName,
                  { color: colors.text },
                ]}
              >
                {recipeName}
              </Text>
            )}
            <Text
              style={[
                unitConversionModalStyles.message,
                { color: colors.textSecondary || colors.text },
              ]}
            >
              BeerXML files use metric units by default. Choose which unit
              system you'd like to use in BrewTracker.
            </Text>

            <Text
              style={[
                unitConversionModalStyles.subMessage,
                { color: colors.textSecondary || colors.text },
              ]}
            >
              Both options apply brewing-friendly normalization (e.g., 28.3g →
              30g) for practical measurements.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={unitConversionModalStyles.buttonContainer}>
            {/* Metric Choice */}
            <TouchableOpacity
              style={[
                userUnitSystem === "metric"
                  ? unitConversionModalStyles.primaryButton
                  : unitConversionModalStyles.secondaryButton,
                {
                  backgroundColor:
                    userUnitSystem === "metric"
                      ? colors.primary
                      : colors.backgroundSecondary,
                  borderColor: colors.border,
                  opacity: isAnyConversion ? 0.6 : 1,
                },
              ]}
              onPress={onChooseMetric}
              disabled={isAnyConversion}
              accessibilityLabel="Import recipe with metric units (kg, L, °C)"
              accessibilityRole="button"
              accessibilityState={{ disabled: isAnyConversion }}
            >
              {isConvertingMetric ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color={
                      userUnitSystem === "metric"
                        ? colors.background
                        : colors.text
                    }
                    style={unitConversionModalStyles.buttonSpinner}
                  />
                  <Text
                    style={[
                      unitConversionModalStyles.buttonText,
                      {
                        color:
                          userUnitSystem === "metric"
                            ? colors.background
                            : colors.text,
                      },
                    ]}
                  >
                    Converting...
                  </Text>
                </>
              ) : (
                <>
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={
                      userUnitSystem === "metric"
                        ? colors.background
                        : colors.text
                    }
                    style={unitConversionModalStyles.buttonIcon}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        unitConversionModalStyles.buttonText,
                        {
                          color:
                            userUnitSystem === "metric"
                              ? colors.background
                              : colors.text,
                        },
                      ]}
                    >
                      Import as Metric (kg, L, °C)
                    </Text>
                    {userUnitSystem === "metric" && (
                      <Text
                        style={[
                          unitConversionModalStyles.buttonSubtext,
                          { color: colors.background },
                        ]}
                      >
                        Recommended for your preference
                      </Text>
                    )}
                  </View>
                </>
              )}
            </TouchableOpacity>

            {/* Imperial Choice */}
            <TouchableOpacity
              style={[
                userUnitSystem === "imperial"
                  ? unitConversionModalStyles.primaryButton
                  : unitConversionModalStyles.secondaryButton,
                {
                  backgroundColor:
                    userUnitSystem === "imperial"
                      ? colors.primary
                      : colors.backgroundSecondary,
                  borderColor: colors.border,
                  opacity: isAnyConversion ? 0.6 : 1,
                },
              ]}
              onPress={onChooseImperial}
              disabled={isAnyConversion}
              accessibilityLabel="Import recipe with imperial units (lbs, gal, °F)"
              accessibilityRole="button"
              accessibilityState={{ disabled: isAnyConversion }}
            >
              {isConvertingImperial ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color={
                      userUnitSystem === "imperial"
                        ? colors.background
                        : colors.text
                    }
                    style={unitConversionModalStyles.buttonSpinner}
                  />
                  <Text
                    style={[
                      unitConversionModalStyles.buttonText,
                      {
                        color:
                          userUnitSystem === "imperial"
                            ? colors.background
                            : colors.text,
                      },
                    ]}
                  >
                    Converting...
                  </Text>
                </>
              ) : (
                <>
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={
                      userUnitSystem === "imperial"
                        ? colors.background
                        : colors.text
                    }
                    style={unitConversionModalStyles.buttonIcon}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        unitConversionModalStyles.buttonText,
                        {
                          color:
                            userUnitSystem === "imperial"
                              ? colors.background
                              : colors.text,
                        },
                      ]}
                    >
                      Import as Imperial (lbs, gal, °F)
                    </Text>
                    {userUnitSystem === "imperial" && (
                      <Text
                        style={[
                          unitConversionModalStyles.buttonSubtext,
                          { color: colors.background },
                        ]}
                      >
                        Recommended for your preference
                      </Text>
                    )}
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

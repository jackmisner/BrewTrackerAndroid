/**
 * Unit Conversion Choice Modal Component
 *
 * Modal for choosing whether to convert a BeerXML recipe's units to the user's
 * preferred unit system or import as-is.
 *
 * Features:
 * - Clear indication of unit system mismatch
 * - Option to convert recipe to user's preferred units
 * - Option to import recipe with original units
 * - Loading state during conversion
 * - Accessible design with proper ARIA labels
 *
 * @example
 * ```typescript
 * <UnitConversionChoiceModal
 *   visible={showUnitChoice}
 *   recipeUnitSystem="metric"
 *   userUnitSystem="imperial"
 *   isConverting={false}
 *   onConvert={handleConvert}
 *   onImportAsIs={handleImportAsIs}
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
   * The unit system detected in the recipe
   */
  recipeUnitSystem: UnitSystem;
  /**
   * The user's preferred unit system
   */
  userUnitSystem: UnitSystem;
  /**
   * Whether conversion is in progress
   */
  isConverting: boolean;
  /**
   * Callback when user chooses to convert units
   */
  onConvert: () => void;
  /**
   * Callback when user chooses to import as-is
   */
  onImportAsIs: () => void;
  /**
   * Callback when user cancels/closes the modal
   */
  onCancel: () => void;
}

/**
 * Unit Conversion Choice Modal Component
 *
 * Presents the user with a choice to convert recipe units or import as-is
 * when a unit system mismatch is detected during BeerXML import.
 */
export const UnitConversionChoiceModal: React.FC<
  UnitConversionChoiceModalProps
> = ({
  visible,
  recipeUnitSystem,
  userUnitSystem,
  isConverting,
  onConvert,
  onImportAsIs,
  onCancel,
}) => {
  const { colors } = useTheme();

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
              name="warning"
              size={32}
              color={colors.warning || "#F59E0B"}
              accessibilityLabel="Warning icon"
            />
            <Text
              style={[unitConversionModalStyles.title, { color: colors.text }]}
            >
              Unit System Mismatch
            </Text>
          </View>

          {/* Message */}
          <View style={unitConversionModalStyles.messageContainer}>
            <Text
              style={[
                unitConversionModalStyles.message,
                { color: colors.textSecondary || colors.text },
              ]}
            >
              This recipe uses{" "}
              <Text
                style={[
                  unitConversionModalStyles.unitHighlight,
                  { color: colors.text },
                ]}
              >
                {recipeUnitSystem}
              </Text>{" "}
              units, but your preference is set to{" "}
              <Text
                style={[
                  unitConversionModalStyles.unitHighlight,
                  { color: colors.text },
                ]}
              >
                {userUnitSystem}
              </Text>
              .
            </Text>

            <Text
              style={[
                unitConversionModalStyles.subMessage,
                { color: colors.textSecondary || colors.text },
              ]}
            >
              You can import the recipe as-is or convert it to your preferred
              unit system.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={unitConversionModalStyles.buttonContainer}>
            {/* Convert Button */}
            <TouchableOpacity
              style={[
                unitConversionModalStyles.primaryButton,
                {
                  backgroundColor: colors.primary,
                  opacity: isConverting ? 0.6 : 1,
                },
              ]}
              onPress={onConvert}
              disabled={isConverting}
              accessibilityLabel={`Convert recipe to ${userUnitSystem} units`}
              accessibilityRole="button"
              accessibilityState={{ disabled: isConverting }}
            >
              {isConverting ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color={colors.background}
                    style={unitConversionModalStyles.buttonSpinner}
                  />
                  <Text
                    style={[
                      unitConversionModalStyles.buttonText,
                      { color: colors.background },
                    ]}
                  >
                    Converting...
                  </Text>
                </>
              ) : (
                <>
                  <MaterialIcons
                    name="swap-horiz"
                    size={20}
                    color={colors.background}
                    style={unitConversionModalStyles.buttonIcon}
                  />
                  <Text
                    style={[
                      unitConversionModalStyles.buttonText,
                      { color: colors.background },
                    ]}
                  >
                    Convert to {userUnitSystem}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Import As-Is Button */}
            <TouchableOpacity
              style={[
                unitConversionModalStyles.secondaryButton,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
              onPress={onImportAsIs}
              disabled={isConverting}
              accessibilityLabel={`Import recipe as-is with ${recipeUnitSystem} units`}
              accessibilityRole="button"
              accessibilityState={{ disabled: isConverting }}
            >
              <Text
                style={[
                  unitConversionModalStyles.buttonText,
                  { color: colors.text },
                ]}
              >
                Import as {recipeUnitSystem}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

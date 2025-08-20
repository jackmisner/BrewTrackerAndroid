/**
 * Ingredient Detail Editor Component
 * 
 * A comprehensive ingredient editor modal that allows users to add or edit
 * detailed ingredient information for recipes. Handles all ingredient types
 * (grains, hops, yeast, other) with appropriate fields and validations.
 * 
 * Features:
 * - Dynamic form fields based on ingredient type
 * - Real-time form validation with error display
 * - Unit conversion support (metric/imperial)
 * - Auto-dismiss keyboard on outside tap
 * - Ingredient-specific fields (hop timing, grain color, yeast attenuation, etc.)
 * - Save/cancel actions with proper state management
 * 
 * @param ingredient - The ingredient being edited (optional for new ingredients)
 * @param onSave - Callback function when ingredient is saved
 * @param onCancel - Callback function when editing is cancelled
 * @param ingredientType - Type of ingredient being edited
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";
import { useUnits } from "@contexts/UnitContext";
import { RecipeIngredient, IngredientType } from "@src/types";
import { ingredientDetailEditorStyles } from "@styles/recipes/ingredientDetailEditorStyles";
import { HOP_USAGE_OPTIONS, HOP_TIME_PRESETS } from "@constants/hopConstants";
import { getHopTimePlaceholder } from "@utils/formatUtils";

// Unit options by ingredient type
const UNIT_OPTIONS: Record<IngredientType, string[]> = {
  grain: ["oz", "lb", "g", "kg"],
  hop: ["oz", "g"],
  yeast: ["pkg", "oz", "g", "tsp"],
  other: ["oz", "lb", "g", "kg", "tsp", "tbsp", "cup"],
};

/**
 * Gets unit-aware amount adjustment presets grouped by size (small, medium, large)
 * Each group represents a row in the UI
 */
const getGroupedAmountAdjustments = (
  ingredientType: IngredientType,
  unit: string,
  unitSystem: "imperial" | "metric"
): { small: number[]; medium: number[]; large: number[] } => {
  if (ingredientType === "grain") {
    if (unitSystem === "imperial") {
      if (unit === "oz") {
        return {
          small: [1, 4, 8, 16], // Row 1: Small to medium adjustments
          medium: [30, 50, 100, 250], // Row 2: Medium to large adjustments
          large: [500], // Row 3: Large adjustments
        };
      } else {
        // lb
        return {
          small: [0.1, 0.25, 0.5, 1], // Row 1: Small adjustments
          medium: [], // No medium row for lb
          large: [], // No large row for lb
        };
      }
    } else {
      // metric
      if (unit === "g") {
        return {
          small: [1, 5, 10, 15], // Row 1: Small adjustments
          medium: [30, 50, 100, 250], // Row 2: Medium adjustments
          large: [500], // Row 3: Large adjustments
        };
      } else {
        // kg
        return {
          small: [0.1, 0.25, 0.5, 1], // Row 1: Small adjustments
          medium: [], // No medium row for kg
          large: [], // No large row for kg
        };
      }
    }
  } else if (ingredientType === "hop") {
    if (unitSystem === "imperial") {
      return {
        small: [0.25, 0.5, 1, 4], // Row 1: Small hop adjustments
        medium: [8, 16], // Row 2: Larger hop adjustments
        large: [], // No large row for hops
      };
    } else {
      return {
        small: [1, 5, 10, 15], // Row 1: Small metric hop adjustments
        medium: [30, 50], // Row 2: Larger metric hop adjustments
        large: [], // No large row for hops
      };
    }
  } else if (ingredientType === "yeast") {
    return {
      small: [0.5, 1.0], // Row 1: Package increments
      medium: [], // No medium row for yeast
      large: [], // No large row for yeast
    };
  } else {
    // Other ingredients
    if (unitSystem === "imperial") {
      return {
        small: [0.1, 0.25, 0.5, 1.0], // Row 1: Small adjustments
        medium: [], // No medium row
        large: [], // No large row
      };
    } else {
      return {
        small: [1, 5, 10, 25], // Row 1: Small metric adjustments
        medium: [50, 100], // Row 2: Medium metric adjustments
        large: [], // No large row
      };
    }
  }
};

interface IngredientDetailEditorProps {
  ingredient: RecipeIngredient;
  onUpdate: (updatedIngredient: RecipeIngredient) => void;
  onCancel: () => void;
  onRemove: () => void;
  isVisible: boolean;
}

/**
 * Provides detailed editing interface for recipe ingredients with in-place editing capabilities.
 *
 * Supports amount adjustments, unit changes, hop-specific usage and timing controls, and
 * real-time validation with visual feedback.
 */
export function IngredientDetailEditor({
  ingredient,
  onUpdate,
  onCancel,
  onRemove,
  isVisible,
}: IngredientDetailEditorProps) {
  const theme = useTheme();
  const { unitSystem } = useUnits();
  const styles = ingredientDetailEditorStyles(theme);

  // Local editing state
  const [editedIngredient, setEditedIngredient] =
    useState<RecipeIngredient>(ingredient);
  const [amountText, setAmountText] = useState<string>(
    ingredient.amount?.toString() || "0"
  );
  const [timeText, setTimeText] = useState<string>("");
  const [timeUnit, setTimeUnit] = useState<"minutes" | "days">(
    ingredient.use === "dry-hop" ? "days" : "minutes"
  );
  const [currentUsage, setCurrentUsage] = useState<string>(
    ingredient.use || "boil"
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Refs for input focus management
  const amountInputRef = useRef<TextInput>(null);

  // Update local state when ingredient prop changes
  useEffect(() => {
    setEditedIngredient(ingredient);
    setAmountText(ingredient.amount?.toString() || "0");

    // Initialize hop usage
    const ingredientUsage = ingredient.use || "boil";
    setCurrentUsage(ingredientUsage);

    // Initialize time display
    const isDryHop = ingredientUsage === "dry-hop";
    setTimeUnit(isDryHop ? "days" : "minutes");

    if (ingredient.time !== undefined && ingredient.time !== null) {
      if (isDryHop) {
        // Convert minutes to days for display
        const days = Math.round((ingredient.time / 1440) * 10) / 10;
        setTimeText(days.toString());
      } else {
        setTimeText(ingredient.time.toString());
      }
    } else {
      setTimeText("");
    }

    setErrors({});
  }, [ingredient]);

  /**
   * Validates the current ingredient data
   */
  const validateIngredient = (
    ing: RecipeIngredient
  ): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!ing.amount || ing.amount <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    if (ing.type === "hop") {
      if (!ing.use) {
        newErrors.use = "Hop usage is required";
      }
      if (ing.time !== undefined && ing.time < 0) {
        newErrors.time = "Time cannot be negative";
      }
    }

    return newErrors;
  };

  /**
   * Updates a field in the edited ingredient
   */
  const updateField = (field: keyof RecipeIngredient, value: any) => {
    const updated = { ...editedIngredient, [field]: value };

    setEditedIngredient(updated);

    // Clear related errors
    const newErrors = { ...errors };
    delete newErrors[field];
    setErrors(newErrors);
  };

  /**
   * Handles amount text input changes with validation
   */
  const handleAmountChange = (text: string) => {
    setAmountText(text);

    const numericValue = parseFloat(text);
    if (!isNaN(numericValue) && numericValue >= 0) {
      updateField("amount", numericValue);
    }
  };

  /**
   * Adjusts amount by a specific delta
   */
  const adjustAmount = (delta: number) => {
    const currentAmount = editedIngredient.amount || 0;
    const newAmount = Math.max(0, currentAmount + delta);
    const roundedAmount = Math.round(newAmount * 100) / 100; // Round to 2 decimal places

    setAmountText(roundedAmount.toString());
    updateField("amount", roundedAmount);
  };

  /**
   * Handles unit selection
   */
  const handleUnitChange = (newUnit: string) => {
    updateField("unit", newUnit);
  };

  /**
   * Handles hop usage change with automatic time defaults
   */
  const handleHopUsageChange = (newUsage: string) => {
    const usageOption = HOP_USAGE_OPTIONS.find(opt => opt.value === newUsage);

    // Update both usage and time fields in a single state update to avoid race condition
    if (usageOption) {
      const updated = {
        ...editedIngredient,
        use: usageOption.value,
        time: usageOption.defaultTime,
      };

      setEditedIngredient(updated);
    }

    setCurrentUsage(newUsage); // This ensures immediate visual feedback

    // Update time unit and display based on new usage
    const isDryHop = newUsage === "dry-hop";
    setTimeUnit(isDryHop ? "days" : "minutes");

    // Always set default time for the new usage type
    if (usageOption) {
      // Update the time text display
      if (isDryHop) {
        const days = Math.round((usageOption.defaultTime / 1440) * 10) / 10;
        setTimeText(days.toString());
      } else {
        setTimeText(usageOption.defaultTime.toString());
      }
    }

    // Clear related errors
    const newErrors = { ...errors };
    delete newErrors.use;
    delete newErrors.time;
    setErrors(newErrors);
  };

  /**
   * Handles hop time text input change
   */
  const handleTimeTextChange = (text: string) => {
    setTimeText(text);

    const numValue = parseFloat(text);
    if (!isNaN(numValue) && numValue >= 0) {
      // Convert to minutes for database storage
      const timeInMinutes = timeUnit === "days" ? numValue * 1440 : numValue;
      updateField("time", timeInMinutes);
    }
  };

  /**
   * Handles hop time change from preset buttons
   */
  const handleTimeChange = (newTime: number) => {
    updateField("time", newTime);

    // Update the display text
    if (timeUnit === "days") {
      const days = Math.round((newTime / 1440) * 10) / 10;
      setTimeText(days.toString());
    } else {
      setTimeText(newTime.toString());
    }
  };

  /**
   * Handles time unit change (minutes/days)
   */
  const handleTimeUnitChange = (newUnit: "minutes" | "days") => {
    const currentTime = editedIngredient.time || 0;

    setTimeUnit(newUnit);

    // Update display based on new unit
    if (newUnit === "days") {
      const days = Math.round((currentTime / 1440) * 10) / 10;
      setTimeText(days.toString());
    } else {
      setTimeText(currentTime.toString());
    }
  };

  /**
   * Cleans up ingredient data to ensure numeric fields are valid
   * Note: ID mapping (id ↔ ingredient_id) is handled automatically by the API interceptor
   */
  const sanitizeIngredientData = (
    ingredient: RecipeIngredient
  ): RecipeIngredient => {
    const sanitized = { ...ingredient };

    // Ensure required amount is a valid number
    sanitized.amount = Number(sanitized.amount) || 0;

    // Clean up optional numeric fields - convert null to undefined or valid numbers
    if (
      sanitized.potential !== undefined &&
      (sanitized.potential === null || isNaN(Number(sanitized.potential)))
    ) {
      delete sanitized.potential;
    } else if (sanitized.potential !== undefined) {
      sanitized.potential = Number(sanitized.potential);
    }

    if (
      sanitized.color !== undefined &&
      (sanitized.color === null || isNaN(Number(sanitized.color)))
    ) {
      delete sanitized.color;
    } else if (sanitized.color !== undefined) {
      sanitized.color = Number(sanitized.color);
    }

    if (
      sanitized.alpha_acid !== undefined &&
      (sanitized.alpha_acid === null || isNaN(Number(sanitized.alpha_acid)))
    ) {
      delete sanitized.alpha_acid;
    } else if (sanitized.alpha_acid !== undefined) {
      sanitized.alpha_acid = Number(sanitized.alpha_acid);
    }

    if (
      sanitized.time !== undefined &&
      (sanitized.time === null || isNaN(Number(sanitized.time)))
    ) {
      delete sanitized.time;
    } else if (sanitized.time !== undefined) {
      sanitized.time = Number(sanitized.time);
    }

    if (
      sanitized.attenuation !== undefined &&
      (sanitized.attenuation === null || isNaN(Number(sanitized.attenuation)))
    ) {
      delete sanitized.attenuation;
    } else if (sanitized.attenuation !== undefined) {
      sanitized.attenuation = Number(sanitized.attenuation);
    }

    return sanitized;
  };

  /**
   * Saves the changes
   */
  const handleSave = () => {
    const validationErrors = validateIngredient(editedIngredient);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const sanitizedIngredient = sanitizeIngredientData(editedIngredient);

    onUpdate(sanitizedIngredient);
  };

  /**
   * Handles delete with confirmation
   */
  const handleDelete = () => {
    Alert.alert(
      "Delete Ingredient",
      `Are you sure you want to remove ${ingredient.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onRemove },
      ]
    );
  };

  if (!isVisible) return null;

  const availableUnits =
    UNIT_OPTIONS[ingredient.type as IngredientType] || UNIT_OPTIONS.other;
  const isHop = ingredient.type === "hop";

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Edit Ingredient</Text>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Ingredient Name */}
          <Text style={styles.ingredientName}>{ingredient.name}</Text>
          <Text style={styles.ingredientType}>
            {ingredient.type.charAt(0).toUpperCase() + ingredient.type.slice(1)}
          </Text>

          {/* Amount Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amount</Text>

            <View style={styles.amountContainer}>
              <View style={styles.amountInputContainer}>
                <TextInput
                  ref={amountInputRef}
                  style={[
                    styles.amountInput,
                    errors.amount && styles.inputError,
                  ]}
                  value={amountText}
                  onChangeText={handleAmountChange}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  selectTextOnFocus
                />
                {errors.amount && (
                  <Text style={styles.errorText}>{errors.amount}</Text>
                )}
              </View>

              {/* Quick adjustment buttons - unit-aware with grouped row layout */}
              <View style={styles.adjustmentContainer}>
                {/* Negative adjustments (left side) */}
                <View
                  style={[styles.adjustmentSide, styles.adjustmentSideLeft]}
                >
                  {(() => {
                    const groups = getGroupedAmountAdjustments(
                      ingredient.type as IngredientType,
                      editedIngredient.unit,
                      unitSystem
                    );

                    return (
                      <>
                        {/* Small adjustments row */}
                        {groups.small.length > 0 && (
                          <View style={styles.adjustmentRow}>
                            {[...groups.small].reverse().map(delta => (
                              <TouchableOpacity
                                key={`minus-small-${delta}`}
                                style={[
                                  styles.adjustButton,
                                  styles.adjustButtonNegative,
                                ]}
                                onPress={() => adjustAmount(-delta)}
                              >
                                <Text
                                  style={[
                                    styles.adjustButtonText,
                                    styles.adjustButtonTextNegative,
                                  ]}
                                >
                                  -{delta}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}

                        {/* Medium adjustments row */}
                        {groups.medium.length > 0 && (
                          <View style={styles.adjustmentRow}>
                            {[...groups.medium].reverse().map(delta => (
                              <TouchableOpacity
                                key={`minus-medium-${delta}`}
                                style={[
                                  styles.adjustButton,
                                  styles.adjustButtonNegative,
                                ]}
                                onPress={() => adjustAmount(-delta)}
                              >
                                <Text
                                  style={[
                                    styles.adjustButtonText,
                                    styles.adjustButtonTextNegative,
                                  ]}
                                >
                                  -{delta}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}

                        {/* Large adjustments row */}
                        {groups.large.length > 0 && (
                          <View style={styles.adjustmentRow}>
                            {[...groups.large].reverse().map(delta => (
                              <TouchableOpacity
                                key={`minus-large-${delta}`}
                                style={[
                                  styles.adjustButton,
                                  styles.adjustButtonNegative,
                                ]}
                                onPress={() => adjustAmount(-delta)}
                              >
                                <Text
                                  style={[
                                    styles.adjustButtonText,
                                    styles.adjustButtonTextNegative,
                                  ]}
                                >
                                  -{delta}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </>
                    );
                  })()}
                </View>

                {/* Vertical divider */}
                <View style={styles.adjustmentDivider} />

                {/* Positive adjustments (right side) */}
                <View
                  style={[styles.adjustmentSide, styles.adjustmentSideRight]}
                >
                  {(() => {
                    const groups = getGroupedAmountAdjustments(
                      ingredient.type as IngredientType,
                      editedIngredient.unit,
                      unitSystem
                    );

                    return (
                      <>
                        {/* Small adjustments row */}
                        {groups.small.length > 0 && (
                          <View style={styles.adjustmentRow}>
                            {groups.small.map(delta => (
                              <TouchableOpacity
                                key={`plus-small-${delta}`}
                                style={[
                                  styles.adjustButton,
                                  styles.adjustButtonPositive,
                                ]}
                                onPress={() => adjustAmount(delta)}
                              >
                                <Text
                                  style={[
                                    styles.adjustButtonText,
                                    styles.adjustButtonTextPositive,
                                  ]}
                                >
                                  +{delta}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}

                        {/* Medium adjustments row */}
                        {groups.medium.length > 0 && (
                          <View style={styles.adjustmentRow}>
                            {groups.medium.map(delta => (
                              <TouchableOpacity
                                key={`plus-medium-${delta}`}
                                style={[
                                  styles.adjustButton,
                                  styles.adjustButtonPositive,
                                ]}
                                onPress={() => adjustAmount(delta)}
                              >
                                <Text
                                  style={[
                                    styles.adjustButtonText,
                                    styles.adjustButtonTextPositive,
                                  ]}
                                >
                                  +{delta}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}

                        {/* Large adjustments row */}
                        {groups.large.length > 0 && (
                          <View style={styles.adjustmentRow}>
                            {groups.large.map(delta => (
                              <TouchableOpacity
                                key={`plus-large-${delta}`}
                                style={[
                                  styles.adjustButton,
                                  styles.adjustButtonPositive,
                                ]}
                                onPress={() => adjustAmount(delta)}
                              >
                                <Text
                                  style={[
                                    styles.adjustButtonText,
                                    styles.adjustButtonTextPositive,
                                  ]}
                                >
                                  +{delta}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </>
                    );
                  })()}
                </View>
              </View>
            </View>
          </View>

          {/* Unit Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Unit</Text>
            <View style={styles.unitButtons}>
              {availableUnits.map(unit => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.unitButton,
                    editedIngredient.unit === unit && styles.unitButtonActive,
                  ]}
                  onPress={() => handleUnitChange(unit)}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      editedIngredient.unit === unit &&
                        styles.unitButtonTextActive,
                    ]}
                  >
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Hop-specific sections */}
          {isHop && (
            <>
              {/* Usage Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Usage</Text>
                <View style={styles.usageButtons}>
                  {HOP_USAGE_OPTIONS.map(usage => (
                    <TouchableOpacity
                      key={usage.value}
                      style={[
                        styles.usageButton,
                        currentUsage === usage.value &&
                          styles.usageButtonActive,
                      ]}
                      onPress={() => handleHopUsageChange(usage.value)}
                    >
                      <Text
                        style={[
                          styles.usageButtonText,
                          currentUsage === usage.value &&
                            styles.usageButtonTextActive,
                        ]}
                      >
                        {usage.display}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.use && (
                  <Text style={styles.errorText}>{errors.use}</Text>
                )}
              </View>

              {/* Time Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Time</Text>
                <View style={styles.timeContainer}>
                  <View style={styles.timeInputContainer}>
                    <TextInput
                      style={[
                        styles.timeInput,
                        errors.time && styles.timeInputError,
                      ]}
                      value={timeText}
                      onChangeText={handleTimeTextChange}
                      placeholder={getHopTimePlaceholder(
                        currentUsage,
                        timeUnit
                      )}
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                    />
                    {errors.time && (
                      <Text style={styles.errorText}>{errors.time}</Text>
                    )}
                  </View>

                  {/* Time Unit Selector - conditional based on hop usage */}
                  <View style={styles.unitButtons}>
                    {/* Only show minutes for boil/whirlpool */}
                    {currentUsage !== "dry-hop" && (
                      <TouchableOpacity
                        style={[
                          styles.unitButton,
                          timeUnit === "minutes" && styles.unitButtonActive,
                        ]}
                        onPress={() => handleTimeUnitChange("minutes")}
                      >
                        <Text
                          style={[
                            styles.unitButtonText,
                            timeUnit === "minutes" &&
                              styles.unitButtonTextActive,
                          ]}
                        >
                          min
                        </Text>
                      </TouchableOpacity>
                    )}
                    {/* Only show days for dry-hop */}
                    {currentUsage === "dry-hop" && (
                      <TouchableOpacity
                        style={[
                          styles.unitButton,
                          timeUnit === "days" && styles.unitButtonActive,
                        ]}
                        onPress={() => handleTimeUnitChange("days")}
                      >
                        <Text
                          style={[
                            styles.unitButtonText,
                            timeUnit === "days" && styles.unitButtonTextActive,
                          ]}
                        >
                          days
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={styles.timePresets}>
                  {(() => {
                    const presets =
                      HOP_TIME_PRESETS[
                        currentUsage as keyof typeof HOP_TIME_PRESETS
                      ] || HOP_TIME_PRESETS.boil;

                    return presets.map(preset => (
                      <TouchableOpacity
                        key={preset.value}
                        style={[
                          styles.timeButton,
                          editedIngredient.time === preset.value &&
                            styles.timeButtonActive,
                        ]}
                        onPress={() => handleTimeChange(preset.value)}
                      >
                        <Text
                          style={[
                            styles.timeButtonText,
                            editedIngredient.time === preset.value &&
                              styles.timeButtonTextActive,
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    ));
                  })()}
                </View>
                {errors.time && (
                  <Text style={styles.errorText}>{errors.time}</Text>
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <MaterialIcons name="delete" size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>

          <View style={styles.primaryActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

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
 * - Keyboard-aware scrolling and mobile-friendly inputs
 * - Ingredient-specific fields (hop timing, grain color, yeast attenuation, etc.)
 * - Save/cancel actions with proper state management
 *
 * @param ingredient - The ingredient being edited
 * @param onUpdate - Callback with the sanitized ingredient when Save is pressed
 * @param onCancel - Callback when the editor is dismissed without saving
 * @param onRemove - Callback when the user confirms deletion
 * @param isVisible - Controls visibility of the modal
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";
import { useUnits } from "@contexts/UnitContext";
import { useAuth } from "@contexts/AuthContext";
import { RecipeIngredient, IngredientType, IngredientUnit } from "@src/types";
import { ingredientDetailEditorStyles } from "@styles/recipes/ingredientDetailEditorStyles";
import { HOP_USAGE_OPTIONS, HOP_TIME_PRESETS } from "@constants/hopConstants";
import { getHopTimePlaceholder } from "@utils/formatUtils";
import { UnitConverter } from "@services/calculators/UnitConverter";

// Unit options by ingredient type
const UNIT_OPTIONS: Record<IngredientType, string[]> = {
  grain: ["oz", "lb", "g", "kg"],
  hop: ["oz", "g"],
  yeast: ["pkg", "oz", "g", "tsp"],
  other: ["oz", "lb", "g", "kg", "tsp", "tbsp", "cup"],
};

/**
 * Layout mode type for the ingredient editor
 */
type LayoutMode = "classic" | "compact";

/**
 * Gets unit-aware contextual increment amounts based on ingredient type and unit
 * Returns sensible adjustment increments that make sense for the selected unit
 */
const getContextualIncrements = (
  ingredientType: IngredientType,
  unit: string,
  _unitSystem: "imperial" | "metric"
): number[] => {
  if (ingredientType === "grain") {
    switch (unit) {
      case "kg":
        return [0.1, 0.25, 0.5, 1.0];
      case "g":
        return [50, 100, 250, 500];
      case "lb":
        return [0.25, 0.5, 1.0, 2.0];
      case "oz":
        return [1, 2, 4, 8];
      default:
        return [0.1, 0.25, 0.5, 1.0];
    }
  } else if (ingredientType === "hop") {
    switch (unit) {
      case "g":
        return [1, 5, 10, 15];
      case "oz":
        return [0.1, 0.25, 0.5, 1.0];
      default:
        return [0.1, 0.25, 0.5, 1.0];
    }
  } else if (ingredientType === "yeast") {
    // Simple increments for yeast regardless of unit
    return [0.5, 1.0];
  } else {
    // Other ingredients - simplified increments regardless of unit system
    return [1, 5, 10, 25];
  }
};

/**
 * Determines the appropriate default layout mode based on screen width
 */
const getDefaultLayoutMode = (screenWidth: number): LayoutMode => {
  return screenWidth < 350 ? "compact" : "classic";
};

/**
 * Gets user-scoped storage key for layout mode preference
 */
const getLayoutPreferenceKey = (userId: string): string => {
  return `user:${userId}:ingredientEditor.layoutMode`;
};

/**
 * Rounds amount to appropriate precision based on the unit type
 */
const roundForUnit = (amount: number, unit: string): number => {
  const unitLower = unit.toLowerCase();

  // Weight units
  if (unitLower === "kg") {
    // Kilograms: round to 3 decimal places for small amounts, 2 for larger
    return amount < 1
      ? Math.round(amount * 1000) / 1000
      : Math.round(amount * 100) / 100;
  } else if (unitLower === "g") {
    // Grams: round to whole numbers for amounts > 10, 1 decimal for smaller
    return amount > 10 ? Math.round(amount) : Math.round(amount * 10) / 10;
  } else if (unitLower === "oz") {
    // Ounces: round to 2 decimal places for small amounts, 1 for larger
    return amount < 1
      ? Math.round(amount * 100) / 100
      : Math.round(amount * 10) / 10;
  } else if (unitLower === "lb" || unitLower === "lbs") {
    // Pounds: round to 2 decimal places
    return Math.round(amount * 100) / 100;
  }

  // Volume units
  else if (unitLower === "tsp" || unitLower === "tbsp") {
    // Teaspoons/tablespoons: round to 1 decimal place
    return Math.round(amount * 10) / 10;
  } else if (unitLower === "cup") {
    // Cups: round to 2 decimal places
    return Math.round(amount * 100) / 100;
  }

  // Default: round to 2 decimal places
  return Math.round(amount * 100) / 100;
};

/**
 * Calculate viewport-aware modal position and dimensions
 * Based on contextual menu positioning logic
 */
const calculateModalPosition = () => {
  const screen = Dimensions.get("window");
  const safeAreaPadding = 20;
  const maxWidth = Math.min(500, screen.width - safeAreaPadding * 2);
  const maxHeight = screen.height * 0.85;

  return {
    maxWidth,
    maxHeight,
    marginHorizontal: safeAreaPadding,
  };
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
  const { getUserId } = useAuth();
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

  // Modal positioning
  const modalDimensions = calculateModalPosition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Layout mode state
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("classic");
  const [selectedIncrement, setSelectedIncrement] = useState<number>(0.1);
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get("window").width
  );
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);

  // Refs for input focus management
  const amountInputRef = useRef<TextInput>(null);

  // Initialize layout mode from storage or default
  const layoutInitializedRef = useRef(false);
  useEffect(() => {
    const init = async () => {
      try {
        const userId = await getUserId();
        if (layoutInitializedRef.current) {
          if (!userId) {
            setLayoutMode(getDefaultLayoutMode(screenWidth));
          }
          return;
        }
        let savedMode: string | null = null;
        if (userId) {
          savedMode = await AsyncStorage.getItem(
            getLayoutPreferenceKey(userId)
          );
        }
        setLayoutMode(
          savedMode === "classic" || savedMode === "compact"
            ? (savedMode as LayoutMode)
            : getDefaultLayoutMode(screenWidth)
        );
        layoutInitializedRef.current = true;
      } catch {
        setLayoutMode(getDefaultLayoutMode(screenWidth));
        layoutInitializedRef.current = true;
      }
    };
    init();
  }, [screenWidth, getUserId]);

  // Initialize selected increment based on ingredient context
  useEffect(() => {
    const increments = getContextualIncrements(
      ingredient.type as IngredientType,
      editedIngredient.unit,
      unitSystem
    );
    if (increments.length > 0) {
      setSelectedIncrement(increments[0]); // Default to first increment
    }
  }, [ingredient.type, editedIngredient.unit, unitSystem]);

  // Handle screen size changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

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
   * Adjusts amount by a specific delta with unit-appropriate rounding
   */
  const adjustAmount = (delta: number) => {
    const currentAmount = editedIngredient.amount || 0;
    const newAmount = Math.max(0, currentAmount + delta);
    const roundedAmount = roundForUnit(newAmount, editedIngredient.unit);

    setAmountText(roundedAmount.toString());
    updateField("amount", roundedAmount);
  };

  /**
   * Resets the amount to zero for easy rebuild using adjustment buttons
   */
  const handleZeroAmount = () => {
    setAmountText("0");
    updateField("amount", 0);
  };

  /**
   * Handles unit selection with automatic amount conversion
   */
  const handleUnitChange = (newUnit: string) => {
    const currentUnit = editedIngredient.unit;
    const currentAmount = editedIngredient.amount || 0;

    // Only attempt conversion if we have a valid amount and different units
    if (currentAmount > 0 && currentUnit !== newUnit) {
      try {
        // Determine conversion type based on ingredient type
        const ingredientType = ingredient.type as IngredientType;
        let convertedAmount: number;

        if (ingredientType === "grain" || ingredientType === "hop") {
          // Weight conversion for grains and hops
          if (
            UnitConverter.isValidWeightUnit(currentUnit) &&
            UnitConverter.isValidWeightUnit(newUnit)
          ) {
            convertedAmount = UnitConverter.convertWeight(
              currentAmount,
              currentUnit,
              newUnit
            );
          } else {
            // If either unit is not a valid weight unit, don't convert
            convertedAmount = currentAmount;
          }
        } else if (ingredientType === "other") {
          // Handle mixed weight/volume units for "other" ingredients
          const isCurrentWeight = UnitConverter.isValidWeightUnit(currentUnit);
          const isNewWeight = UnitConverter.isValidWeightUnit(newUnit);

          if (isCurrentWeight && isNewWeight) {
            // Both are weight units
            convertedAmount = UnitConverter.convertWeight(
              currentAmount,
              currentUnit,
              newUnit
            );
          } else if (!isCurrentWeight && !isNewWeight) {
            // Both are volume units (tsp, tbsp, cup)
            convertedAmount = UnitConverter.convertVolume(
              currentAmount,
              currentUnit,
              newUnit
            );
          } else {
            // Mixed weight/volume - don't convert automatically
            convertedAmount = currentAmount;
          }
        } else {
          // For yeast or unknown types, don't convert
          convertedAmount = currentAmount;
        }

        // Apply unit-appropriate rounding
        const roundedAmount = roundForUnit(convertedAmount, newUnit);

        // Update both unit and amount
        setAmountText(roundedAmount.toString());
        const updated = {
          ...editedIngredient,
          unit: newUnit as IngredientUnit,
          amount: roundedAmount,
        };
        setEditedIngredient(updated);

        // Clear any amount-related errors since we have a valid converted value
        const newErrors = { ...errors };
        delete newErrors.amount;
        setErrors(newErrors);
      } catch (error) {
        // If conversion fails, just change the unit without converting amount
        console.warn("Unit conversion failed:", error);
        updateField("unit", newUnit);
      }
    } else {
      // No amount to convert or same unit
      updateField("unit", newUnit);
    }
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
   * Handles layout mode toggle with user-scoped persistence
   */
  const handleLayoutToggle = async () => {
    const newMode: LayoutMode =
      layoutMode === "classic" ? "compact" : "classic";
    setLayoutMode(newMode);

    try {
      const userId = await getUserId();
      if (userId) {
        const storageKey = getLayoutPreferenceKey(userId);
        await AsyncStorage.setItem(storageKey, newMode);
      }
    } catch (error) {
      console.warn("Failed to save layout preference:", error);
    }
  };

  /**
   * Handles amount adjustment using selected increment for compact mode
   */
  const handleIncrementAdjustment = (direction: "add" | "subtract") => {
    const delta = direction === "add" ? selectedIncrement : -selectedIncrement;
    adjustAmount(delta);
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

  if (!isVisible) {
    return null;
  }

  const availableUnits =
    UNIT_OPTIONS[ingredient.type as IngredientType] || UNIT_OPTIONS.other;
  const isHop = ingredient.type === "hop";
  const isOther = ingredient.type === "other";

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.container,
                {
                  width: modalDimensions.maxWidth,
                  maxHeight: modalDimensions.maxHeight,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Edit Ingredient</Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    onPress={handleLayoutToggle}
                    style={styles.layoutToggle}
                  >
                    <MaterialIcons
                      name={
                        layoutMode === "classic" ? "view-module" : "view-list"
                      }
                      size={20}
                      color={theme.colors.text}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onCancel}
                    style={styles.closeButton}
                  >
                    <MaterialIcons
                      name="close"
                      size={24}
                      color={theme.colors.text}
                    />
                  </TouchableOpacity>
                </View>
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
                  {ingredient.type.charAt(0).toUpperCase() +
                    ingredient.type.slice(1)}
                </Text>

                {/* Amount Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Amount</Text>

                  <View style={styles.amountContainer}>
                    <View style={styles.amountInputRow}>
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
                        {errors.amount ? (
                          <Text style={styles.errorText}>{errors.amount}</Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        style={styles.zeroButton}
                        onPress={handleZeroAmount}
                      >
                        <Text style={styles.zeroButtonText}>0</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Quick adjustment buttons - dual layout mode */}
                    {layoutMode === "classic" ? (
                      // Classic Mode: Enhanced unit-aware direct +/- buttons
                      <View style={styles.adjustmentContainer}>
                        {(() => {
                          const increments = getContextualIncrements(
                            ingredient.type as IngredientType,
                            editedIngredient.unit,
                            unitSystem
                          );

                          // Use responsive layout: horizontal for wide screens, vertical for narrow screens
                          const isSmallScreen = screenWidth < 380;

                          if (isSmallScreen) {
                            // Vertical stacking for small screens
                            return (
                              <View style={styles.classicAdjustmentColumn}>
                                {/* Negative buttons section */}
                                <View style={styles.classicAdjustmentSection}>
                                  {increments.map(delta => (
                                    <TouchableOpacity
                                      key={`minus-${delta}`}
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

                                {/* Positive buttons section */}
                                <View style={styles.classicAdjustmentSection}>
                                  {increments.map(delta => (
                                    <TouchableOpacity
                                      key={`plus-${delta}`}
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
                              </View>
                            );
                          } else {
                            // Horizontal layout for larger screens
                            return (
                              <View style={styles.classicAdjustmentRow}>
                                {/* Negative buttons */}
                                {increments.map(delta => (
                                  <TouchableOpacity
                                    key={`minus-${delta}`}
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

                                {/* Vertical divider */}
                                <View style={styles.adjustmentDivider} />

                                {/* Positive buttons */}
                                {increments.map(delta => (
                                  <TouchableOpacity
                                    key={`plus-${delta}`}
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
                            );
                          }
                        })()}
                      </View>
                    ) : (
                      // Compact Mode: Radio button selection + direction buttons
                      <View style={styles.compactAdjustmentContainer}>
                        <View style={styles.incrementSelector}>
                          <Text style={styles.incrementSelectorLabel}>
                            Select Amount:
                          </Text>
                          {getContextualIncrements(
                            ingredient.type as IngredientType,
                            editedIngredient.unit,
                            unitSystem
                          ).map(amount => (
                            <TouchableOpacity
                              key={amount}
                              style={styles.incrementOption}
                              onPress={() => setSelectedIncrement(amount)}
                            >
                              <View style={styles.radioButton}>
                                {selectedIncrement === amount && (
                                  <View style={styles.radioButtonInner} />
                                )}
                              </View>
                              <Text style={styles.incrementOptionText}>
                                {amount}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        <View style={styles.compactActionButtons}>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              styles.actionButtonNegative,
                            ]}
                            onPress={() =>
                              handleIncrementAdjustment("subtract")
                            }
                          >
                            <MaterialIcons
                              name="remove"
                              size={24}
                              color={theme.colors.error}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              styles.actionButtonPositive,
                            ]}
                            onPress={() => handleIncrementAdjustment("add")}
                          >
                            <MaterialIcons
                              name="add"
                              size={24}
                              color={theme.colors.primary}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </View>

                {/* Unit Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Unit</Text>
                  {isOther ? (
                    // Dropdown for other ingredients
                    <View>
                      <TouchableOpacity
                        style={[
                          styles.unitDropdownButton,
                          showUnitDropdown && styles.unitDropdownButtonActive,
                        ]}
                        onPress={() => setShowUnitDropdown(!showUnitDropdown)}
                      >
                        <Text style={styles.unitDropdownText}>
                          {editedIngredient.unit}
                        </Text>
                        <MaterialIcons
                          name={
                            showUnitDropdown
                              ? "keyboard-arrow-up"
                              : "keyboard-arrow-down"
                          }
                          size={20}
                          color={theme.colors.text}
                        />
                      </TouchableOpacity>
                      {showUnitDropdown && (
                        <View style={styles.unitDropdownMenu}>
                          {availableUnits.map((unit, index) => (
                            <TouchableOpacity
                              key={unit}
                              style={[
                                styles.unitDropdownItem,
                                index === availableUnits.length - 1 &&
                                  styles.unitDropdownItemLast,
                              ]}
                              onPress={() => {
                                handleUnitChange(unit);
                                setShowUnitDropdown(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.unitDropdownItemText,
                                  editedIngredient.unit === unit &&
                                    styles.unitDropdownItemTextSelected,
                                ]}
                              >
                                {unit}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  ) : (
                    // Button grid for other ingredient types
                    <View style={styles.unitButtonsFullWidth}>
                      {availableUnits.map(unit => (
                        <TouchableOpacity
                          key={unit}
                          style={[
                            styles.unitButtonFullWidth,
                            editedIngredient.unit === unit &&
                              styles.unitButtonActive,
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
                  )}
                </View>

                {/* Hop-specific sections */}
                {isHop ? (
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
                      {errors.use ? (
                        <Text style={styles.errorText}>{errors.use}</Text>
                      ) : null}
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
                          {errors.time ? (
                            <Text style={styles.errorText}>{errors.time}</Text>
                          ) : null}
                        </View>

                        {/* Time Unit Selector - conditional based on hop usage */}
                        <View style={styles.unitButtons}>
                          {/* Only show minutes for boil/whirlpool */}
                          {currentUsage !== "dry-hop" ? (
                            <TouchableOpacity
                              style={[
                                styles.unitButton,
                                timeUnit === "minutes" &&
                                  styles.unitButtonActive,
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
                          ) : null}
                          {/* Only show days for dry-hop */}
                          {currentUsage === "dry-hop" ? (
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
                                  timeUnit === "days" &&
                                    styles.unitButtonTextActive,
                                ]}
                              >
                                days
                              </Text>
                            </TouchableOpacity>
                          ) : null}
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
                      {errors.time ? (
                        <Text style={styles.errorText}>{errors.time}</Text>
                      ) : null}
                    </View>
                  </>
                ) : null}
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                >
                  <MaterialIcons name="delete" size={20} color="#fff" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

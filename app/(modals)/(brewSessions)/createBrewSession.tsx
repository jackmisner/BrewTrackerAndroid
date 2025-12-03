/**
 * Create Brew Session Screen
 *
 * Modal screen for creating new brew sessions from recipes. Allows users to
 * start tracking fermentation for a specific recipe with customizable brew
 * date and optional notes. Integrates with recipe data and validation.
 *
 * Features:
 * - Recipe selection via URL parameter or query
 * - Recipe details display with formatted metrics
 * - Brew date selection with date picker
 * - Optional brew notes input
 * - Form validation with user validation hooks
 * - Real-time API integration with React Query
 * - Loading states and error handling
 * - Navigation back to brew sessions list
 * - Keyboard-aware layout
 * - Test ID support for automated testing
 *
 * Flow:
 * 1. User navigates from recipe or brew sessions list
 * 2. Recipe is loaded and displayed (if ID provided)
 * 3. User selects brew date (defaults to today)
 * 4. User optionally adds brew notes
 * 5. Form validation ensures required fields
 * 6. Submit creates brew session via API
 * 7. Success navigates back to brew sessions list
 *
 * @example
 * Navigation usage:
 * ```typescript
 * router.push('/(modals)/(brewSessions)/createBrewSession?recipeId=123');
 * ```
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useBrewSessions, useRecipes } from "@hooks/offlineV2/useUserData";
import { useTheme } from "@contexts/ThemeContext";
import { useUnits } from "@contexts/UnitContext";
import { useUserValidation } from "@utils/userValidation";
import { createBrewSessionStyles } from "@styles/modals/createBrewSessionStyles";
import {
  formatGravity,
  formatABV,
  formatIBU,
  formatSRM,
} from "@utils/formatUtils";
import DateTimePicker from "@react-native-community/datetimepicker";
import { TEST_IDS } from "@src/constants/testIDs";
import { TemperatureUnit } from "@/src/types";

function toLocalISODateString(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const parseIsoDate = (iso: string) => {
  if (!iso) {
    return new Date();
  }
  const [datePart] = iso.split("T");
  const [year, month, day] = (datePart ?? "").split("-").map(Number);
  if (
    typeof year === "number" &&
    !Number.isNaN(year) &&
    typeof month === "number" &&
    !Number.isNaN(month)
  ) {
    const safeDay = typeof day === "number" && !Number.isNaN(day) ? day : 1;
    return new Date(year, month - 1, safeDay);
  }
  const fallback = new Date(iso);
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
};
const formatBrewDate = (iso: string) => parseIsoDate(iso).toLocaleDateString();

/**
 * Screen for creating a new brew session from a selected recipe.
 *
 * Displays the selected recipe details and provides a form to create a new brew session
 * with pre-populated data from the recipe and sensible defaults.
 */
export default function CreateBrewSessionScreen() {
  const theme = useTheme();
  const units = useUnits();
  const userValidation = useUserValidation();
  const styles = createBrewSessionStyles(theme);
  const params = useLocalSearchParams();
  const { create: createBrewSession } = useBrewSessions();
  const { getById: getRecipeById } = useRecipes();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTemperatureUnit, setSelectedTemperatureUnit] =
    useState<TemperatureUnit | null>(null);
  const [showUnitPrompt, setShowUnitPrompt] = useState(false);
  const [recipe, setRecipe] = useState<any>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(true);
  const [recipeError, setRecipeError] = useState<string | null>(null);

  const recipeIdParam = params.recipeId as string | string[] | undefined;
  const recipeId = Array.isArray(recipeIdParam)
    ? recipeIdParam[0]
    : recipeIdParam;

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    brew_date: toLocalISODateString(new Date()), // Today's date in local time
    status: "planned" as const,
    notes: "",
  });

  // Load recipe details from offline cache
  useEffect(() => {
    const loadRecipe = async () => {
      if (!recipeId) {
        setRecipeError("Recipe ID is required");
        setIsLoadingRecipe(false);
        return;
      }

      try {
        setIsLoadingRecipe(true);
        setRecipeError(null);

        const recipeData = await getRecipeById(recipeId);
        if (recipeData) {
          setRecipe(recipeData);
        } else {
          setRecipeError("Recipe not found in offline cache");
        }
      } catch (error) {
        console.error("Error loading recipe:", error);
        setRecipeError(
          error instanceof Error ? error.message : "Failed to load recipe"
        );
      } finally {
        setIsLoadingRecipe(false);
      }
    };

    loadRecipe();
  }, [recipeId, getRecipeById]);

  // Auto-populate session name when recipe loads
  useEffect(() => {
    if (recipe && !formData.name) {
      const defaultName = `${recipe.name} - ${new Date().toLocaleDateString()}`;
      setFormData(prev => ({
        ...prev,
        name: defaultName,
      }));
    }
  }, [recipe, formData.name]);

  // Check for unit system conflicts when recipe loads
  useEffect(() => {
    if (recipe && selectedTemperatureUnit === null) {
      const userPreferredTempUnit = units.unitSystem === "metric" ? "C" : "F";
      const recipeUnitSystem = recipe.unit_system;
      const recipeTempUnit = recipeUnitSystem === "metric" ? "C" : "F";

      // If recipe unit system differs from user preference, prompt for unit selection
      if (userPreferredTempUnit !== recipeTempUnit) {
        setShowUnitPrompt(true);
      } else {
        // Units match, use the preferred unit
        setSelectedTemperatureUnit(userPreferredTempUnit);
      }
    }
  }, [recipe, units.unitSystem, selectedTemperatureUnit]);

  // Loading state for creation
  const [isCreating, setIsCreating] = useState(false);
  if (!recipeId) {
    Alert.alert("Error", "Recipe ID is required");
    router.back();
    return null as any;
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dateString = toLocalISODateString(selectedDate);
      handleInputChange("brew_date", dateString);
    }
  };

  const handleSubmit = async () => {
    if (!recipe) {
      Alert.alert("Error", "Recipe data is required to create a brew session");
      return;
    }

    if (!formData.name.trim()) {
      Alert.alert("Error", "Session name is required");
      return;
    }

    // Validate user permissions for recipe access
    if (recipe.user_id) {
      try {
        const canAccess = await userValidation.canUserModifyResource({
          user_id: recipe.user_id,
          is_owner: recipe.is_owner,
        });

        // Only allow brew session creation if user has access OR recipe is explicitly public
        // This prevents unauthorized users from creating sessions for private recipes
        if (!canAccess && !recipe.is_public) {
          Alert.alert(
            "Access Denied",
            "You don't have permission to create brew sessions for this recipe"
          );
          return;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("❌ User validation error:", errorMessage, error);
        Alert.alert(
          "Validation Error",
          `Unable to verify permissions: ${errorMessage}. Please try again later.`
        );
        return;
      }
    }

    const brewSessionData = {
      recipe_id: recipeId,
      name: formData.name.trim(),
      brew_date: formData.brew_date,
      status: formData.status,
      notes: formData.notes.trim(),
      temperature_unit:
        selectedTemperatureUnit || (units.unitSystem === "metric" ? "C" : "F"),
    };

    // Dev-only diagnostics (avoid PII in production)
    if (__DEV__) {
      console.log("🍺 Creating brew session:", {
        recipeId: recipe.id,
        isPublicRecipe: recipe.is_public,
        hasRecipeUserId: !!recipe.user_id,
        // omit names in production logs
      });
    }

    try {
      setIsCreating(true);
      const newBrewSession = await createBrewSession(brewSessionData);

      // Navigate to the new brew session
      router.replace({
        pathname: "/(modals)/(brewSessions)/viewBrewSession",
        params: { brewSessionId: newBrewSession.id },
      });
    } catch (error) {
      console.error("❌ Failed to create brew session:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      Alert.alert("Error", `Failed to create brew session: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // Loading state
  if (isLoadingRecipe) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading recipe details...</Text>
      </View>
    );
  }

  // Error state
  if (recipeError || (!isLoadingRecipe && !recipe)) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>Failed to Load Recipe</Text>
        <Text style={styles.errorSubtext}>
          {recipeError || "Recipe not found"}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={"height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleCancel}
          testID={TEST_IDS.components.closeButton}
        >
          <MaterialIcons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Start Brew Session</Text>
        <TouchableOpacity
          style={[
            styles.headerButton,
            styles.saveButton,
            isCreating && styles.saveButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isCreating}
          testID={TEST_IDS.buttons.saveButton}
        >
          {isCreating ? (
            <ActivityIndicator size={20} color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Start</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Unit Selection Prompt */}
        {showUnitPrompt ? (
          <View style={styles.promptContainer}>
            <View style={styles.promptHeader}>
              <MaterialIcons
                name="thermostat"
                size={24}
                color={theme.colors.warning}
              />
              <Text style={styles.promptTitle}>
                Temperature Unit Preference
              </Text>
            </View>
            <Text style={styles.promptText}>
              This recipe uses{" "}
              {recipe?.unit_system === "metric" ? "Celsius" : "Fahrenheit"}{" "}
              temperatures, but your preference is{" "}
              {units.unitSystem === "metric" ? "Celsius" : "Fahrenheit"}. Which
              would you like to use for this brew session?
            </Text>
            <View style={styles.unitButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  selectedTemperatureUnit ===
                    (units.unitSystem === "metric" ? "C" : "F") &&
                    styles.unitButtonSelected,
                ]}
                onPress={() => {
                  setSelectedTemperatureUnit(
                    units.unitSystem === "metric" ? "C" : "F"
                  );
                  setShowUnitPrompt(false);
                }}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    selectedTemperatureUnit ===
                      (units.unitSystem === "metric" ? "C" : "F") &&
                      styles.unitButtonTextSelected,
                  ]}
                >
                  Your Preference (°{units.unitSystem === "metric" ? "C" : "F"})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  selectedTemperatureUnit ===
                    (recipe?.unit_system === "metric" ? "C" : "F") &&
                    styles.unitButtonSelected,
                ]}
                onPress={() => {
                  setSelectedTemperatureUnit(
                    recipe?.unit_system === "metric" ? "C" : "F"
                  );
                  setShowUnitPrompt(false);
                }}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    selectedTemperatureUnit ===
                      (recipe?.unit_system === "metric" ? "C" : "F") &&
                      styles.unitButtonTextSelected,
                  ]}
                >
                  Recipe Default (°
                  {recipe?.unit_system === "metric" ? "C" : "F"})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Recipe Preview */}
        <View style={styles.recipePreview}>
          <View style={styles.recipeHeader}>
            <MaterialIcons
              name="menu-book"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.recipeTitle}>{recipe.name}</Text>
          </View>

          {recipe.style ? (
            <Text style={styles.recipeStyle}>{recipe.style}</Text>
          ) : null}

          {recipe.description ? (
            <Text style={styles.recipeDescription} numberOfLines={2}>
              {recipe.description}
            </Text>
          ) : null}

          <View style={styles.recipeMetrics}>
            <View style={styles.metricRow}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Batch Size</Text>
                <Text style={styles.metricValue}>
                  {recipe.batch_size} {recipe.batch_size_unit || "gal"}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Est. OG</Text>
                <Text style={styles.metricValue}>
                  {formatGravity(recipe.estimated_og)}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Est. FG</Text>
                <Text style={styles.metricValue}>
                  {formatGravity(recipe.estimated_fg)}
                </Text>
              </View>
            </View>

            <View style={styles.metricRow}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Est. ABV</Text>
                <Text style={styles.metricValue}>
                  {formatABV(recipe.estimated_abv)}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Est. IBU</Text>
                <Text style={styles.metricValue}>
                  {formatIBU(recipe.estimated_ibu)}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Est. SRM</Text>
                <Text style={styles.metricValue}>
                  {formatSRM(recipe.estimated_srm)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Brew Session Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Brew Session Details</Text>

          {/* Session Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Session Name *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.name}
              onChangeText={text => handleInputChange("name", text)}
              placeholder="Enter session name"
              placeholderTextColor={theme.colors.textSecondary}
              returnKeyType="next"
              testID={TEST_IDS.patterns.inputField("session-name")}
            />
          </View>

          {/* Brew Date */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Brew Date *</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
              testID={TEST_IDS.patterns.touchableOpacityAction("date-picker")}
            >
              <Text style={styles.datePickerText}>
                {formatBrewDate(formData.brew_date)}
              </Text>
              <MaterialIcons
                name="date-range"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
            {showDatePicker ? (
              <DateTimePicker
                value={parseIsoDate(formData.brew_date)}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            ) : null}
          </View>

          {/* Status */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusContainer}>
              <MaterialIcons
                name="info"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.statusText}>
                Status will be set to &quot;Planned&quot; and can be updated
                later
              </Text>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Brew Day Notes</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.notes}
              onChangeText={text => handleInputChange("notes", text)}
              placeholder="Add any notes for brew day..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              testID={TEST_IDS.patterns.inputField("notes")}
            />
          </View>
        </View>

        {/* Bottom spacing for keyboard */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

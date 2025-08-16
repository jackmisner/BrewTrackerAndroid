import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ApiService from "@services/api/apiService";
import { CreateBrewSessionRequest } from "@src/types";
import { useTheme } from "@contexts/ThemeContext";
import { useUnits } from "@contexts/UnitContext";
import { createBrewSessionStyles } from "@styles/modals/createBrewSessionStyles";
import {
  formatGravity,
  formatABV,
  formatIBU,
  formatSRM,
} from "@utils/formatUtils";
import DateTimePicker from "@react-native-community/datetimepicker";

function toLocalISODateString(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Screen for creating a new brew session from a selected recipe.
 *
 * Displays the selected recipe details and provides a form to create a new brew session
 * with pre-populated data from the recipe and sensible defaults.
 */
export default function CreateBrewSessionScreen() {
  const theme = useTheme();
  const units = useUnits();
  const styles = createBrewSessionStyles(theme);
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTemperatureUnit, setSelectedTemperatureUnit] = useState<
    "F" | "C" | null
  >(null);
  const [showUnitPrompt, setShowUnitPrompt] = useState(false);

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

  // Fetch recipe details
  const {
    data: recipeResponse,
    isLoading: isLoadingRecipe,
    error: recipeError,
  } = useQuery({
    queryKey: ["recipe", recipeId],
    queryFn: async () => {
      if (!recipeId) throw new Error("Recipe ID is required");
      return ApiService.recipes.getById(recipeId);
    },
    enabled: !!recipeId,
    retry: 1,
  });

  const recipe = recipeResponse?.data;

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

  // Create brew session mutation
  const createBrewSessionMutation = useMutation({
    mutationFn: async (brewSessionData: CreateBrewSessionRequest) => {
      return ApiService.brewSessions.create(brewSessionData);
    },
    onSuccess: response => {
      // Invalidate brew sessions cache to trigger refresh
      queryClient.invalidateQueries({ queryKey: ["brewSessions"] });

      // Navigate to the new brew session
      router.replace({
        pathname: "/(modals)/(brewSessions)/viewBrewSession",
        params: { brewSessionId: response.data.id },
      });
    },
    onError: (error: any) => {
      const errorMessage = ApiService.handleApiError(error).message;
      Alert.alert("Error", `Failed to create brew session: ${errorMessage}`);
    },
  });
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

  const handleSubmit = () => {
    if (!recipe) {
      Alert.alert("Error", "Recipe data is required to create a brew session");
      return;
    }

    if (!formData.name.trim()) {
      Alert.alert("Error", "Session name is required");
      return;
    }

    const brewSessionData: CreateBrewSessionRequest = {
      recipe_id: recipeId,
      name: formData.name.trim(),
      brew_date: formData.brew_date,
      status: formData.status,
      notes: formData.notes.trim(),
      temperature_unit:
        selectedTemperatureUnit || (units.unitSystem === "metric" ? "C" : "F"),
    };

    createBrewSessionMutation.mutate(brewSessionData);
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
  if (recipeError || !recipe) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>Failed to Load Recipe</Text>
        <Text style={styles.errorSubtext}>
          {recipeError ? "Could not load recipe details" : "Recipe not found"}
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleCancel}>
          <MaterialIcons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Start Brew Session</Text>
        <TouchableOpacity
          style={[
            styles.headerButton,
            styles.saveButton,
            createBrewSessionMutation.isPending && styles.saveButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={createBrewSessionMutation.isPending}
        >
          {createBrewSessionMutation.isPending ? (
            <ActivityIndicator size={20} color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Start</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Unit Selection Prompt */}
        {showUnitPrompt && (
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
        )}

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

          {recipe.style && (
            <Text style={styles.recipeStyle}>{recipe.style}</Text>
          )}

          {recipe.description && (
            <Text style={styles.recipeDescription} numberOfLines={2}>
              {recipe.description}
            </Text>
          )}

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
            />
          </View>

          {/* Brew Date */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Brew Date *</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.datePickerText}>
                {new Date(formData.brew_date).toLocaleDateString()}
              </Text>
              <MaterialIcons
                name="date-range"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(formData.brew_date)}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
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
            />
          </View>
        </View>

        {/* Bottom spacing for keyboard */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

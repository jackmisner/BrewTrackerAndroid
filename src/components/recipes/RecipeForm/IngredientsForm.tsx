import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useGlobalSearchParams } from "expo-router";

import { useTheme } from "@contexts/ThemeContext";
import { RecipeFormData, RecipeIngredient } from "@src/types";
import { createRecipeStyles } from "@styles/modals/createRecipeStyles";
import { BrewingMetricsDisplay } from "@src/components/recipes/BrewingMetrics/BrewingMetricsDisplay";
import { useRecipeMetrics } from "@src/hooks/useRecipeMetrics";
import { formatHopTime } from "@src/utils/timeUtils";

// Hop usage display mapping (database value -> display value)
const HOP_USAGE_DISPLAY_MAPPING: Record<string, string> = {
  boil: "Boil",
  whirlpool: "Whirlpool",
  "dry-hop": "Dry Hop",
};

const GRAIN_TYPE_DISPLAY_MAPPING: Record<string, string> = {
  base_malt: "Base Malt",
  smoked: "Smoked",
  roasted: "Roasted",
  caramel_crystal: "Caramel/Crystal",
  specialty_malt: "Specialty",
  adjunct_grain: "Adjunct",
};

interface IngredientsFormProps {
  recipeData: RecipeFormData;
  onUpdateField: (field: keyof RecipeFormData, value: any) => void;
}

/**
 * Displays and manages a categorized ingredient list for a recipe, allowing users to add or remove ingredients by type.
 *
 * Handles ingredient addition via navigation parameters, categorizes ingredients into grains, hops, yeast, and other, and updates the recipe data through a callback when changes occur.
 *
 * @param recipeData - The current recipe form data containing the ingredients list.
 * @param onUpdateField - Callback to update fields in the recipe data when ingredients are added or removed.
 *
 * @returns A React element rendering the ingredient form UI.
 */
export function IngredientsForm({
  recipeData,
  onUpdateField,
}: IngredientsFormProps) {
  const theme = useTheme();
  const styles = createRecipeStyles(theme);
  const params = useGlobalSearchParams();

  // Ensure ingredients is always an array to prevent crashes
  const safeIngredients = Array.isArray(recipeData.ingredients)
    ? recipeData.ingredients
    : [];

  const processedParamRef = useRef<string | null>(null);

  // Real-time recipe metrics calculation
  const {
    data: metricsData,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: retryMetrics,
  } = useRecipeMetrics(recipeData);

  const ingredientsByType = {
    grain: safeIngredients.filter(ing => ing.type === "grain"),
    hop: safeIngredients.filter(ing => ing.type === "hop"),
    yeast: safeIngredients.filter(ing => ing.type === "yeast"),
    other: safeIngredients.filter(ing => ing.type === "other"),
  };

  // Handle ingredient selection from picker
  useEffect(() => {
    const raw = params.selectedIngredient;
    const serialized = Array.isArray(raw) ? raw[0] : raw;
    if (!serialized) return;
    // Skip if already processed
    if (processedParamRef.current === serialized) return;
    try {
      let ingredient: RecipeIngredient;
      try {
        ingredient = JSON.parse(serialized) as RecipeIngredient;
      } catch {
        ingredient = JSON.parse(
          decodeURIComponent(serialized)
        ) as RecipeIngredient;
      }
      const newIngredients = [...safeIngredients, ingredient];
      onUpdateField("ingredients", newIngredients);
      processedParamRef.current = serialized;
      // Clear the parameter to prevent re-adding
      router.setParams({ selectedIngredient: undefined });
    } catch (error) {
      console.error("Error parsing selectedIngredient param:", error);
      console.error("Raw param value:", raw);
    }
  }, [onUpdateField, params.selectedIngredient, safeIngredients]);
  const handleAddIngredient = (type: "grain" | "hop" | "yeast" | "other") => {
    router.push(`/(modals)/(recipes)/ingredientPicker?type=${type}`);
  };

  const renderIngredientSection = (
    type: "grain" | "hop" | "yeast" | "other",
    title: string
  ) => {
    const ingredients = ingredientsByType[type];

    return (
      <View style={styles.ingredientSection} key={type}>
        <View style={styles.ingredientSectionHeader}>
          <Text style={styles.ingredientSectionTitle}>{title}</Text>
          <TouchableOpacity
            style={styles.addIngredientButton}
            onPress={() => handleAddIngredient(type)}
          >
            <MaterialIcons name="add" size={20} color={theme.colors.primary} />
            <Text style={styles.addIngredientText}>Add</Text>
          </TouchableOpacity>
        </View>

        {ingredients.length === 0 ? (
          <View style={styles.emptyIngredientContainer}>
            <Text style={styles.emptyIngredientText}>
              No {type} ingredients added yet
            </Text>
          </View>
        ) : (
          <View style={styles.ingredientsList}>
            {ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientItem}>
                <View style={styles.ingredientInfo}>
                  <Text style={styles.ingredientName}>{ingredient.name}</Text>
                  <Text style={styles.ingredientAmount}>
                    {ingredient.amount} {ingredient.unit}
                  </Text>
                  {/* Show hop-specific details */}
                  {ingredient.type === "hop" &&
                    (ingredient.use || ingredient.time != null) && (
                      <Text style={styles.ingredientDetails}>
                        {ingredient.use &&
                          `${HOP_USAGE_DISPLAY_MAPPING[ingredient.use] || ingredient.use}`}
                        {ingredient.time != null &&
                          ` • ${formatHopTime(ingredient.time, ingredient.use || "")}`}
                        {ingredient.alpha_acid &&
                          ` • ${ingredient.alpha_acid}% AA`}
                      </Text>
                    )}
                  {/* Show grain-specific details */}
                  {ingredient.type === "grain" && ingredient.grain_type && (
                    <Text style={styles.ingredientDetails}>
                      {ingredient.grain_type &&
                        `${GRAIN_TYPE_DISPLAY_MAPPING[ingredient.grain_type] || ingredient.grain_type}`}
                    </Text>
                  )}
                  {/* Show yeast-specific details */}
                  {ingredient.type === "yeast" &&
                    (ingredient.yeast_type ||
                      ingredient.manufacturer ||
                      ingredient.attenuation) && (
                      <Text style={styles.ingredientDetails}>
                        {ingredient.manufacturer &&
                          `Brand: ${ingredient.manufacturer}`}
                        {ingredient.attenuation &&
                          ` • ${ingredient.attenuation}% Attenuation`}
                      </Text>
                    )}{" "}
                </View>
                <TouchableOpacity
                  style={styles.ingredientRemoveButton}
                  onPress={() => {
                    // Find the ingredient in the full safe ingredients array
                    const globalIndex = safeIngredients.findIndex(
                      ing =>
                        (ingredient.id != null && ing.id === ingredient.id) ||
                        (ingredient.id == null &&
                          ing.name === ingredient.name &&
                          ing.type === ingredient.type &&
                          ing.amount === ingredient.amount &&
                          ing.unit === ingredient.unit)
                    );

                    if (globalIndex !== -1) {
                      const newIngredients = safeIngredients.filter(
                        (_, i) => i !== globalIndex
                      );

                      onUpdateField("ingredients", newIngredients);
                    } else {
                      console.error(
                        "❌ IngredientsForm - Could not find ingredient to remove"
                      );
                    }
                  }}
                >
                  <MaterialIcons
                    name="close"
                    size={18}
                    color={theme.colors.error}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>Recipe Ingredients</Text>
      <Text style={styles.sectionDescription}>
        Add ingredients to build your recipe. Start with grains, then add hops,
        yeast, and any other ingredients.
      </Text>

      {/* Real-time recipe metrics */}
      <BrewingMetricsDisplay
        metrics={metricsData}
        mash_temperature={recipeData.mash_temperature}
        mash_temp_unit={recipeData.mash_temp_unit}
        loading={metricsLoading}
        error={
          metricsError
            ? (metricsError as any)?.message || "Metrics calculation error"
            : null
        }
        compact={true}
        showTitle={true}
        onRetry={retryMetrics}
      />

      {renderIngredientSection("grain", "Grains & Fermentables")}
      {renderIngredientSection("hop", "Hops")}
      {renderIngredientSection("yeast", "Yeast")}
      {renderIngredientSection("other", "Other Ingredients")}

      {safeIngredients.length === 0 && (
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <MaterialIcons
              name="lightbulb-outline"
              size={20}
              color={theme.colors.warning}
            />
            <Text style={styles.infoTitle}>Getting Started</Text>
          </View>
          <Text style={styles.infoText}>
            Start by adding your base grains, then specialty grains for flavour
            and colour. Add hops for bitterness and aroma, choose your yeast
            strain, and any other ingredients like spices or clarifying agents.
          </Text>
        </View>
      )}
    </View>
  );
}

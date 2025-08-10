import React from "react";
import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "@contexts/ThemeContext";
import { RecipeFormData } from "@src/types";
import { createRecipeStyles } from "@styles/modals/createRecipeStyles";
import { BrewingMetricsDisplay } from "@src/components/recipes/BrewingMetrics/BrewingMetricsDisplay";
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

interface ReviewFormProps {
  recipeData: RecipeFormData;
  calculatedMetrics?: {
    og?: number;
    fg?: number;
    abv?: number;
    ibu?: number;
    srm?: number;
  } | null;
}

/**
 * Displays a comprehensive review of a brewing recipe's details before creation.
 *
 * Organizes and presents the recipe's basic information, brewing parameters, categorized ingredients, and placeholder estimated metrics. Intended for users to verify all recipe data prior to finalizing creation, with clear sectioning and contextual notes.
 *
 * @param recipeData - The brewing recipe data to be reviewed
 */
export function ReviewForm({ recipeData, calculatedMetrics }: ReviewFormProps) {
  const theme = useTheme();
  const styles = createRecipeStyles(theme);

  const ingredientsByType = {
    grain: recipeData.ingredients.filter(ing => ing.type === "grain"),
    hop: recipeData.ingredients.filter(ing => ing.type === "hop"),
    yeast: recipeData.ingredients.filter(ing => ing.type === "yeast"),
    other: recipeData.ingredients.filter(ing => ing.type === "other"),
  };

  const renderBasicInfo = () => (
    <View style={styles.reviewSection}>
      <Text style={styles.reviewSectionTitle}>Basic Information</Text>
      <View style={styles.reviewRow}>
        <Text style={styles.reviewLabel}>Name:</Text>
        <Text style={styles.reviewValue}>{recipeData.name}</Text>
      </View>
      <View style={styles.reviewRow}>
        <Text style={styles.reviewLabel}>Style:</Text>
        <Text style={styles.reviewValue}>{recipeData.style}</Text>
      </View>
      <View style={styles.reviewRow}>
        <Text style={styles.reviewLabel}>Batch Size:</Text>
        <Text style={styles.reviewValue}>
          {recipeData.batch_size}{" "}
          {recipeData.batch_size_unit[0].toUpperCase() +
            recipeData.batch_size_unit.slice(1)}
        </Text>
      </View>
      {recipeData.description && (
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Description:</Text>
          <Text style={styles.reviewValue}>{recipeData.description}</Text>
        </View>
      )}
      <View style={styles.reviewRow}>
        <Text style={styles.reviewLabel}>Public:</Text>
        <Text style={styles.reviewValue}>
          {recipeData.is_public ? "Yes" : "No"}
        </Text>
      </View>
    </View>
  );

  const renderParameters = () => (
    <View style={styles.reviewSection}>
      <Text style={styles.reviewSectionTitle}>Brewing Parameters</Text>
      <View style={styles.reviewRow}>
        <Text style={styles.reviewLabel}>Boil Time:</Text>
        <Text style={styles.reviewValue}>{recipeData.boil_time} minutes</Text>
      </View>
      <View style={styles.reviewRow}>
        <Text style={styles.reviewLabel}>Efficiency:</Text>
        <Text style={styles.reviewValue}>{recipeData.efficiency}%</Text>
      </View>
      <View style={styles.reviewRow}>
        <Text style={styles.reviewLabel}>Mash Temperature:</Text>
        <Text style={styles.reviewValue}>
          {recipeData.mash_temperature}°{recipeData.mash_temp_unit}
        </Text>
      </View>
      {recipeData.mash_time && (
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Mash Time:</Text>
          <Text style={styles.reviewValue}>{recipeData.mash_time} minutes</Text>
        </View>
      )}
    </View>
  );

  const TYPE_LABELS = {
    grain: "Grains & Fermentables",
    hop: "Hops",
    yeast: "Yeast",
    other: "Other Ingredients",
  } as const;

  const renderIngredients = () => (
    <View style={styles.reviewSection}>
      <Text style={styles.reviewSectionTitle}>
        Ingredients ({recipeData.ingredients.length})
      </Text>

      {["grain", "hop", "yeast", "other"].map(type => {
        const ingredients =
          ingredientsByType[type as keyof typeof ingredientsByType];
        if (ingredients.length === 0) return null;

        return (
          <View key={type} style={styles.ingredientTypeSection}>
            <Text style={styles.ingredientTypeTitle}>
              {TYPE_LABELS[type as keyof typeof TYPE_LABELS]} (
              {ingredients.length})
            </Text>
            {ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientReviewItem}>
                <View style={styles.ingredientReviewInfo}>
                  <Text style={styles.ingredientReviewName}>
                    {ingredient.name}
                  </Text>
                  {/* Show hop-specific details */}
                  {ingredient.type === "hop" &&
                    (ingredient.use || ingredient.time) && (
                      <Text style={styles.ingredientReviewDetails}>
                        {ingredient.use &&
                          `${HOP_USAGE_DISPLAY_MAPPING[ingredient.use] || ingredient.use}`}
                        {ingredient.time &&
                          ingredient.time > 0 &&
                          ` • ${formatHopTime(ingredient.time, ingredient.use || "")}`}
                        {ingredient.alpha_acid &&
                          ` • ${ingredient.alpha_acid}% AA`}
                      </Text>
                    )}
                  {/* Show grain-specific details */}
                  {ingredient.type === "grain" && ingredient.grain_type && (
                    <Text style={styles.ingredientReviewDetails}>
                      {ingredient.grain_type &&
                        `${GRAIN_TYPE_DISPLAY_MAPPING[ingredient.grain_type] || ingredient.grain_type}`}
                    </Text>
                  )}
                  {/* Show yeast-specific details */}
                  {ingredient.type === "yeast" &&
                    (ingredient.manufacturer || ingredient.attenuation != null) && (
                      <Text style={styles.ingredientReviewDetails}>
                        {ingredient.manufacturer && ingredient.manufacturer}
                        {ingredient.attenuation != null &&
                          ` • ${ingredient.attenuation}% Attenuation`}
                      </Text>
                    )}
                  <Text style={styles.ingredientReviewAmount}>
                    {ingredient.amount} {ingredient.unit}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        );
      })}

      {recipeData.ingredients.length === 0 && (
        <View style={styles.emptyIngredientContainer}>
          <Text style={styles.emptyIngredientText}>
            No ingredients added yet
          </Text>
        </View>
      )}
    </View>
  );

  const renderEstimatedMetrics = () => (
    <BrewingMetricsDisplay
      metrics={calculatedMetrics || undefined}
      mash_temperature={recipeData.mash_temperature}
      mash_temp_unit={recipeData.mash_temp_unit}
      loading={false}
      error={null}
      compact={false}
      showTitle={true}
    />
  );

  return (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>Review Your Recipe</Text>
      <Text style={styles.sectionDescription}>
        Review all recipe details before creating. You can edit the recipe after
        creation.
      </Text>

      {renderBasicInfo()}
      {renderParameters()}
      {renderIngredients()}
      {renderEstimatedMetrics()}

      <View style={styles.infoSection}>
        <View style={styles.infoHeader}>
          <MaterialIcons
            name="check-circle-outline"
            size={20}
            color={theme.colors.success}
          />
          <Text style={styles.infoTitle}>Ready to Create</Text>
        </View>
        <Text style={styles.infoText}>
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          Your recipe looks good! Click "Create Recipe" to save it to
          your recipe collection. You can always edit the recipe later or use it
          to start a new brew session.
        </Text>
      </View>
    </View>
  );
}

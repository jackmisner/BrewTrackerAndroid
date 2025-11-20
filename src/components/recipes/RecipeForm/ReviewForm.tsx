/**
 * Recipe Review Form Component
 *
 * Displays a comprehensive summary of the recipe being created, including all ingredients,
 * parameters, and calculated brewing metrics. Used in the final step of recipe creation
 * to allow users to review their recipe before saving.
 *
 * Features:
 * - Recipe overview with name, style, and batch size
 * - Ingredients breakdown (grains, hops, yeast, other)
 * - Brewing parameters (mash temp, fermentation temp, etc.)
 * - Real-time calculated metrics (OG, FG, ABV, IBU, SRM)
 * - Formatted ingredient displays with proper units
 *
 * Props:
 * - recipeData: RecipeFormData (required)
 * - metrics: Optional calculated metrics (og, fg, abv, ibu, srm) or null when unavailable
 * - metricsLoading: Whether metrics are being calculated/fetched
 * - metricsError: Error object if metrics calculation failed
 * - onRetryMetrics: Callback to retry metrics calculation
 * - isEditing: Render copy/UI to indicate update flow instead of create
 */

import React from "react";
import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "@contexts/ThemeContext";
import { RecipeFormData } from "@src/types";
import { createRecipeStyles } from "@styles/modals/createRecipeStyles";
import { BrewingMetricsDisplay } from "@src/components/recipes/BrewingMetrics/BrewingMetricsDisplay";
import { StyleAnalysis } from "@src/components/recipes/StyleAnalysis";
import { AIAnalysisButton } from "@src/components/recipes/AIAnalysisButton";
import { formatHopTime } from "@src/utils/timeUtils";
import { generateIngredientKey, generateListItemKey } from "@utils/keyUtils";
import { TEST_IDS } from "@src/constants/testIDs";

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
  metrics?: {
    og?: number;
    fg?: number;
    abv?: number;
    ibu?: number;
    srm?: number;
  } | null;
  metricsLoading?: boolean;
  metricsError?: unknown;
  onRetryMetrics?: () => void;
  isEditing?: boolean;
  onAIAnalysis?: () => void;
}

/**
 * Displays a comprehensive review of a brewing recipe's details before creation.
 *
 * Organizes and presents the recipe's basic information, brewing parameters, categorized ingredients, and placeholder estimated metrics. Intended for users to verify all recipe data prior to finalizing creation, with clear sectioning and contextual notes.
 *
 * @param recipeData - The brewing recipe data to be reviewed
 */
export function ReviewForm({
  recipeData,
  metrics,
  metricsLoading,
  metricsError,
  onRetryMetrics,
  isEditing = false,
  onAIAnalysis,
}: ReviewFormProps) {
  const theme = useTheme();
  const styles = createRecipeStyles(theme);

  /**
   * Generate a safe key for ingredients, falling back to generateListItemKey when instance_id is missing
   */
  const generateSafeIngredientKey = (
    ingredient: any,
    index: number
  ): string => {
    try {
      if (ingredient.instance_id) {
        return generateIngredientKey(ingredient);
      } else {
        // Fallback to generateListItemKey when instance_id is missing (server-loaded/edit flow)
        return generateListItemKey(ingredient, index, "review-ingredient");
      }
    } catch (error) {
      console.error("Error generating ingredient key:", error);
      // Log the error and return a fallback key
      // Additional safety net - fallback to generateListItemKey if generateIngredientKey throws
      return generateListItemKey(ingredient, index, "review-ingredient");
    }
  };

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
      {recipeData.description ? (
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Description:</Text>
          <Text style={styles.reviewValue}>{recipeData.description}</Text>
        </View>
      ) : null}
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
      {recipeData.mash_time ? (
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Mash Time:</Text>
          <Text style={styles.reviewValue}>{recipeData.mash_time} minutes</Text>
        </View>
      ) : null}
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
        if (ingredients.length === 0) {
          return null;
        }

        return (
          <View key={type} style={styles.ingredientTypeSection}>
            <Text style={styles.ingredientTypeTitle}>
              {TYPE_LABELS[type as keyof typeof TYPE_LABELS]} (
              {ingredients.length})
            </Text>
            {ingredients.map((ingredient, index) => {
              return (
                <View
                  key={generateSafeIngredientKey(ingredient, index)}
                  style={styles.ingredientReviewItem}
                >
                  <View style={styles.ingredientReviewInfo}>
                    <Text style={styles.ingredientReviewName}>
                      {ingredient.name}
                    </Text>
                    {/* Show hop-specific details */}
                    {ingredient.type === "hop" &&
                    (ingredient.use != null ||
                      ingredient.time != null ||
                      ingredient.alpha_acid != null) ? (
                      <Text style={styles.ingredientReviewDetails}>
                        {[
                          ingredient.use &&
                            (HOP_USAGE_DISPLAY_MAPPING[ingredient.use] ||
                              ingredient.use),
                          ingredient.time != null &&
                            ingredient.time > 0 &&
                            formatHopTime(
                              ingredient.time,
                              ingredient.use || ""
                            ),
                          ingredient.alpha_acid != null &&
                            `${ingredient.alpha_acid}% AA`,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </Text>
                    ) : null}
                    {/* Show grain-specific details */}
                    {ingredient.type === "grain" && ingredient.grain_type ? (
                      <Text style={styles.ingredientReviewDetails}>
                        {ingredient.grain_type &&
                          `${GRAIN_TYPE_DISPLAY_MAPPING[ingredient.grain_type] || ingredient.grain_type}`}
                      </Text>
                    ) : null}
                    {/* Show yeast-specific details */}
                    {ingredient.type === "yeast" &&
                      (() => {
                        const parts = [
                          ingredient.yeast_type,
                          ingredient.manufacturer,
                          ingredient.attenuation != null
                            ? `${ingredient.attenuation}% Attenuation`
                            : null,
                        ].filter(Boolean) as string[];
                        return parts.length ? (
                          <Text style={styles.ingredientReviewDetails}>
                            {parts.join(" • ")}
                          </Text>
                        ) : null;
                      })()}
                    <Text style={styles.ingredientReviewAmount}>
                      {ingredient.amount} {ingredient.unit}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}

      {recipeData.ingredients.length === 0 ? (
        <View style={styles.emptyIngredientContainer}>
          <Text style={styles.emptyIngredientText}>
            No ingredients added yet
          </Text>
        </View>
      ) : null}
    </View>
  );

  const renderEstimatedMetrics = () => (
    <BrewingMetricsDisplay
      metrics={metrics || undefined}
      mash_temperature={recipeData.mash_temperature}
      mash_temp_unit={recipeData.mash_temp_unit}
      loading={metricsLoading || false}
      error={
        metricsError
          ? (metricsError as any)?.message || "Metrics calculation error"
          : null
      }
      onRetry={onRetryMetrics}
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

      {/* Style Adherence Analysis - final summary */}
      {recipeData.style && (
        <StyleAnalysis
          styleName={recipeData.style}
          metrics={metrics || undefined}
          variant="detailed"
          mode="adherence"
          testID={TEST_IDS.recipes.styleAnalysisDetailed}
        />
      )}

      {/* AI Analysis Button */}
      {recipeData.ingredients.length > 0 && onAIAnalysis && (
        <AIAnalysisButton onPress={onAIAnalysis} disabled={!recipeData.style} />
      )}

      <View style={styles.infoSection}>
        <View style={styles.infoHeader}>
          <MaterialIcons
            name="check-circle-outline"
            size={20}
            color={theme.colors.success}
          />
          <Text style={styles.infoTitle}>
            {isEditing ? "Ready to Update" : "Ready to Create"}
          </Text>
        </View>
        <Text style={styles.infoText}>
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          Your recipe looks good! Click "Create Recipe" to save it to your
          recipe collection. You can always edit the recipe later or use it to
          start a new brew session.
        </Text>
      </View>
    </View>
  );
}

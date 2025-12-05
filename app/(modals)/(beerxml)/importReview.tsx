/**
 * BeerXML Import Review Screen
 *
 * Final confirmation screen for BeerXML imports, allowing users to review
 * the processed recipe data before creating the recipe in their collection.
 *
 * Features:
 * - Complete recipe preview with all imported data
 * - Summary of ingredient matching results
 * - Recipe creation with proper error handling
 * - Success feedback and navigation to new recipe
 * - Import statistics and metadata display
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useTheme } from "@contexts/ThemeContext";
import { createRecipeStyles } from "@styles/modals/createRecipeStyles";
import {
  Recipe,
  RecipeIngredient,
  RecipeMetricsInput,
  TemperatureUnit,
  UnitSystem,
} from "@src/types";
import { TEST_IDS } from "@src/constants/testIDs";
import { generateUniqueId } from "@utils/keyUtils";
import { QUERY_KEYS } from "@services/api/queryClient";
import { ModalHeader } from "@src/components/ui/ModalHeader";
import { useRecipes } from "@src/hooks/offlineV2";
import { OfflineMetricsCalculator } from "@services/brewing/OfflineMetricsCalculator";
import { UnifiedLogger } from "@services/logger/UnifiedLogger";

/**
 * Derive unit system from batch_size_unit with fallback to metric
 * Centralizes the "l" => metric logic used throughout import
 */
function deriveUnitSystem(
  batchSizeUnit: string | undefined,
  explicitUnitSystem?: string
): UnitSystem {
  if (explicitUnitSystem === "metric" || explicitUnitSystem === "imperial") {
    return explicitUnitSystem;
  }

  if (explicitUnitSystem !== undefined) {
    void UnifiedLogger.warn(
      "import-review",
      `Invalid explicit unit_system "${explicitUnitSystem}", deriving from batch_size_unit`
    );
  }
  // Default based on batch size unit
  const lowerCasedUnit = batchSizeUnit?.toLowerCase();
  return lowerCasedUnit === "gal" || lowerCasedUnit === "gallons"
    ? "imperial"
    : "metric";
}

/**
 * Derive mash temperature unit with normalization and validation
 * Only accepts valid "C" or "F" values, falls back to unit system default
 */
function deriveMashTempUnit(
  mashTempUnit: string | undefined,
  unitSystem: UnitSystem
): TemperatureUnit {
  // Normalize and validate provided unit
  if (mashTempUnit) {
    const normalized = mashTempUnit.toUpperCase();
    if (normalized === "C" || normalized === "F") {
      return normalized as TemperatureUnit;
    }
    // Invalid unit provided, log warning and fall through to default
    void UnifiedLogger.warn(
      "import-review",
      `Invalid mash_temp_unit "${mashTempUnit}", using default for ${unitSystem}`
    );
  }
  // Fall back to unit system default
  return unitSystem === "metric" ? "C" : "F";
}

/**
 * Coerce ingredient time values to valid numbers or undefined
 */
function coerceIngredientTime(input: unknown): number | undefined {
  if (input == null) {
    return undefined;
  } // keep missing as missing
  if (typeof input === "boolean") {
    return undefined;
  } // ignore booleans
  if (input === "" || input === 0 || input === "0") {
    return 0;
  } // preserve explicit zero
  const n = typeof input === "number" ? input : Number(input);
  return Number.isFinite(n) && n >= 0 ? n : undefined; // reject NaN/±Inf/negatives
}

/**
 * Normalize and validate imported ingredients
 * Filters out invalid ingredients and logs errors
 * Returns array ready for both metrics calculation and recipe creation
 */
function normalizeImportedIngredients(
  ingredients: any[] | undefined
): RecipeIngredient[] {
  if (!ingredients || !Array.isArray(ingredients)) {
    return [];
  }

  return ingredients
    .filter((ing: any) => {
      // Validate required fields before mapping
      if (!ing.ingredient_id) {
        void UnifiedLogger.warn(
          "import-review",
          "Ingredient missing ingredient_id",
          ing
        );
        return false;
      }
      if (!ing.name || !ing.type || !ing.unit) {
        void UnifiedLogger.error(
          "import-review",
          "Ingredient missing required fields",
          ing
        );
        return false;
      }
      if (ing.amount === "" || ing.amount == null) {
        void UnifiedLogger.error(
          "import-review",
          "Ingredient has missing amount",
          ing
        );
        return false;
      }
      const amountNumber =
        typeof ing.amount === "number" ? ing.amount : Number(ing.amount);
      if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
        void UnifiedLogger.error(
          "import-review",
          "Ingredient has invalid amount",
          ing
        );
        return false;
      }
      return true;
    })
    .map((ing: any): RecipeIngredient => {
      const type = String(ing.type).toLowerCase();
      return {
        // No id - backend generates on creation
        ingredient_id: ing.ingredient_id,
        name: ing.name,
        type: type,
        amount:
          typeof ing.amount === "number" ? ing.amount : Number(ing.amount),
        unit: ing.unit,
        use: ing.use,
        time: coerceIngredientTime(ing.time),
        instance_id: generateUniqueId("ing"),
        // Include type-specific fields for proper ingredient matching and metrics
        ...(type === "grain" && {
          potential: ing.potential,
          color: ing.color,
          grain_type: ing.grain_type,
        }),
        ...(type === "hop" && {
          alpha_acid: ing.alpha_acid,
        }),
        ...(type === "yeast" && {
          attenuation: ing.attenuation,
        }),
        // Preserve BeerXML metadata if available
        ...(ing.beerxml_data && {
          beerxml_data: ing.beerxml_data,
        }),
      };
    });
}

export default function ImportReviewScreen() {
  const theme = useTheme();
  const styles = createRecipeStyles(theme);
  const params = useLocalSearchParams<{
    recipeData: string;
    filename: string;
    createdIngredientsCount: string;
  }>();

  const queryClient = useQueryClient();
  const { create: createRecipe } = useRecipes();
  const [recipeData] = useState(() => {
    try {
      return JSON.parse(params.recipeData);
    } catch (error) {
      void UnifiedLogger.error(
        "import-review",
        "Failed to parse recipe data:",
        error
      );
      return null;
    }
  });

  /**
   * Normalize ingredients once - use this for both preview and creation
   * This ensures "what you see is what you get"
   */
  const normalizedIngredients = useMemo(() => {
    return normalizeImportedIngredients(recipeData?.ingredients);
  }, [recipeData?.ingredients]);

  /**
   * Count of ingredients that were filtered out during normalization
   */
  const filteredOutCount = useMemo(() => {
    const originalCount = recipeData?.ingredients?.length || 0;
    const normalizedCount = normalizedIngredients.length;
    return originalCount - normalizedCount;
  }, [recipeData?.ingredients, normalizedIngredients.length]);

  /**
   * Calculate recipe metrics before creation using offline-first approach
   */
  const {
    data: calculatedMetrics,
    isLoading: metricsLoading,
    error: metricsError,
  } = useQuery({
    queryKey: [
      "recipeMetrics",
      "beerxml-import-offline",
      recipeData?.batch_size,
      recipeData?.batch_size_unit,
      recipeData?.efficiency,
      recipeData?.boil_time,
      recipeData?.mash_temperature,
      recipeData?.mash_temp_unit,
      // Include ingredient fingerprint for cache invalidation
      normalizedIngredients.length,
      normalizedIngredients
        .map(i => `${i.ingredient_id}:${i.amount}:${i.unit}`)
        .join("|"),
    ],
    queryFn: async () => {
      if (!recipeData || normalizedIngredients.length === 0) {
        return null;
      }

      // Use pre-normalized ingredients (already validated and have instance_ids)

      // Derive unit system using centralized logic
      const unitSystem = deriveUnitSystem(
        recipeData.batch_size_unit,
        recipeData.unit_system
      );

      // Prepare recipe data for offline calculation
      const batchSize =
        typeof recipeData.batch_size === "number"
          ? recipeData.batch_size
          : Number(recipeData.batch_size);
      const boilTime = coerceIngredientTime(recipeData.boil_time);

      const recipeFormData: RecipeMetricsInput = {
        batch_size:
          Number.isFinite(batchSize) && batchSize > 0 ? batchSize : 19.0,
        batch_size_unit:
          recipeData.batch_size_unit || (unitSystem === "metric" ? "l" : "gal"),
        efficiency: recipeData.efficiency || 75,
        boil_time: boilTime ?? 60,
        mash_temp_unit: deriveMashTempUnit(
          recipeData.mash_temp_unit,
          unitSystem
        ),
        mash_temperature:
          recipeData.mash_temperature ?? (unitSystem === "metric" ? 67 : 152),
        ingredients: normalizedIngredients,
      };

      // Calculate metrics offline (always, no network dependency)
      // Validation failures return null, but internal errors throw to set metricsError
      const validation =
        OfflineMetricsCalculator.validateRecipeData(recipeFormData);
      if (!validation.isValid) {
        void UnifiedLogger.warn(
          "import-review",
          "Invalid recipe data for metrics calculation",
          validation.errors
        );
        return null; // Validation failure - no error state, just no metrics
      }

      try {
        const metrics =
          OfflineMetricsCalculator.calculateMetrics(recipeFormData);
        return metrics;
      } catch (error) {
        // Internal calculator error - throw to set metricsError state
        void UnifiedLogger.error(
          "import-review",
          "Unexpected metrics calculation failure",
          error
        );
        throw error; // Re-throw to trigger error state
      }
    },
    enabled: !!recipeData && normalizedIngredients.length > 0,
    staleTime: Infinity, // Deterministic calculation, never stale
    retry: false, // Local calculation doesn't need retries
  });

  /**
   * Create recipe mutation
   */
  const createRecipeMutation = useMutation({
    mutationFn: async () => {
      // Use pre-normalized ingredients (same as used for preview and metrics)
      // Derive unit system using centralized logic
      const unitSystem = deriveUnitSystem(
        recipeData.batch_size_unit,
        recipeData.unit_system
      );

      const rawBatchSize =
        typeof recipeData.batch_size === "number"
          ? recipeData.batch_size
          : Number(recipeData.batch_size);
      const normalizedBatchSize =
        Number.isFinite(rawBatchSize) && rawBatchSize > 0 ? rawBatchSize : 19.0;

      const boilTime = coerceIngredientTime(recipeData.boil_time);
      const normalizedBoilTime = boilTime ?? 60;

      // Prepare recipe data for creation
      const recipePayload: Partial<Recipe> = {
        name: recipeData.name,
        style: recipeData.style || "",
        description: recipeData.description || "",
        notes: recipeData.notes || "",
        batch_size: normalizedBatchSize,
        batch_size_unit:
          recipeData.batch_size_unit || (unitSystem === "metric" ? "l" : "gal"),
        boil_time: normalizedBoilTime,
        efficiency: recipeData.efficiency || 75,
        unit_system: unitSystem,
        mash_temp_unit: deriveMashTempUnit(
          recipeData.mash_temp_unit,
          unitSystem
        ),
        mash_temperature:
          recipeData.mash_temperature ?? (unitSystem === "metric" ? 67 : 152),
        is_public: false, // Import as private by default
        // Include calculated metrics if available
        ...(calculatedMetrics && {
          estimated_og: calculatedMetrics.og,
          estimated_fg: calculatedMetrics.fg,
          estimated_abv: calculatedMetrics.abv,
          estimated_ibu: calculatedMetrics.ibu,
          estimated_srm: calculatedMetrics.srm,
        }),
        ingredients: normalizedIngredients,
      };

      // Use offline V2 createRecipe which creates temp recipe first, then syncs to server
      // This ensures immediate display with temp ID, then updates with server ID after sync
      return await createRecipe(recipePayload);
    },
    onSuccess: createdRecipe => {
      // Invalidate queries to refresh recipe lists
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECIPES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_RECIPES });
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.RECIPES, "offline"],
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });

      // Prime the detail cache for immediate access
      queryClient.setQueryData(
        QUERY_KEYS.RECIPE(createdRecipe.id),
        createdRecipe
      );

      // Show success message and navigate to recipe
      Alert.alert(
        "Import Successful",
        `"${recipeData.name}" has been imported successfully!`,
        [
          {
            text: "View Recipe",
            onPress: () => {
              // Replace current modal with ViewRecipe modal (like createRecipe does)
              router.dismissAll();
              router.replace({
                pathname: "/(modals)/(recipes)/viewRecipe",
                params: { recipe_id: createdRecipe.id },
              });
            },
          },
          {
            text: "Continue Importing",
            onPress: () => {
              // Navigate back to import screen
              router.dismissAll();
              router.push("/(modals)/(beerxml)/importBeerXML");
            },
          },
        ]
      );
    },
    onError: (error: any) => {
      void UnifiedLogger.error("import-review", "Recipe creation error", error);
      Alert.alert(
        "Import Failed",
        `Failed to create recipe "${recipeData.name}". Please try again.`,
        [{ text: "OK" }]
      );
    },
  });

  /**
   * Handle recipe creation
   */
  const handleCreateRecipe = () => {
    Alert.alert(
      "Create Recipe",
      `Create "${recipeData.name}" in your recipe collection?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create",
          onPress: () => createRecipeMutation.mutate(),
        },
      ]
    );
  };

  /**
   * Navigate back to ingredient matching
   */
  const handleGoBack = () => {
    router.back();
  };

  /**
   * Navigate to main screen
   */
  const handleCancel = () => {
    Alert.alert(
      "Cancel Import",
      "Are you sure you want to cancel this import?",
      [
        { text: "Continue Importing", style: "cancel" },
        {
          text: "Cancel Import",
          style: "destructive",
          onPress: () => router.dismissAll(),
        },
      ]
    );
  };

  if (!recipeData) {
    return (
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.errorTitle}>Invalid Recipe Data</Text>
          <Text style={styles.errorText}>
            The recipe data could not be loaded. Please try importing again.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.dismissAll()}
          >
            <MaterialIcons
              name="home"
              size={24}
              color={theme.colors.background}
            />
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              Go Home
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ModalHeader
        title="Import Review"
        testID="import-review-header"
        rightActions={
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <MaterialIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        }
        showHomeButton={false}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        testID={TEST_IDS.patterns.scrollAction("import-review")}
      >
        {/* Import Summary */}
        <View
          style={styles.section}
          testID={TEST_IDS.patterns.sectionContainer("import-summary")}
        >
          <Text style={styles.sectionTitle}>Import Summary</Text>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <MaterialIcons
                name="description"
                size={24}
                color={theme.colors.primary}
              />
              <View style={styles.summaryText}>
                <Text style={styles.summaryLabel}>Source File</Text>
                <Text style={styles.summaryValue}>{params.filename}</Text>
              </View>
            </View>

            <View style={styles.summaryItem}>
              <MaterialIcons
                name="kitchen"
                size={24}
                color={theme.colors.primary}
              />
              <View style={styles.summaryText}>
                <Text style={styles.summaryLabel}>Recipe</Text>
                <Text style={styles.summaryValue}>{recipeData.name}</Text>
              </View>
            </View>

            <View style={styles.summaryItem}>
              <MaterialIcons
                name="inventory"
                size={24}
                color={theme.colors.primary}
              />
              <View style={styles.summaryText}>
                <Text style={styles.summaryLabel}>Ingredients</Text>
                <Text style={styles.summaryValue}>
                  {normalizedIngredients.length} ingredients
                  {filteredOutCount > 0 && (
                    <Text style={{ color: theme.colors.warning }}>
                      {" "}
                      ({filteredOutCount} invalid filtered out)
                    </Text>
                  )}
                </Text>
              </View>
            </View>

            {params.createdIngredientsCount &&
            parseInt(params.createdIngredientsCount, 10) > 0 ? (
              <View style={styles.summaryItem}>
                <MaterialIcons
                  name="add-circle"
                  size={24}
                  color={theme.colors.success}
                />
                <View style={styles.summaryText}>
                  <Text style={styles.summaryLabel}>
                    New Ingredients Created
                  </Text>
                  <Text style={styles.summaryValue}>
                    {params.createdIngredientsCount} new ingredients
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* Recipe Details */}
        <View
          style={styles.section}
          testID={TEST_IDS.patterns.sectionContainer("recipe-details")}
        >
          <Text style={styles.sectionTitle}>Recipe Details</Text>

          <View style={styles.recipeDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={styles.detailValue}>
                {recipeData.name || "Unnamed Recipe"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Style:</Text>
              <Text style={styles.detailValue}>
                {recipeData.style || "Not specified"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Batch Size:</Text>
              <Text style={styles.detailValue}>
                {(() => {
                  const n = Number(recipeData.batch_size);
                  const displayValue = Number.isFinite(n)
                    ? n.toFixed(1)
                    : "N/A";

                  const unitSystem = deriveUnitSystem(
                    recipeData.batch_size_unit,
                    recipeData.unit_system
                  );
                  const rawUnit = String(
                    recipeData.batch_size_unit || ""
                  ).toLowerCase();

                  const unitLabel =
                    rawUnit === "l"
                      ? "L"
                      : rawUnit === "gal" || rawUnit === "gallons"
                        ? "gal"
                        : unitSystem === "metric"
                          ? "L"
                          : "gal";

                  return `${displayValue} ${unitLabel}`;
                })()}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Boil Time:</Text>
              <Text style={styles.detailValue}>
                {coerceIngredientTime(recipeData.boil_time) ?? 60} minutes
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Efficiency:</Text>
              <Text style={styles.detailValue}>
                {recipeData.efficiency || 75}%
              </Text>
            </View>

            {recipeData.description ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description:</Text>
                <Text style={styles.detailValue}>{recipeData.description}</Text>
              </View>
            ) : null}

            {recipeData.notes ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Notes:</Text>
                <Text style={styles.detailValue}>{recipeData.notes}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Calculated Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calculated Metrics</Text>

          {metricsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Calculating metrics...</Text>
            </View>
          ) : metricsError ? (
            <View
              style={[
                styles.summaryContainer,
                { backgroundColor: theme.colors.background },
              ]}
            >
              <MaterialIcons
                name="error"
                size={20}
                color={theme.colors.error}
              />
              <Text
                style={[
                  styles.summaryLabel,
                  { color: theme.colors.error, marginLeft: 8 },
                ]}
              >
                Failed to calculate metrics. Recipe will be created without
                estimated values.
              </Text>
            </View>
          ) : calculatedMetrics ? (
            <View style={styles.recipeDetails}>
              {calculatedMetrics.og ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Original Gravity:</Text>
                  <Text style={styles.detailValue}>
                    {calculatedMetrics.og.toFixed(3)}
                  </Text>
                </View>
              ) : null}
              {calculatedMetrics.fg ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Final Gravity:</Text>
                  <Text style={styles.detailValue}>
                    {calculatedMetrics.fg.toFixed(3)}
                  </Text>
                </View>
              ) : null}
              {calculatedMetrics.abv ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>ABV:</Text>
                  <Text style={styles.detailValue}>
                    {calculatedMetrics.abv.toFixed(1)}%
                  </Text>
                </View>
              ) : null}
              {calculatedMetrics.ibu != null ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>IBU:</Text>
                  <Text style={styles.detailValue}>
                    {calculatedMetrics.ibu.toFixed(1)}
                  </Text>
                </View>
              ) : null}
              {calculatedMetrics.srm != null ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>SRM:</Text>
                  <Text style={styles.detailValue}>
                    {calculatedMetrics.srm.toFixed(1)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.summaryLabel}>No metrics calculated</Text>
          )}
        </View>

        {/* Ingredient Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>

          <View style={styles.ingredientSummary}>
            {["grain", "hop", "yeast", "other"].map(type => {
              const ingredients = normalizedIngredients.filter(
                ing => ing.type === type
              );

              if (ingredients.length === 0) {
                return null;
              }

              return (
                <View key={type} style={styles.ingredientTypeSection}>
                  <Text style={styles.ingredientTypeTitle}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}s (
                    {ingredients.length})
                  </Text>
                  {ingredients.map(ingredient => (
                    <View
                      key={ingredient.instance_id}
                      style={styles.ingredientItem}
                    >
                      <View style={styles.ingredientInfo}>
                        <Text style={styles.ingredientName}>
                          {ingredient.name}
                        </Text>
                        <Text style={styles.ingredientDetails}>
                          {ingredient.amount || 0} {ingredient.unit || ""}
                          {ingredient.use && ` • ${ingredient.use}`}
                          {ingredient.time !== undefined && ingredient.time > 0
                            ? ` • ${ingredient.time} min`
                            : ""}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleGoBack}
            disabled={createRecipeMutation.isPending}
          >
            <MaterialIcons name="edit" size={24} color={theme.colors.text} />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Review Ingredients
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleCreateRecipe}
            disabled={createRecipeMutation.isPending}
          >
            {createRecipeMutation.isPending ? (
              <ActivityIndicator size="small" color={theme.colors.background} />
            ) : (
              <MaterialIcons
                name="check"
                size={24}
                color={theme.colors.background}
              />
            )}
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              {createRecipeMutation.isPending ? "Creating..." : "Create Recipe"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

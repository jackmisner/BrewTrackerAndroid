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

import React, { useState } from "react";
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
import ApiService from "@services/api/apiService";
import { IngredientInput } from "@src/types";
import { TEST_IDS } from "@src/constants/testIDs";
import { generateUniqueId } from "@utils/keyUtils";
import { QUERY_KEYS } from "@services/api/queryClient";
import { ModalHeader } from "@src/components/ui/ModalHeader";

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

export default function ImportReviewScreen() {
  const theme = useTheme();
  const styles = createRecipeStyles(theme);
  const params = useLocalSearchParams<{
    recipeData: string;
    filename: string;
    createdIngredientsCount: string;
  }>();

  const queryClient = useQueryClient();
  const [recipeData] = useState(() => {
    try {
      return JSON.parse(params.recipeData);
    } catch (error) {
      console.error("Failed to parse recipe data:", error);
      return null;
    }
  });

  /**
   * Calculate recipe metrics before creation
   */
  const {
    data: calculatedMetrics,
    isLoading: metricsLoading,
    error: metricsError,
  } = useQuery({
    queryKey: ["recipeMetrics", "beerxml-import", recipeData],
    queryFn: async () => {
      if (!recipeData || !recipeData.ingredients) {
        return null;
      }

      const metricsPayload = {
        batch_size: recipeData.batch_size || 5,
        batch_size_unit: recipeData.batch_size_unit || "gal",
        efficiency: recipeData.efficiency || 75,
        boil_time: recipeData.boil_time || 60,
        // Respect provided unit when present; default sensibly per system.
        mash_temp_unit: ((recipeData.mash_temp_unit as "C" | "F") ??
          ((String(recipeData.batch_size_unit).toLowerCase() === "l"
            ? "C"
            : "F") as "C" | "F")) as "C" | "F",
        mash_temperature:
          typeof recipeData.mash_temperature === "number"
            ? recipeData.mash_temperature
            : String(recipeData.batch_size_unit).toLowerCase() === "l"
              ? 67
              : 152,
        ingredients: recipeData.ingredients.filter(
          (ing: any) => ing.ingredient_id
        ),
      };

      const response =
        await ApiService.recipes.calculateMetricsPreview(metricsPayload);

      return response.data;
    },
    enabled:
      !!recipeData &&
      !!recipeData.ingredients &&
      recipeData.ingredients.length > 0,
    staleTime: 30000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 400) {
        return false;
      }
      return failureCount < 2;
    },
  });

  /**
   * Create recipe mutation
   */
  const createRecipeMutation = useMutation({
    mutationFn: async () => {
      // Prepare recipe data for creation
      const recipePayload = {
        name: recipeData.name,
        style: recipeData.style || "",
        description: recipeData.description || "",
        notes: recipeData.notes || "",
        batch_size: recipeData.batch_size,
        batch_size_unit: recipeData.batch_size_unit || "gal",
        boil_time: recipeData.boil_time || 60,
        efficiency: recipeData.efficiency || 75,
        unit_system: (recipeData.batch_size_unit === "l"
          ? "metric"
          : "imperial") as "metric" | "imperial",
        // Respect provided unit when present; default sensibly per system.
        mash_temp_unit: ((recipeData.mash_temp_unit as "C" | "F") ??
          ((String(recipeData.batch_size_unit).toLowerCase() === "l"
            ? "C"
            : "F") as "C" | "F")) as "C" | "F",
        mash_temperature:
          typeof recipeData.mash_temperature === "number"
            ? recipeData.mash_temperature
            : String(recipeData.batch_size_unit).toLowerCase() === "l"
              ? 67
              : 152,
        is_public: false, // Import as private by default
        // Include calculated metrics if available
        ...(calculatedMetrics && {
          estimated_og: calculatedMetrics.og,
          estimated_fg: calculatedMetrics.fg,
          estimated_abv: calculatedMetrics.abv,
          estimated_ibu: calculatedMetrics.ibu,
          estimated_srm: calculatedMetrics.srm,
        }),
        ingredients: (recipeData.ingredients || [])
          .filter((ing: any) => {
            // Validate required fields before mapping
            if (!ing.ingredient_id) {
              console.error("Ingredient missing ingredient_id:", ing);
              return false;
            }
            if (!ing.name || !ing.type || !ing.unit) {
              console.error("Ingredient missing required fields:", ing);
              return false;
            }
            if (isNaN(Number(ing.amount))) {
              console.error("Ingredient has invalid amount:", ing);
              return false;
            }
            return true;
          })
          .map(
            (ing: any): IngredientInput => ({
              ingredient_id: ing.ingredient_id,
              name: ing.name,
              type: ing.type,
              amount: Number(ing.amount) || 0,
              unit: ing.unit,
              use: ing.use,
              time: coerceIngredientTime(ing.time),
              instance_id: generateUniqueId("ing"), // Generate unique instance ID for each imported ingredient
            })
          ),
      };

      const response = await ApiService.recipes.create(recipePayload);
      return response.data;
    },
    onSuccess: createdRecipe => {
      // Invalidate queries to refresh recipe lists
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECIPES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });

      // Show success message and navigate to recipe
      Alert.alert(
        "Import Successful",
        `"${recipeData.name}" has been imported successfully!`,
        [
          {
            text: "View Recipe",
            onPress: () => {
              // Navigate to the newly created recipe
              router.dismissAll();
              router.push({
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
      console.error("🍺 Import Review - Recipe creation error:", error);
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
                  {recipeData.ingredients?.length || 0} ingredients
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
                  return Number.isFinite(n) ? n.toFixed(1) : "N/A";
                })()}{" "}
                {String(recipeData.batch_size_unit).toLowerCase() === "l"
                  ? "L"
                  : "gal"}
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
              {calculatedMetrics.ibu ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>IBU:</Text>
                  <Text style={styles.detailValue}>
                    {calculatedMetrics.ibu.toFixed(1)}
                  </Text>
                </View>
              ) : null}
              {calculatedMetrics.srm ? (
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
              const ingredients =
                recipeData.ingredients?.filter(
                  (ing: any) => ing.type === type
                ) || [];

              if (ingredients.length === 0) {
                return null;
              }

              return (
                <View key={type} style={styles.ingredientTypeSection}>
                  <Text style={styles.ingredientTypeTitle}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}s (
                    {ingredients.length})
                  </Text>
                  {ingredients.map((ingredient: any, index: number) => (
                    <View key={index} style={styles.ingredientItem}>
                      <Text style={styles.ingredientName}>
                        {ingredient.name}
                      </Text>
                      <Text style={styles.ingredientDetails}>
                        {ingredient.amount || 0} {ingredient.unit || ""}
                        {ingredient.use && ` • ${ingredient.use}`}
                        {ingredient.time > 0 &&
                          ` • ${coerceIngredientTime(ingredient.time)} min`}
                      </Text>
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

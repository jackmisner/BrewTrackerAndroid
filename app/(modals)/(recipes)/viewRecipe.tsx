import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import ApiService from "../../../src/services/API/apiService";
import { Recipe } from "../../../src/types";
import { viewRecipeStyles } from "../../../src/styles/modals/viewRecipeStyles";
import { useTheme } from "../../../src/contexts/ThemeContext";

/**
 * ViewRecipe Screen Component
 *
 * This screen displays detailed information about a specific recipe.
 * It receives a recipe_id through route parameters and fetches the full recipe data.
 *
 * *Key Concepts:*
 * 1. Route Parameters: Uses useLocalSearchParams() to get URL parameters
 * 2. Data Fetching: Uses React Query with recipe-specific query key
 * 3. Error Handling: Comprehensive loading, error, and empty states
 * 4. ScrollView Layout: Proper detail screen layout with sections
 * 5. TypeScript: Proper typing for parameters and data structures
 */
export default function ViewRecipeScreen() {
  const theme = useTheme();
  const styles = viewRecipeStyles(theme);
  // State for pull-to-refresh functionality
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Extract route parameters using Expo Router's useLocalSearchParams hook
   * This gets the recipe_id that was passed when navigating to this screen
   *
   * In recipes.tsx, we navigate with:
   * router.push({ pathname: "/(modals)/(recipes)/viewRecipe", params: { recipe_id: recipe.recipe_id } })
   */
  const { recipe_id } = useLocalSearchParams<{ recipe_id: string }>();

  /**
   * React Query hook for fetching recipe data
   *
   * *Key concepts:*
   * - queryKey includes recipe_id to make it unique per recipe
   * - queryFn is the actual API call function
   * - enabled ensures query only runs when we have a recipe_id
   * - retry: 1 limits retry attempts for failed requests
   * - staleTime controls how long data is considered fresh
   */
  const {
    data: recipeData,
    isLoading,
    error,
    refetch,
  } = useQuery<Recipe>({
    queryKey: ["recipe", recipe_id], // Unique key per recipe
    queryFn: async () => {
      if (!recipe_id) throw new Error("No recipe ID provided");
      const response = await ApiService.recipes.getById(recipe_id);
      return response.data;
    },
    enabled: !!recipe_id, // Only run query if recipe_id exists
    retry: 1,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  /**
   * Pull-to-refresh handler
   * Manually triggers a refetch of the recipe data
   */
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error("Error refreshing recipe:", error);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Navigation handler for back button
   * Uses router.back() to return to previous screen
   */
  const handleGoBack = () => {
    router.back();
  };

  /**
   * Navigation handler for starting a brew session with this recipe
   * TODO: Implement when brew session creation is available
   */
  const handleStartBrewing = () => {
    console.log("Start brewing with recipe:", recipe_id);
    // TODO: Navigate to create brew session screen with this recipe
  };

  /**
   * Format date strings for display
   * Converts ISO date strings to readable format
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  /**
   * Render a metric section (ABV, IBU, etc.)
   * Reusable component for displaying brewing metrics
   */
  const renderMetric = (
    label: string,
    value: string | number | undefined,
    unit?: string
  ) => (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value
          ? `${typeof value === "number" ? value.toFixed(label === "ABV" ? 1 : label === "OG" || label === "FG" ? 3 : 0) : value}${unit || ""}`
          : "—"}
      </Text>
    </View>
  );

  /**
   * Render ingredients section
   * Display all recipe ingredients organized by type
   */
  const renderIngredients = () => {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          <View style={styles.ingredientNote}>
            <MaterialIcons name="info" size={20} color="#666" />
            <Text style={styles.ingredientNoteText}>
              No ingredients available for this recipe
            </Text>
          </View>
        </View>
      );
    }

    // Group ingredients by type
    const grains = recipe.ingredients.filter(ing => ing.type === "grain");
    const hops = recipe.ingredients.filter(ing => ing.type === "hop");
    const yeasts = recipe.ingredients.filter(ing => ing.type === "yeast");
    const others = recipe.ingredients.filter(
      ing => !["grain", "hop", "yeast"].includes(ing.type)
    );

    const renderIngredientGroup = (
      title: string,
      ingredients: Recipe["ingredients"],
      icon: string
    ) => {
      if (ingredients.length === 0) return null;

      return (
        <View style={styles.ingredientGroup}>
          <View style={styles.ingredientGroupHeader}>
            <MaterialIcons name={icon as any} size={20} color="#f4511e" />
            <Text style={styles.ingredientGroupTitle}>{title}</Text>
          </View>
          {ingredients.map((ingredient, index) => (
            <View key={ingredient.id || index} style={styles.ingredientItem}>
              <Text style={styles.ingredientName}>{ingredient.name}</Text>
              <Text style={styles.ingredientAmount}>
                {ingredient.amount} {ingredient.unit}
                {ingredient.time &&
                  ingredient.time > 0 &&
                  ` • ${ingredient.time} min`}
                {ingredient.alpha_acid && ` • ${ingredient.alpha_acid}% AA`}
                {ingredient.attenuation &&
                  ` • ${ingredient.attenuation}% Attenuation`}
              </Text>
            </View>
          ))}
        </View>
      );
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Ingredients ({recipe.ingredients.length})
        </Text>
        {renderIngredientGroup("Grains & Malts", grains, "grain")}
        {renderIngredientGroup("Hops", hops, "local-florist")}
        {renderIngredientGroup("Yeast", yeasts, "science")}
        {renderIngredientGroup("Other", others, "more-horiz")}
      </View>
    );
  };

  /**
   * Render instructions section
   * Display brewing instructions and process steps
   * TODO: When API provides instructions data, this will show the actual steps
   */
  const renderInstructions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Brewing Instructions</Text>
      <View style={styles.ingredientNote}>
        <MaterialIcons name="list" size={20} color="#666" />
        <Text style={styles.ingredientNoteText}>
          Brewing instructions will be displayed here when available from the
          API
        </Text>
      </View>
    </View>
  );

  /**
   * Loading State
   * Show spinner and loading text while fetching data
   */
  if (isLoading) {
    return (
      <View style={styles.container}>
        {/* Header with back button - always visible */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recipe Details</Text>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f4511e" />
          <Text style={styles.loadingText}>Loading recipe...</Text>
        </View>
      </View>
    );
  }

  /**
   * Error State
   * Show error message and retry button when API call fails
   */
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recipe Details</Text>
        </View>

        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={64} color="#f44336" />
          <Text style={styles.errorTitle}>Failed to Load Recipe</Text>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /**
   * Empty State
   * Show message when no recipe data is returned
   */
  if (!recipeData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recipe Details</Text>
        </View>

        <View style={styles.errorContainer}>
          <MaterialIcons name="help-outline" size={64} color="#ccc" />
          <Text style={styles.errorTitle}>Recipe Not Found</Text>
          <Text style={styles.errorText}>
            This recipe could not be found or may have been deleted.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleGoBack}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /**
   * Success State
   * Render the full recipe details
   */

  const recipe = recipeData;

  /**
   * Main Render - Success State
   * Display the full recipe details with all sections
   */
  return (
    <View style={styles.container}>
      {/* Fixed Header with Navigation */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {recipe.name || "Recipe Details"}
        </Text>
        {/* Action button for starting a brew session */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleStartBrewing}
        >
          <MaterialIcons name="play-arrow" size={24} color="#f4511e" />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Recipe Basic Info Card */}
        <View style={styles.recipeCard}>
          <Text style={styles.recipeName}>
            {recipe.name || "Unnamed Recipe"}
          </Text>
          <Text style={styles.recipeStyle}>
            {recipe.style || "Unknown Style"}
          </Text>

          {recipe.description && (
            <Text style={styles.recipeDescription}>{recipe.description}</Text>
          )}

          {/* Recipe Metadata */}
          <View style={styles.metadataContainer}>
            {recipe.created_at && (
              <View style={styles.metadataItem}>
                <MaterialIcons name="schedule" size={16} color="#666" />
                <Text style={styles.metadataText}>
                  Created {formatDate(recipe.created_at)}
                </Text>
              </View>
            )}

            <View style={styles.metadataItem}>
              <MaterialIcons name="person" size={16} color="#666" />
              <Text style={styles.metadataText}>
                Recipe ID: {recipe.recipe_id}
              </Text>
            </View>
          </View>
        </View>

        {/* Brewing Metrics Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Brewing Metrics</Text>
          <View style={styles.metricsGrid}>
            {renderMetric("OG", recipe.estimated_og)}
            {renderMetric("FG", recipe.estimated_fg)}
            {renderMetric("ABV", recipe.estimated_abv, "%")}
            {renderMetric("IBU", recipe.estimated_ibu)}
            {renderMetric("SRM", recipe.estimated_srm)}
            {renderMetric(
              "Mash Temp",
              recipe.mash_temperature,
              "°" + recipe.mash_temp_unit
            )}
            {/* TODO get unit system for recipe */}
          </View>
        </View>

        {/* Recipe Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recipe Details</Text>
          <View style={styles.detailsContainer}>
            {recipe.batch_size && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Batch Size:</Text>
                <Text style={styles.detailValue}>
                  {recipe.batch_size} {recipe.batch_size_unit || "gal"}
                </Text>
              </View>
            )}

            {recipe.boil_time && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Boil Time:</Text>
                <Text style={styles.detailValue}>
                  {recipe.boil_time} minutes
                </Text>
              </View>
            )}

            {recipe.efficiency && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Efficiency:</Text>
                <Text style={styles.detailValue}>{recipe.efficiency}%</Text>
              </View>
            )}

            {recipe.mash_temperature && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mash Temperature:</Text>
                <Text style={styles.detailValue}>
                  {recipe.mash_temperature}°{recipe.mash_temp_unit || "C"}
                </Text>
              </View>
            )}

            {recipe.mash_time && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mash Time:</Text>
                <Text style={styles.detailValue}>
                  {recipe.mash_time} minutes
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Visibility:</Text>
              <Text style={styles.detailValue}>
                {recipe.is_public ? "Public" : "Private"}
              </Text>
            </View>
          </View>
        </View>

        {/* Ingredients Section - Placeholder for future implementation */}
        {renderIngredients()}

        {/* Instructions Section - Placeholder for future implementation */}
        {renderInstructions()}

        {/* Notes Section */}
        {recipe.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesContainer}>
              <Text style={styles.notesText}>{recipe.notes}</Text>
            </View>
          </View>
        )}

        {/* Bottom spacing for better UX */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button - Start Brewing */}
      <TouchableOpacity style={styles.fab} onPress={handleStartBrewing}>
        <MaterialIcons name="play-arrow" size={28} color="#fff" />
        <Text style={styles.fabText}>Start Brewing</Text>
      </TouchableOpacity>
    </View>
  );
}

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
import ApiService from "@services/api/apiService";
import { Recipe } from "@src/types";
import {
  RecipeVersionHistoryResponse,
  isEnhancedVersionHistoryResponse,
} from "@src/types/api";
import { viewRecipeStyles } from "@styles/modals/viewRecipeStyles";
import { useTheme } from "@contexts/ThemeContext";
import { BrewingMetricsDisplay } from "@src/components/recipes/BrewingMetrics/BrewingMetricsDisplay";
import { formatHopTime, formatHopUsage } from "@src/utils/formatUtils";

/**
 * Displays detailed information about a specific brewing recipe, including metrics, ingredients, and instructions.
 *
 * Fetches recipe data based on the provided `recipe_id` from route parameters, and presents loading, error, and empty states as appropriate. Supports pull-to-refresh and navigation controls. Some sections, such as brewing instructions and brew session creation, are placeholders for future implementation.
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

  // Query for version history - moved up to avoid conditional hook usage
  const { data: versionHistoryData } = useQuery<RecipeVersionHistoryResponse>({
    queryKey: ["versionHistory", recipe_id],
    queryFn: async () => {
      if (!recipe_id) throw new Error("No recipe ID provided");
      const response = await ApiService.recipes.getVersionHistory(recipe_id);
      return response.data;
    },
    enabled: !!recipe_id && !!recipeData, // Only run when we have recipe data
    retry: 1,
    staleTime: 1000 * 60 * 5,
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
   */
  const handleStartBrewing = () => {
    router.push({
      pathname: "/(modals)/(brewSessions)/createBrewSession",
      params: { recipeId: recipe_id },
    });
  };

  /**
   * Navigation handler for editing the recipe
   */
  const handleEditRecipe = () => {
    if (recipe_id) {
      router.push({
        pathname: "/(modals)/(recipes)/editRecipe",
        params: { recipe_id: recipe_id },
      });
    }
  };

  /**
   * Navigation handler for viewing version history
   */
  const handleViewVersionHistory = () => {
    if (recipe_id) {
      router.push({
        pathname: "/(modals)/(recipes)/versionHistory",
        params: { recipe_id: recipe_id },
      });
    }
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
            <View
              key={`${ingredient.id || "no-id"}-${ingredient.type}-${index}`}
              style={styles.ingredientItem}
            >
              <Text style={styles.ingredientName}>{ingredient.name}</Text>
              <Text style={styles.ingredientAmount}>
                {ingredient.amount} {ingredient.unit}
                {/* Only show time if hops */}
                {ingredient.type === "hop" &&
                  ingredient.time &&
                  ingredient.time > 0 &&
                  ` • ${formatHopTime(ingredient.time, ingredient.use || "")}`}
                {ingredient.type === "hop" &&
                  ingredient.use &&
                  ` • ${formatHopUsage(ingredient.use)}`}
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
        {/* Action buttons */}
        <View style={styles.headerActions}>
          {(recipe.version && recipe.version > 1) || recipe.parent_recipe_id ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleViewVersionHistory}
            >
              <MaterialIcons name="timeline" size={22} color="#f4511e" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleEditRecipe}
          >
            <MaterialIcons name="edit" size={22} color="#f4511e" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleStartBrewing}
          >
            <MaterialIcons name="play-arrow" size={24} color="#f4511e" />
          </TouchableOpacity>
        </View>
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
            {recipe.updated_at && (
              <View style={styles.metadataItem}>
                <MaterialIcons name="update" size={16} color="#666" />
                <Text style={styles.metadataText}>
                  Updated {formatDate(recipe.updated_at)}
                </Text>
              </View>
            )}
          </View>

          {/* Version Information */}
          {(recipe.version ||
            recipe.parent_recipe_id ||
            recipe.original_author ||
            recipe.clone_count) && (
            <View style={styles.metadataContainer}>
              {recipe.version && (
                <View style={styles.metadataItem}>
                  <MaterialIcons name="timeline" size={16} color="#666" />
                  <Text style={styles.metadataText}>
                    Version {recipe.version}
                  </Text>
                </View>
              )}

              {/* Show navigation to immediate parent if available */}
              {(() => {
                if (
                  !versionHistoryData ||
                  !isEnhancedVersionHistoryResponse(versionHistoryData)
                ) {
                  return null;
                }
                const enhancedData = versionHistoryData;
                if (!enhancedData.immediate_parent) {
                  return null;
                }
                return (
                  <TouchableOpacity
                    style={styles.metadataItem}
                    onPress={() => {
                      router.push({
                        pathname: "/(modals)/(recipes)/viewRecipe",
                        params: {
                          recipe_id: enhancedData.immediate_parent!.recipe_id,
                        },
                      });
                    }}
                  >
                    <MaterialIcons
                      name="arrow-back"
                      size={16}
                      color={theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.metadataText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      View Parent Recipe (v
                      {enhancedData.immediate_parent.version})
                    </Text>
                  </TouchableOpacity>
                );
              })()}

              {/* Show navigation to root recipe if this isn't v1 and not the immediate parent */}
              {(() => {
                if (
                  !versionHistoryData ||
                  !isEnhancedVersionHistoryResponse(versionHistoryData)
                ) {
                  return null;
                }
                const enhancedData = versionHistoryData;
                if (
                  !enhancedData.root_recipe ||
                  enhancedData.root_recipe.recipe_id === recipe_id ||
                  enhancedData.root_recipe.recipe_id ===
                    enhancedData.immediate_parent?.recipe_id
                ) {
                  return null;
                }
                return (
                  <TouchableOpacity
                    style={styles.metadataItem}
                    onPress={() => {
                      router.push({
                        pathname: "/(modals)/(recipes)/viewRecipe",
                        params: {
                          recipe_id: enhancedData.root_recipe!.recipe_id,
                        },
                      });
                    }}
                  >
                    <MaterialIcons
                      name="home"
                      size={16}
                      color={theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.metadataText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      View v1
                    </Text>
                  </TouchableOpacity>
                );
              })()}

              {recipe.original_author &&
                recipe.original_author !== recipe.username && (
                  <View style={styles.metadataItem}>
                    <MaterialIcons name="person" size={16} color="#666" />
                    <Text style={styles.metadataText}>
                      Originally by {recipe.original_author}
                    </Text>
                  </View>
                )}
              {recipe.clone_count && recipe.clone_count > 0 && (
                <View style={styles.metadataItem}>
                  <MaterialIcons name="content-copy" size={16} color="#666" />
                  <Text style={styles.metadataText}>
                    {recipe.clone_count}{" "}
                    {recipe.clone_count === 1 ? "clone" : "clones"}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Brewing Metrics - Using Reusable Component */}
        <BrewingMetricsDisplay
          metrics={{
            og: recipe.estimated_og,
            fg: recipe.estimated_fg,
            abv: recipe.estimated_abv,
            ibu: recipe.estimated_ibu,
            srm: recipe.estimated_srm,
          }}
          mash_temperature={recipe.mash_temperature}
          mash_temp_unit={recipe.mash_temp_unit}
          compact={false}
          showTitle={true}
        />

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

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import ApiService from "../../src/services/API/apiService";
import { Recipe } from "../../src/types";

/**
 * ViewRecipe Screen Component
 *
 * This screen displays detailed information about a specific recipe.
 * It receives a recipe_id through route parameters and fetches the full recipe data.
 *
 * Key Learning Points:
 * 1. Route Parameters: Uses useLocalSearchParams() to get URL parameters
 * 2. Data Fetching: Uses React Query with recipe-specific query key
 * 3. Error Handling: Comprehensive loading, error, and empty states
 * 4. ScrollView Layout: Proper detail screen layout with sections
 * 5. TypeScript: Proper typing for parameters and data structures
 */
export default function ViewRecipeScreen() {
  // State for pull-to-refresh functionality
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Extract route parameters using Expo Router's useLocalSearchParams hook
   * This gets the recipe_id that was passed when navigating to this screen
   *
   * In recipes.tsx, we navigate with:
   * router.push({ pathname: "/(tabs)/viewRecipe", params: { recipe_id: recipe.recipe_id } })
   */
  const { recipe_id } = useLocalSearchParams<{ recipe_id: string }>();

  /**
   * React Query hook for fetching recipe data
   *
   * Key concepts:
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

/**
 * StyleSheet for ViewRecipe Screen
 *
 * Organized by component/section for better maintainability:
 * 1. Container and Layout
 * 2. Header and Navigation
 * 3. Content Sections
 * 4. Cards and Components
 * 5. Text Styles
 * 6. States (loading, error)
 * 7. Interactive Elements
 */
const styles = StyleSheet.create({
  // Container and Layout
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for FAB
  },

  // Header and Navigation
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 20, // Account for status bar
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },

  // Content Sections
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },

  // Recipe Card
  recipeCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  recipeStyle: {
    fontSize: 16,
    color: "#f4511e",
    fontWeight: "600",
    marginBottom: 12,
  },
  recipeDescription: {
    fontSize: 16,
    color: "#666",
    lineHeight: 22,
    marginBottom: 16,
  },

  // Metadata
  metadataContainer: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 16,
    gap: 8,
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metadataText: {
    fontSize: 14,
    color: "#666",
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  metricCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    minWidth: "30%",
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },

  // Details
  detailsContainer: {
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },

  // Notes
  notesContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 16,
  },
  notesText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },

  // Placeholder sections
  ingredientNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  ingredientNoteText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },

  // Ingredients styling
  ingredientGroup: {
    marginBottom: 20,
  },
  ingredientGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  ingredientGroupTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  ingredientItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  ingredientAmount: {
    fontSize: 14,
    color: "#666",
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#f4511e",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Floating Action Button
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#f4511e",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Spacing
  bottomSpacing: {
    height: 32,
  },
});

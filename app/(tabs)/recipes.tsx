/**
 * Recipes Tab Screen
 *
 * Main recipes listing screen that displays user and public recipes with search.
 * Provides recipe management navigation including creation and viewing; edit/delete
 * are currently routed via context menu with placeholder actions where noted.
 *
 * Features:
 * - Real-time recipe search
 * - Pull-to-refresh functionality
 * - Recipe context menu (view, edit, clone/beerXML/share/delete as placeholders, create brew session)
 * - Recipe cards with key metrics (OG, FG, ABV, IBU, SRM)
 * - Empty state handling with call-to-action
 * - Error state handling with retry functionality
 *
 * Navigation:
 * - Tap recipe: View recipe details
 * - Long press: Show context menu
 * - FAB: Create new recipe
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert,
  GestureResponderEvent,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import ApiService from "@services/api/apiService";
import { Recipe } from "@src/types";
import { useTheme } from "@contexts/ThemeContext";
import { recipesStyles } from "@styles/tabs/recipesStyles";
import { formatABV, formatIBU, formatSRM } from "@utils/formatUtils";
import {
  RecipeContextMenu,
  createDefaultRecipeActions,
} from "@src/components/ui/ContextMenu/RecipeContextMenu";
import { useContextMenu } from "@src/components/ui/ContextMenu/BaseContextMenu";
import { getTouchPosition } from "@src/components/ui/ContextMenu/contextMenuUtils";

/**
 * Displays a tabbed interface for browsing and managing recipes, allowing users to view their own recipes or search public recipes.
 *
 * Provides features such as tab navigation, search for public recipes, pull-to-refresh, error and empty states, and navigation to recipe detail or creation screens. Integrates with backend APIs for data fetching and handles loading and error conditions gracefully.
 *
 * @returns The rendered recipes screen component.
 */
export default function RecipesScreen() {
  const theme = useTheme();
  const styles = recipesStyles(theme);
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"my" | "public">("my");
  const [refreshing, setRefreshing] = useState(false);
  const lastParamsRef = useRef<string | undefined>(undefined);

  // Context menu state
  const contextMenu = useContextMenu<Recipe>();

  // Set active tab from URL parameters
  // Always respond to navigation with explicit activeTab parameters
  useEffect(() => {
    const currentActiveTabParam = params.activeTab as string | undefined;

    // Always set the tab based on the URL parameter
    if (currentActiveTabParam === "public") {
      setActiveTab("public");
    } else if (currentActiveTabParam === "my") {
      setActiveTab("my");
    }
    // If no parameter, don't change current state (for manual tab changes)

    lastParamsRef.current = currentActiveTabParam;
  }, [params.activeTab]);

  // Handle pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === "my") {
        await refetchMyRecipes();
      } else {
        await refetchPublicRecipes();
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Query for user's recipes
  const {
    data: myRecipesData,
    isLoading: isLoadingMyRecipes,
    error: myRecipesError,
    refetch: refetchMyRecipes,
  } = useQuery({
    queryKey: ["recipes", "my"],
    queryFn: async () => {
      const response = await ApiService.recipes.getAll(1, 20);
      return response.data;
    },
    retry: 1,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });

  // Query for public recipes
  const {
    data: publicRecipesData,
    isLoading: isLoadingPublicRecipes,
    error: publicRecipesError,
    refetch: refetchPublicRecipes,
  } = useQuery({
    queryKey: ["recipes", "public", searchQuery],
    queryFn: async () => {
      const response = await ApiService.recipes.getPublic(1, 20, {
        search: searchQuery || undefined,
      });
      return response.data;
    },
    retry: 1,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });

  const currentData = activeTab === "my" ? myRecipesData : publicRecipesData;
  const currentRecipes = currentData?.recipes || [];
  const isLoading =
    activeTab === "my" ? isLoadingMyRecipes : isLoadingPublicRecipes;
  const error = activeTab === "my" ? myRecipesError : publicRecipesError;

  const handleRefresh = () => {
    if (activeTab === "my") {
      refetchMyRecipes();
    } else {
      refetchPublicRecipes();
    }
  };

  const handleRecipePress = (recipe: Recipe) => {
    router.push({
      pathname: "/(modals)/(recipes)/viewRecipe",
      params: { recipe_id: recipe.id },
    });
  };

  const handleCreateRecipe = () => {
    router.push("/(modals)/(recipes)/createRecipe");
  };

  // Context menu action handlers
  const handleRecipeLongPress = (
    recipe: Recipe,
    event: GestureResponderEvent
  ) => {
    const position = getTouchPosition(event);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Silently handle devices without haptic support
    }
    contextMenu.showMenu(recipe, position);
  };

  const contextMenuActions = createDefaultRecipeActions({
    onView: (recipe: Recipe) => {
      router.push({
        pathname: "/(modals)/(recipes)/viewRecipe",
        params: { recipe_id: recipe.id },
      });
    },
    onEdit: (recipe: Recipe) => {
      router.push({
        pathname: "/(modals)/(recipes)/editRecipe",
        params: { recipe_id: recipe.id },
      });
    },
    onClone: (recipe: Recipe) => {
      // TODO: Implement recipe cloning functionality
      Alert.alert(
        "Clone Recipe",
        `Cloning "${recipe.name}" - Feature coming soon!`
      );
    },
    onBeerXMLExport: (recipe: Recipe) => {
      // TODO: Implement BeerXML export functionality
      Alert.alert(
        "Export BeerXML",
        `Exporting "${recipe.name}" - Feature coming soon!`
      );
    },
    onStartBrewing: (recipe: Recipe) => {
      router.push({
        pathname: "/(modals)/(brewSessions)/createBrewSession",
        params: { recipeId: recipe.id },
      });
    },
    onShare: (recipe: Recipe) => {
      // TODO: Implement recipe sharing functionality
      Alert.alert(
        "Share Recipe",
        `Sharing "${recipe.name}" - Feature coming soon!`
      );
    },
    onDelete: (recipe: Recipe) => {
      // TODO: Implement recipe deletion with API call
      Alert.alert(
        "Delete Recipe",
        `Deleting "${recipe.name}" - Feature coming soon!`
      );
    },
  });

  const renderRecipeItem = ({ item: recipe }: { item: Recipe }) => {
    // Add safety checks for recipe data
    if (!recipe || !recipe.name) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.recipeCard}
        onPress={() => handleRecipePress(recipe)}
        onLongPress={event => handleRecipeLongPress(recipe, event)}
      >
        <View style={styles.recipeHeader}>
          <Text style={styles.recipeName} numberOfLines={1}>
            {recipe.name || "Unnamed Recipe"}
          </Text>
          <Text style={styles.recipeStyle}>
            {recipe.style || "Unknown Style"}
          </Text>
        </View>

        <Text style={styles.recipeDescription} numberOfLines={2}>
          {recipe.description || "No description available"}
        </Text>

        <View style={styles.recipeMetrics}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>OG</Text>
            <Text style={styles.metricValue}>
              {recipe.estimated_og?.toFixed(3) || "—"}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>FG</Text>
            <Text style={styles.metricValue}>
              {recipe.estimated_fg?.toFixed(3) || "—"}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>ABV</Text>
            <Text style={styles.metricValue}>
              {formatABV(recipe.estimated_abv)}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>IBU</Text>
            <Text style={styles.metricValue}>
              {formatIBU(recipe.estimated_ibu)}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>SRM</Text>
            <Text style={styles.metricValue}>
              {formatSRM(recipe.estimated_srm)}
            </Text>
          </View>
          {activeTab === "public" && (
            <View style={styles.metric}>
              <MaterialIcons
                name="person"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.authorText}>
                {recipe.username === "Anonymous User"
                  ? "Anonymous"
                  : recipe.username}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons
        name="menu-book"
        size={64}
        color={theme.colors.textMuted}
      />
      <Text style={styles.emptyTitle}>
        {activeTab === "my" ? "No Recipes Yet" : "No Public Recipes Found"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === "my"
          ? "Create your first recipe to start brewing!"
          : "Try adjusting your search terms"}
      </Text>

      {activeTab === "my" && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateRecipe}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
          <Text style={styles.createButtonText}>Create Recipe</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header with tabs */}
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "my" && styles.activeTab]}
            onPress={() => {
              // Only navigate if not already on my tab
              if (activeTab !== "my") {
                router.push({
                  pathname: "/(tabs)/recipes",
                  params: { activeTab: "my" },
                });
              }
            }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "my" && styles.activeTabText,
              ]}
            >
              My Recipes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "public" && styles.activeTab]}
            onPress={() => {
              // Only navigate if not already on public tab
              if (activeTab !== "public") {
                router.push({
                  pathname: "/(tabs)/recipes",
                  params: { activeTab: "public" },
                });
              }
            }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "public" && styles.activeTabText,
              ]}
            >
              Public
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search bar for public recipes */}
        {activeTab === "public" && (
          <View style={styles.searchContainer}>
            <MaterialIcons
              name="search"
              size={20}
              color={theme.colors.textSecondary}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search public recipes..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <MaterialIcons
                  name="clear"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Create button for my recipes */}
      {activeTab === "my" && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleCreateRecipe}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Recipe list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading recipes...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>Backend Not Available</Text>
          <Text style={styles.errorSubtext}>
            Recipes require a backend connection. The app will show empty states
            until the backend is running.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : currentRecipes.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={currentRecipes}
          renderItem={renderRecipeItem}
          keyExtractor={(item, index) =>
            item.id?.toString() || `recipe-${index}`
          }
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Context Menu */}
      <RecipeContextMenu
        visible={contextMenu.visible}
        recipe={contextMenu.selectedItem}
        actions={contextMenuActions}
        onClose={contextMenu.hideMenu}
        position={contextMenu.position}
      />
    </View>
  );
}

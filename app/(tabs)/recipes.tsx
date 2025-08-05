import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import ApiService from "../../src/services/API/apiService";
import { Recipe } from "../../src/types";
import { recipesStyles as styles } from "../../src/styles/tabs/recipesStyles";

export default function RecipesScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"my" | "public">("my");
  const [refreshing, setRefreshing] = useState(false);

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
      params: { recipe_id: recipe.recipe_id },
    });
  };

  const handleCreateRecipe = () => {
    // TODO: Navigate to recipe create screen when implemented
    console.log("Navigate to create recipe");
  };

  const renderRecipeItem = ({ item: recipe }: { item: Recipe }) => {
    // Add safety checks for recipe data
    if (!recipe || !recipe.name) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.recipeCard}
        onPress={() => handleRecipePress(recipe)}
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
              {recipe.estimated_abv?.toFixed(1) || "—"}%
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>IBU</Text>
            <Text style={styles.metricValue}>
              {recipe.estimated_ibu?.toFixed(0) || "—"}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>SRM</Text>
            <Text style={styles.metricValue}>
              {recipe.estimated_srm?.toFixed(0) || "—"}
            </Text>
          </View>
          {activeTab === "public" && (
            <View style={styles.metric}>
              <MaterialIcons name="person" size={16} color="#666" />
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
      <MaterialIcons name="menu-book" size={64} color="#ccc" />
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
            onPress={() => setActiveTab("my")}
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
            onPress={() => setActiveTab("public")}
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
            <MaterialIcons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search public recipes..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <MaterialIcons name="clear" size={20} color="#666" />
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
          <ActivityIndicator size="large" color="#f4511e" />
          <Text style={styles.loadingText}>Loading recipes...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={48} color="#f44336" />
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
    </View>
  );
}

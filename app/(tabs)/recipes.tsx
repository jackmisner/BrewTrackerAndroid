import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
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

export default function RecipesScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"my" | "public">("my");

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
    // TODO: Navigate to recipe detail screen when implemented
    console.log("Navigate to recipe:", recipe.id);
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
            <RefreshControl refreshing={false} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  activeTabText: {
    color: "#f4511e",
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  floatingButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f4511e",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  recipeCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeHeader: {
    marginBottom: 8,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  recipeStyle: {
    fontSize: 14,
    color: "#f4511e",
    fontWeight: "500",
  },
  recipeDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  recipeMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metric: {
    alignItems: "center",
    minWidth: 50,
  },
  metricLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  authorText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: "#f44336",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
    paddingHorizontal: 16,
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
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4511e",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

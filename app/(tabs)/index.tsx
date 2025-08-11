import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { useAuth } from "@contexts/AuthContext";
import { useTheme } from "@contexts/ThemeContext";
import ApiService from "@services/api/apiService";
import { Recipe, BrewSession } from "@src/types";
import { dashboardStyles } from "@styles/tabs/dashboardStyles";
import {
  RecipeContextMenu,
  createDefaultRecipeActions,
} from "@src/components/ui/ContextMenu/RecipeContextMenu";
import {
  BrewSessionContextMenu,
  createDefaultBrewSessionActions,
} from "@src/components/ui/ContextMenu/BrewSessionContextMenu";
import { useContextMenu } from "@src/components/ui/ContextMenu/BaseContextMenu";
import { getTouchPosition } from "@src/components/ui/ContextMenu/contextMenuUtils";

/**
 * Displays the main dashboard screen for the brewing app, showing user stats, recent recipes, and active brew sessions.
 *
 * Fetches and presents personalized brewing data, including recipe and brew session statistics, with support for pull-to-refresh and navigation to related screens. Handles loading and error states with appropriate UI feedback.
 */
export default function DashboardScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const styles = dashboardStyles(theme);
  const [refreshing, setRefreshing] = useState(false);

  // Context menu state
  const recipeContextMenu = useContextMenu<Recipe>();
  const brewSessionContextMenu = useContextMenu<BrewSession>();

  // Handle pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // Query for dashboard data by combining multiple endpoints
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      try {
        // Fetch data from multiple working endpoints - use same pattern as recipes tab
        const [recipesResponse, brewSessionsResponse, publicRecipesResponse] =
          await Promise.all([
            ApiService.recipes.getAll(1, 5), // Get first 5 recipes like original
            ApiService.brewSessions.getAll(1, 20), // Get more brew sessions to get accurate count
            ApiService.recipes.getPublic(1, 1), // Get public recipes count (just need pagination info)
          ]);

        // Transform the data to match expected dashboard format - use same pattern as recipes tab
        // The recipes tab accesses response.data.recipes, brew sessions tab accesses response.data.brew_sessions
        const recipes = recipesResponse.data?.recipes || [];
        const brewSessions = brewSessionsResponse.data?.brew_sessions || [];

        // Calculate user stats - use same status filtering as brew sessions tab

        const activeBrewSessions = brewSessions.filter(
          session => session.status !== "completed"
        );

        const userStats = {
          total_recipes:
            recipesResponse.data.pagination?.total || recipes.length,
          public_recipes: publicRecipesResponse.data.pagination?.total || 0,
          total_brew_sessions:
            brewSessionsResponse.data.pagination?.total || brewSessions.length,

          active_brew_sessions: activeBrewSessions.length,
        };

        return {
          data: {
            user_stats: userStats,
            recent_recipes: recipes.slice(0, 3), // Show 3 most recent
            active_brew_sessions: activeBrewSessions.slice(0, 3), // Show 3 most recent active sessions
          },
        };
      } catch (error) {
        console.error("Dashboard data fetch error:", error);
        throw error;
      }
    },
    retry: 1, // Only retry once to avoid excessive API calls
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const handleCreateRecipe = () => {
    router.push("/(modals)/(recipes)/createRecipe");
  };

  const handleStartBrewSession = () => {
    // TODO: Navigate to create brew session screen when implemented
    console.log("Navigate to create brew session");
  };

  const handleBrowsePublicRecipes = () => {
    router.push("/(tabs)/recipes");
  };

  const handleViewRecipes = () => {
    // Always navigate to "my recipes" tab with explicit parameter
    router.push({ pathname: "/(tabs)/recipes", params: { activeTab: "my" } });
  };

  const handleViewPublicRecipes = () => {
    // Always navigate to public recipes tab with explicit parameter
    router.push({
      pathname: "/(tabs)/recipes",
      params: { activeTab: "public" },
    });
  };

  const handleRecipePress = (recipe: Recipe) => {
    router.push({
      pathname: "/(modals)/(recipes)/viewRecipe",
      params: { recipe_id: recipe.id },
    });
  };

  const handleViewBrewSessions = () => {
    // Always navigate to "active" tab with explicit parameter
    router.push({
      pathname: "/(tabs)/brewSessions",
      params: { activeTab: "active" },
    });
  };

  const handleBrewSessionPress = (brewSession: BrewSession) => {
    router.push({
      pathname: "/(modals)/(brewSessions)/viewBrewSession",
      params: { brewSessionId: brewSession.id },
    });
  };

  // Long-press handlers
  const handleRecipeLongPress = (recipe: Recipe, event: any) => {
    const position = getTouchPosition(event);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    recipeContextMenu.showMenu(recipe, position);
  };

  const handleBrewSessionLongPress = (brewSession: BrewSession, event: any) => {
    const position = getTouchPosition(event);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    brewSessionContextMenu.showMenu(brewSession, position);
  };

  // Context menu actions
  const recipeContextMenuActions = createDefaultRecipeActions({
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
      Alert.alert(
        "Clone Recipe",
        `Cloning "${recipe.name}" - Feature coming soon!`
      );
    },
    onBeerXMLExport: (recipe: Recipe) => {
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
      Alert.alert(
        "Share Recipe",
        `Sharing "${recipe.name}" - Feature coming soon!`
      );
    },
    onDelete: (recipe: Recipe) => {
      Alert.alert(
        "Delete Recipe",
        `Deleting "${recipe.name}" - Feature coming soon!`
      );
    },
  });

  const brewSessionContextMenuActions = createDefaultBrewSessionActions({
    onView: (brewSession: BrewSession) => {
      router.push({
        pathname: "/(modals)/(brewSessions)/viewBrewSession",
        params: { brewSessionId: brewSession.id },
      });
    },
    onEdit: (brewSession: BrewSession) => {
      Alert.alert(
        "Edit Session",
        `Editing "${brewSession.name}" - Feature coming soon!`
      );
    },
    onAddFermentationEntry: (brewSession: BrewSession) => {
      Alert.alert(
        "Add Fermentation Entry",
        `Adding entry to "${brewSession.name}" - Feature coming soon!`
      );
    },
    onExportData: (brewSession: BrewSession) => {
      Alert.alert(
        "Export Data",
        `Exporting data for "${brewSession.name}" - Feature coming soon!`
      );
    },
    onArchive: (brewSession: BrewSession) => {
      Alert.alert(
        "Archive Session",
        `Archiving "${brewSession.name}" - Feature coming soon!`
      );
    },
    onDelete: (brewSession: BrewSession) => {
      Alert.alert(
        "Delete Session",
        `Deleting "${brewSession.name}" - Feature coming soon!`
      );
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: BrewSession["status"]) => {
    switch (status) {
      case "active":
      case "fermenting":
      case "in-progress": // Handle API status
        return "#4CAF50";
      case "paused":
        return "#FF9800";
      case "completed":
        return "#2196F3";
      case "failed":
        return "#f44336";
      default:
        return "#4CAF50"; // Default to active color for non-completed sessions
    }
  };

  const renderRecentRecipe = (recipe: Recipe) => {
    if (!recipe || !recipe.name) {
      return null;
    }

    return (
      <TouchableOpacity
        key={recipe.id || recipe.name}
        style={styles.recentCard}
        onPress={() => handleRecipePress(recipe)}
        onLongPress={event => handleRecipeLongPress(recipe, event)}
      >
        <View style={styles.recentHeader}>
          <MaterialIcons
            name="menu-book"
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.recentTitle} numberOfLines={1}>
            {recipe.name}
          </Text>
        </View>
        <Text style={styles.recentSubtitle}>
          {recipe.style || "Unknown Style"}
        </Text>
        <Text style={styles.recentDate}>
          Created{" "}
          {recipe.created_at ? formatDate(recipe.created_at) : "Unknown date"}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderActiveBrewSession = (brewSession: BrewSession) => {
    if (!brewSession || !brewSession.id || !brewSession.name) {
      return null;
    }

    return (
      <TouchableOpacity
        key={brewSession.id}
        style={styles.recentCard}
        onPress={() => handleBrewSessionPress(brewSession)}
        onLongPress={event => handleBrewSessionLongPress(brewSession, event)}
      >
        <View style={styles.recentHeader}>
          <MaterialIcons
            name="science"
            size={20}
            color={getStatusColor(brewSession.status)}
          />
          <Text style={styles.recentTitle} numberOfLines={1}>
            {brewSession.name}
          </Text>
        </View>
        <Text style={styles.recentSubtitle}>Status: {brewSession.status}</Text>

        <Text style={styles.recentDate}>
          Day{" "}
          {brewSession.brew_date
            ? Math.floor(
                (new Date().getTime() -
                  new Date(brewSession.brew_date).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0}{" "}
          • {brewSession.current_stage || "Unknown Stage"}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error) {
    // Show fallback dashboard when backend is not available
    const fallbackStats = {
      total_recipes: 0,
      public_recipes: 0,
      total_brew_sessions: 0,
      active_brew_sessions: 0,
    };

    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back, {user?.username}!</Text>
          <Text style={styles.subtitle}>Ready to brew something amazing?</Text>
        </View>

        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statCard} onPress={handleViewRecipes}>
            <MaterialIcons
              name="menu-book"
              size={32}
              color={theme.colors.primary}
            />
            <Text style={styles.statNumber}>{fallbackStats.total_recipes}</Text>
            <Text style={styles.statLabel}>Recipes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={handleViewBrewSessions}
          >
            <MaterialIcons
              name="science"
              size={32}
              color={theme.colors.primary}
            />
            <Text style={styles.statNumber}>
              {fallbackStats.active_brew_sessions}
            </Text>
            <Text style={styles.statLabel}>Active Brews</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={handleViewPublicRecipes}
          >
            <MaterialIcons
              name="public"
              size={32}
              color={theme.colors.primary}
            />
            <Text style={styles.statNumber}>
              {fallbackStats.public_recipes}
            </Text>
            <Text style={styles.statLabel}>Public</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleCreateRecipe}
          >
            <MaterialIcons name="add" size={24} color={theme.colors.primary} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Create New Recipe</Text>
              <Text style={styles.actionSubtitle}>
                Start building your next brew
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleStartBrewSession}
          >
            <MaterialIcons
              name="play-arrow"
              size={24}
              color={theme.colors.primary}
            />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Start Brew Session</Text>
              <Text style={styles.actionSubtitle}>
                Begin tracking a new brew
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleViewPublicRecipes}
          >
            <MaterialIcons
              name="public"
              size={24}
              color={theme.colors.primary}
            />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Browse Public Recipes</Text>
              <Text style={styles.actionSubtitle}>
                Discover community favorites
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backend Status</Text>
          <View style={styles.emptyState}>
            <MaterialIcons name="cloud-off" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Backend Not Connected</Text>
            <Text style={styles.emptySubtext}>
              Start the Flask backend to see real brewing data
            </Text>
          </View>
        </View>

        <View style={styles.versionFooter}>
          <Text style={styles.versionText}>
            BrewTracker Mobile v{Constants.expoConfig?.version || "0.1.0"}
          </Text>
        </View>
      </ScrollView>
    );
  }

  const stats = dashboardData?.data.user_stats;
  const recentRecipes = dashboardData?.data.recent_recipes || [];
  const activeBrewSessions = dashboardData?.data.active_brew_sessions || [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back, {user?.username}!</Text>
        <Text style={styles.subtitle}>Ready to brew something amazing?</Text>
      </View>

      <View style={styles.statsContainer}>
        <TouchableOpacity style={styles.statCard} onPress={handleViewRecipes}>
          <MaterialIcons
            name="menu-book"
            size={32}
            color={theme.colors.primary}
          />
          <Text style={styles.statNumber}>{stats?.total_recipes || 0}</Text>
          <Text style={styles.statLabel}>Recipes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={handleViewBrewSessions}
        >
          <MaterialIcons
            name="science"
            size={32}
            color={theme.colors.primary}
          />
          <Text style={styles.statNumber}>
            {stats?.active_brew_sessions || 0}
          </Text>
          <Text style={styles.statLabel}>Active Brews</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={handleViewPublicRecipes}
        >
          <MaterialIcons name="public" size={32} color={theme.colors.primary} />
          <Text style={styles.statNumber}>{stats?.public_recipes || 0}</Text>
          <Text style={styles.statLabel}>Public</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleCreateRecipe}
        >
          <MaterialIcons name="add" size={24} color={theme.colors.primary} />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Create New Recipe</Text>
            <Text style={styles.actionSubtitle}>
              Start building your next brew
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleStartBrewSession}
        >
          <MaterialIcons
            name="play-arrow"
            size={24}
            color={theme.colors.primary}
          />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Start Brew Session</Text>
            <Text style={styles.actionSubtitle}>Begin tracking a new brew</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleBrowsePublicRecipes}
        >
          <MaterialIcons name="public" size={24} color={theme.colors.primary} />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Browse Public Recipes</Text>
            <Text style={styles.actionSubtitle}>
              Discover community favorites
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Recent Recipes */}

      {recentRecipes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Recipes</Text>
          <View style={styles.verticalList}>
            {recentRecipes
              .filter(recipe => recipe && recipe.name)
              .map(renderRecentRecipe)}
          </View>
        </View>
      )}

      {/* Recent Brew Sessions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Brew Sessions</Text>
        {activeBrewSessions.length > 0 ? (
          <View style={styles.verticalList}>
            {activeBrewSessions
              .filter(session => session && session.id)
              .map(renderActiveBrewSession)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="science" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No brew sessions yet</Text>
            <Text style={styles.emptySubtext}>
              Start your first brew session to track progress!
            </Text>
          </View>
        )}
      </View>

      <View style={styles.versionFooter}>
        <Text style={styles.versionText}>
          BrewTracker Mobile v{Constants.expoConfig?.version || "0.1.0"}
        </Text>
      </View>

      {/* Context Menus */}
      <RecipeContextMenu
        visible={recipeContextMenu.visible}
        recipe={recipeContextMenu.selectedItem}
        actions={recipeContextMenuActions}
        onClose={recipeContextMenu.hideMenu}
        position={recipeContextMenu.position}
      />

      <BrewSessionContextMenu
        visible={brewSessionContextMenu.visible}
        brewSession={brewSessionContextMenu.selectedItem}
        actions={brewSessionContextMenuActions}
        onClose={brewSessionContextMenu.hideMenu}
        position={brewSessionContextMenu.position}
      />
    </ScrollView>
  );
}

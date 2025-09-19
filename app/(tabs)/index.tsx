/**
 * @fileoverview Main dashboard screen - primary home tab of the BrewTracker application
 *
 * @description
 * The dashboard serves as the central hub for users to view their brewing statistics,
 * recent activity, and quick actions. It provides an overview of user's recipes, brew sessions,
 * and community engagement with intelligent fallback handling for offline scenarios.
 *
 * @key_features
 * - User statistics overview (total recipes, active brews, public recipes)
 * - Recent recipes and active brew sessions display
 * - Quick action shortcuts for common tasks (create recipe, start brewing)
 * - Pull-to-refresh functionality for data synchronization
 * - Context menus with haptic feedback for item interactions
 * - Offline-first design with graceful backend disconnection handling
 *
 * @navigation_patterns
 * - Direct navigation to recipe and brew session creation modals
 * - Tab-based navigation to specific sections (My Recipes, Public, Active Brews)
 * - Context menu navigation for detailed item actions (view, edit, clone, etc.)
 * - Deep linking support for individual recipes and brew sessions
 *
 * @security_considerations
 * - User authentication required (handled by parent tab navigator)
 * - Personal data isolation (user recipes vs public recipes)
 * - Secure API calls with JWT authentication headers
 * - Context menu actions respect user permissions
 *
 * @data_handling
 * - React Query for server state management with 5-minute cache
 * - Combined API calls for efficient data fetching
 * - Real-time statistics calculation from server responses
 * - Optimistic UI updates for better user experience
 * - Error boundaries with meaningful fallback displays
 *
 * @accessibility
 * - Ensure readable color contrast, support dynamic font scaling, and adequate touch targets
 *
 * @testing_notes
 * - Covered by integration tests for data loading states (loading, error, success) and menu actions
 */
import React, { useState, useRef } from "react";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { useAuth } from "@contexts/AuthContext";
import { useTheme } from "@contexts/ThemeContext";
import OfflineRecipeService from "@services/offline/OfflineRecipeService";
import OfflineCacheService from "@services/offline/OfflineCacheService";
import { NetworkStatusBanner } from "@src/components/NetworkStatusBanner";
import ApiService from "@services/api/apiService";
import BeerXMLService from "@services/beerxml/BeerXMLService";
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
import { QUERY_KEYS } from "@services/api/queryClient";
export default function DashboardScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const styles = dashboardStyles(theme);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination defaults
  const PAGE = 1;
  const RECENT_RECIPES_LIMIT = 5;
  const BREW_SESSIONS_LIMIT = 20;
  const PUBLIC_PAGE_SIZE = 1;

  // Context menu state
  const recipeContextMenu = useContextMenu<Recipe>();
  const brewSessionContextMenu = useContextMenu<BrewSession>();

  // Cleanup cooldown tracking
  const CLEANUP_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
  const lastCleanupTimeRef = useRef(0);

  // Handle pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Clean up stale cache data when online and refreshing
      try {
        const now = Date.now();
        if (now - lastCleanupTimeRef.current < CLEANUP_COOLDOWN_MS) {
          console.log("Skipping cleanup due to cooldown");
        } else {
          const cleanup = await OfflineRecipeService.cleanupStaleData();
          if (cleanup.removed > 0) {
            console.log(
              `Dashboard refresh cleaned up ${cleanup.removed} stale recipes`
            );
          }
          lastCleanupTimeRef.current = now;
        }
      } catch (error) {
        console.warn(
          "Failed to cleanup stale data during dashboard refresh:",
          error
        );
        // Don't let cleanup errors block the refresh
      }

      // Refresh dashboard data
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
    queryKey: [...QUERY_KEYS.DASHBOARD, user?.id ?? "anonymous"],
    queryFn: async () => {
      try {
        // Try to fetch fresh data first
        const [recipesResponse, brewSessionsResponse, publicRecipesResponse] =
          await Promise.all([
            ApiService.recipes.getAll(PAGE, RECENT_RECIPES_LIMIT),
            ApiService.brewSessions.getAll(PAGE, BREW_SESSIONS_LIMIT),
            ApiService.recipes.getPublic(PAGE, PUBLIC_PAGE_SIZE),
          ]);

        const recipes = recipesResponse.data?.recipes || [];
        const brewSessions = brewSessionsResponse.data?.brew_sessions || [];
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

        const freshDashboardData = {
          user_stats: userStats,
          recent_recipes: recipes.slice(0, 3),
          active_brew_sessions: activeBrewSessions.slice(0, 3),
        };

        // Cache the fresh data for offline use
        if (!user?.id) {
          console.warn("Cannot cache dashboard data without user ID");
        } else {
          OfflineCacheService.cacheDashboardData(
            freshDashboardData,
            user.id
          ).catch(error => {
            console.warn("Failed to cache dashboard data:", error);
          });
        }

        return {
          data: freshDashboardData,
        };
      } catch (error) {
        // Only log non-simulated errors
        if (
          !(
            error instanceof Error &&
            error.message?.includes("Simulated offline")
          )
        ) {
          console.error("Dashboard data fetch error:", error);
        }

        // Try to get cached data when API fails
        try {
          if (!user?.id) {
            console.warn("Cannot load cached dashboard data without user ID");
            throw error; // Rethrow original error
          }
          const cachedData = await OfflineCacheService.getCachedDashboardData(
            user?.id
          );
          if (cachedData) {
            console.log("Using cached dashboard data due to API error");
            return {
              data: cachedData,
            };
          }
        } catch (cacheError) {
          console.warn("Failed to load cached dashboard data:", cacheError);
        }

        throw error;
      }
    },
    enabled: !!user, // Only run query when user is authenticated
    retry: 1, // Only retry once to avoid excessive API calls
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const handleCreateRecipe = () => {
    router.push({ pathname: "/(modals)/(recipes)/createRecipe", params: {} });
  };

  const handleStartBrewSession = () => {
    // TODO: Navigate to create brew session screen when implemented
    console.log("Navigate to create brew session");
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

  // Delete mutation
  const queryClient = useQueryClient();
  const deleteMutation = useMutation<void, unknown, string>({
    mutationKey: ["recipes", "delete"],
    mutationFn: async (recipeId: string) => {
      await ApiService.recipes.delete(recipeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.RECIPES] });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.DASHBOARD] });
    },
    onError: (error: unknown) => {
      console.error("Failed to delete recipe:", error);
      Alert.alert(
        "Delete Failed",
        "Failed to delete recipe. Please try again.",
        [{ text: "OK" }]
      );
    },
  });

  // Clone mutation
  const cloneMutation = useMutation({
    mutationKey: ["recipes", "clone"],
    mutationFn: async (recipe: Recipe) => {
      if (recipe.is_public) {
        // Public recipe cloning
        const author = recipe.username || recipe.original_author || "Unknown";
        return ApiService.recipes.clonePublic(recipe.id, author);
      } else {
        // Private recipe versioning
        return ApiService.recipes.clone(recipe.id);
      }
    },
    onSuccess: (response, recipe) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.RECIPES] });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.DASHBOARD] });
      const cloneType = recipe.is_public ? "cloned" : "versioned";
      Alert.alert(
        "Recipe Cloned",
        `Successfully ${cloneType} "${recipe.name}"`,
        [
          {
            text: "View Clone",
            onPress: () => {
              router.push({
                pathname: "/(modals)/(recipes)/viewRecipe",
                params: { recipe_id: response.data.id },
              });
            },
          },
          { text: "OK" },
        ]
      );
    },
    onError: (error: unknown, recipe) => {
      console.error("Failed to clone recipe:", error);
      Alert.alert(
        "Clone Failed",
        `Failed to clone "${recipe.name}". Please try again.`,
        [{ text: "OK" }]
      );
    },
  });

  // BeerXML export mutation
  const beerXMLExportMutation = useMutation({
    mutationFn: async (recipe: Recipe) => {
      return BeerXMLService.exportRecipe(recipe.id);
    },
    onSuccess: (result, recipe) => {
      if (result.success) {
        const method =
          result.saveMethod === "directory"
            ? "saved to your selected directory"
            : "exported and ready to share";
        Alert.alert(
          "Export Successful",
          `"${recipe.name}" has been ${method} as BeerXML!`,
          [{ text: "OK" }]
        );
      } else if (result.userCancelled) {
        // User cancelled the export - don't show error
        return;
      } else {
        Alert.alert(
          "Export Failed",
          result.error || "Failed to export BeerXML. Please try again.",
          [{ text: "OK" }]
        );
      }
    },
    onError: (error: unknown, recipe) => {
      console.error("❌ BeerXML Export Error:", error);
      Alert.alert(
        "Export Failed",
        `Failed to export "${recipe.name}". Please try again.`,
        [{ text: "OK" }]
      );
    },
  });

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
      recipeContextMenu.hideMenu();
      cloneMutation.mutate(recipe);
    },
    onBeerXMLExport: (recipe: Recipe) => {
      recipeContextMenu.hideMenu();
      beerXMLExportMutation.mutate(recipe);
    },
    onStartBrewing: (recipe: Recipe) => {
      router.push({
        pathname: "/(modals)/(brewSessions)/createBrewSession",
        params: { recipeId: String(recipe.id) },
      });
    },
    onStartBoilTimer: (recipe: Recipe) => {
      recipeContextMenu.hideMenu();
      router.push({
        pathname: "/(modals)/(calculators)/boilTimer",
        params: { recipeId: String(recipe.id) },
      });
    },
    onDelete: (recipe: Recipe) => {
      // Close the context menu before prompting
      recipeContextMenu.hideMenu();
      Alert.alert(
        "Delete Recipe",
        `Are you sure you want to delete "${recipe.name}"? This action cannot be undone.`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              if (deleteMutation.isPending) {
                return;
              }
              const id = String(recipe.id);
              deleteMutation.mutate(id, {
                onSuccess: () => {
                  Alert.alert("Success", "Recipe deleted successfully");
                },
              });
            },
          },
        ]
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
          {recipe.version ? (
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v{recipe.version}</Text>
            </View>
          ) : null}
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
          <Text style={styles.versionFooterText}>
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
      <NetworkStatusBanner onRetry={onRefresh} />
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
          onPress={handleViewPublicRecipes}
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

      {recentRecipes.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Recipes</Text>
          <View style={styles.verticalList}>
            {recentRecipes
              .filter(recipe => recipe && recipe.name)
              .map(renderRecentRecipe)}
          </View>
        </View>
      ) : null}

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
        <Text style={styles.versionFooterText}>
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

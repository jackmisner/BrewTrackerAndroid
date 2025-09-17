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
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import ApiService from "@services/api/apiService";
import {
  useOfflineRecipes,
  useOfflineDeleteRecipe,
  useOfflineSyncStatus,
  useOfflineSync,
  useOfflineModifiedSync,
  useAutoOfflineModifiedSync,
} from "@src/hooks/useOfflineRecipes";
import { OfflineRecipeService } from "@services/offline/OfflineRecipeService";

import { QUERY_KEYS } from "@services/api/queryClient";
import { useNetwork } from "@contexts/NetworkContext";
import { useDeveloper } from "@contexts/DeveloperContext";
import { Recipe } from "@src/types";
import { useTheme } from "@contexts/ThemeContext";
import BeerXMLService from "@services/beerxml/BeerXMLService";
import { recipesStyles } from "@styles/tabs/recipesStyles";
import { formatABV, formatIBU, formatSRM } from "@utils/formatUtils";
import {
  RecipeContextMenu,
  createDefaultRecipeActions,
} from "@src/components/ui/ContextMenu/RecipeContextMenu";
import { useContextMenu } from "@src/components/ui/ContextMenu/BaseContextMenu";
import { getTouchPosition } from "@src/components/ui/ContextMenu/contextMenuUtils";
import { useUserValidation } from "@utils/userValidation";

/**
 * Pure helper function to generate sync status message
 * @param syncStatus - The sync status object containing pending sync counts
 * @param syncMutation - The mutation result for legacy sync operations
 * @param modifiedSyncMutation - The mutation result for flag-based sync operations
 * @returns The appropriate sync status message string
 */
function getSyncStatusMessage(
  syncStatus:
    | {
        pendingSync?: number;
        needsSync?: number;
        pendingDeletions?: number;
      }
    | undefined,
  syncMutation: UseMutationResult<any, Error, void, unknown>,
  modifiedSyncMutation: UseMutationResult<any, Error, void, unknown>
): string {
  if (syncMutation.isPending || modifiedSyncMutation.isPending) {
    return "Syncing...";
  }

  if (syncMutation.isError || modifiedSyncMutation.isError) {
    return "Sync failed - tap to retry";
  }

  // Use needsSync as the authoritative count to avoid double-counting
  // (pendingSync recipes also have needsSync: true, so they'd be counted twice)
  const totalChanges = syncStatus?.needsSync || 0;
  const deletions = syncStatus?.pendingDeletions || 0;
  const modifications = totalChanges - deletions;

  if (totalChanges === 0) {
    return "All synced";
  }

  let message = "";
  if (modifications > 0) {
    message += `${modifications} recipe${modifications !== 1 ? "s" : ""}`;
  }
  if (deletions > 0) {
    if (message) {
      message += ", ";
    }
    message += `${deletions} deletion${deletions !== 1 ? "s" : ""}`;
  }
  return `${message} need sync`;
}

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

  // User validation for security checks
  const userValidation = useUserValidation();

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
      // Clean up stale cache data when online and refreshing
      try {
        const cleanup = await OfflineRecipeService.cleanupStaleData();
        if (cleanup.removed > 0) {
          console.log(
            `Pull-to-refresh cleaned up ${cleanup.removed} stale recipes`
          );
        }
      } catch (error) {
        console.warn("Failed to cleanup stale data during refresh:", error);
        // Don't let cleanup errors block the refresh
      }

      // Trigger sync if online and there are pending changes
      if (isConnected && (syncStatus?.needsSync || 0) > 0) {
        try {
          console.log("🔄 Pull-to-refresh triggering sync...");
          await modifiedSyncMutation.mutateAsync();
          console.log("✅ Pull-to-refresh sync completed");
        } catch (error) {
          console.warn("Pull-to-refresh sync failed:", error);
          // Don't let sync errors block the refresh
        }
      }

      // Refresh the appropriate tab data
      if (activeTab === "my") {
        await refetchMyRecipes();
      } else {
        await refetchPublicRecipes();
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Query for user's recipes with offline support
  const {
    data: offlineRecipes,
    isLoading: isLoadingMyRecipes,
    error: myRecipesError,
    refetch: refetchMyRecipes,
  } = useOfflineRecipes();

  // Transform offline recipes to match expected format
  const myRecipesData = {
    recipes: offlineRecipes || [],
    total: (offlineRecipes || []).length,
  };

  // Query for public recipes with basic offline handling
  const {
    data: publicRecipesData,
    isLoading: isLoadingPublicRecipes,
    error: publicRecipesError,
    refetch: refetchPublicRecipes,
  } = useQuery({
    queryKey: [...QUERY_KEYS.PUBLIC_RECIPES, searchQuery],
    queryFn: async () => {
      try {
        const response = await ApiService.recipes.getPublic(1, 20, {
          search: searchQuery || undefined,
        });
        return response.data;
      } catch (error) {
        // For public recipes, we don't have extensive offline caching
        // but we can provide a more meaningful error
        console.error("Failed to fetch public recipes:", error);
        throw new Error(
          "Unable to load public recipes. Please check your internet connection and try again."
        );
      }
    },
    retry: 1,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes (longer for public data)
    enabled: activeTab === "public", // Only fetch when viewing public tab
  });

  // Delete mutation with offline support
  const queryClient = useQueryClient();
  const deleteMutation = useOfflineDeleteRecipe();

  // Get sync status for UI and enable auto-sync
  const { data: syncStatus } = useOfflineSyncStatus();
  const syncMutation = useOfflineSync();
  const modifiedSyncMutation = useOfflineModifiedSync();

  // Enable automatic syncing when network comes back online (new approach only)
  // useAutoOfflineSync(); // DISABLED: Legacy approach conflicts with tombstone system
  useAutoOfflineModifiedSync(); // New approach for modified flags
  const { isConnected } = useNetwork();
  const { isDeveloperMode, cleanupTombstones } = useDeveloper();

  // Clone mutation with enhanced validation
  const cloneMutation = useMutation({
    mutationKey: ["recipes", "clone"],
    mutationFn: async (recipe: Recipe) => {
      // Validate recipe data before cloning
      if (!recipe.user_id) {
        throw new Error("Recipe must have a valid user ID");
      }

      if (recipe.is_public) {
        // Public recipe cloning
        const author = recipe.username || recipe.original_author || "Unknown";
        return ApiService.recipes.clonePublic(recipe.id, author);
      } else {
        // Private recipe versioning - verify ownership
        if (!recipe.user_id) {
          throw new Error("Private recipe must have a user ID");
        }
        const canModify = await userValidation.canUserModifyResource({
          user_id: recipe.user_id,
          is_owner: recipe.is_owner,
        });
        if (!canModify) {
          throw new Error("Insufficient permissions to version this recipe");
        }
        return ApiService.recipes.clone(recipe.id);
      }
    },
    onSuccess: (response, recipe) => {
      // Add a small delay to ensure server has processed the clone before refreshing
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["recipes"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }, 1000); // 1 second delay
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
      console.error("❌ Clone Error - Full error object:", error);
      console.error("❌ Clone Error - Recipe being cloned:", {
        id: recipe.id,
        name: recipe.name,
        is_public: recipe.is_public,
        is_owner: recipe.is_owner,
      });

      // Try to extract more error details (dev-only, redact in prod)
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as any;
        if (__DEV__) {
          console.error(
            "❌ Clone Error - Response status:",
            axiosError.response?.status
          );
          console.error(
            "❌ Clone Error - Response data (sanitized):",
            axiosError.response?.data
          );
          // Avoid logging full headers; explicitly whitelist safe fields if needed
          const { "content-type": contentType, date } =
            axiosError.response?.headers ?? {};
          console.error("❌ Clone Error - Response headers (partial):", {
            contentType,
            date,
          });
        } else {
          console.error("❌ Clone Error", {
            status: axiosError.response?.status,
            message: axiosError.message,
          });
        }
      }

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
    router.push({ pathname: "/(modals)/(recipes)/createRecipe", params: {} });
  };

  const handleImportBeerXML = () => {
    router.push("/(modals)/(beerxml)/importBeerXML" as any);
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
      contextMenu.hideMenu();
      cloneMutation.mutate(recipe);
    },
    onBeerXMLExport: (recipe: Recipe) => {
      contextMenu.hideMenu();
      beerXMLExportMutation.mutate(recipe);
    },
    onStartBrewing: (recipe: Recipe) => {
      router.push({
        pathname: "/(modals)/(brewSessions)/createBrewSession",
        params: { recipeId: String(recipe.id) },
      });
    },
    onStartBoilTimer: (recipe: Recipe) => {
      contextMenu.hideMenu();
      router.push({
        pathname: "/(modals)/(calculators)/boilTimer",
        params: { recipeId: String(recipe.id) },
      });
    },
    onDelete: (recipe: Recipe) => {
      // Ensure the context menu closes before prompting
      contextMenu.hideMenu();
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
              deleteMutation.mutate(recipe.id);
            },
          },
        ]
      );
    },
  });

  type OfflineRecipe = Recipe & {
    tempId?: string;
    isOffline?: boolean;
    syncStatus?: "pending" | "conflict" | "failed" | "synced";
    version?: number;
  };
  const renderRecipeItem = ({ item: recipe }: { item: OfflineRecipe }) => {
    // Add safety checks for recipe data
    if (!recipe || !recipe.name) {
      return null;
    }

    // Check if this is an offline recipe
    const isOfflineRecipe = recipe.isOffline || recipe.tempId;
    const recipeSyncStatus = recipe.syncStatus || "synced";

    return (
      <TouchableOpacity
        style={[
          styles.recipeCard,
          isOfflineRecipe && {
            borderLeftWidth: 3,
            borderLeftColor: theme.colors.primary,
          },
        ]}
        onPress={() => handleRecipePress(recipe)}
        onLongPress={event => handleRecipeLongPress(recipe, event)}
      >
        <View style={styles.recipeHeader}>
          <View style={styles.recipeHeaderTop}>
            <Text style={styles.recipeName} numberOfLines={1}>
              {recipe.name || "Unnamed Recipe"}
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              {/* Offline/Sync Status Indicator */}
              {!isConnected && (
                <MaterialIcons
                  name="wifi-off"
                  size={16}
                  color={theme.colors.textSecondary}
                />
              )}
              {recipeSyncStatus === "pending" && (
                <MaterialIcons
                  name="sync"
                  size={16}
                  color={theme.colors.warning || "#ff9800"}
                />
              )}
              {recipeSyncStatus === "conflict" && (
                <MaterialIcons
                  name="warning"
                  size={16}
                  color={theme.colors.error || "#f44336"}
                />
              )}
              {recipeSyncStatus === "failed" && (
                <MaterialIcons
                  name="error"
                  size={16}
                  color={theme.colors.error || "#f44336"}
                />
              )}
              {recipe.version ? (
                <View style={styles.versionBadge}>
                  <Text style={styles.versionText}>v{recipe.version}</Text>
                </View>
              ) : null}
            </View>
          </View>
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
          {activeTab === "public" ? (
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
          ) : null}
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

      {activeTab === "my" ? (
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateRecipe}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
          <Text style={styles.createButtonText}>Create Recipe</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header with tabs and sync status */}
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

        {/* Sync status and button for My Recipes */}
        {activeTab === "my" && (syncStatus?.needsSync || 0) > 0 && (
          <View style={styles.syncStatusContainer}>
            <View style={styles.syncInfo}>
              <MaterialIcons
                name={syncMutation.isPending ? "sync" : "cloud-upload"}
                size={16}
                color={theme.colors.primary}
                style={
                  syncMutation.isPending
                    ? { transform: [{ rotate: "45deg" }] }
                    : {}
                }
              />
              <Text style={styles.syncText}>
                {getSyncStatusMessage(
                  syncStatus,
                  syncMutation,
                  modifiedSyncMutation
                )}
              </Text>
            </View>
            {isConnected &&
              !syncMutation.isPending &&
              !modifiedSyncMutation.isPending && (
                <TouchableOpacity
                  onPress={() => {
                    // Use new flag-based sync approach only (legacy disabled to prevent duplicates)
                    modifiedSyncMutation.mutate(undefined, {
                      onSuccess: () => {
                        // Legacy sync disabled: conflicts with tombstone system
                        // if ((syncStatus?.pendingSync || 0) > 0) {
                        //   syncMutation.mutate();
                        // }
                      },
                      onError: _error => {
                        Alert.alert(
                          "Sync Failed",
                          "Unable to sync modified recipes. Please try again.",
                          [{ text: "OK" }]
                        );
                      },
                    });
                  }}
                  style={styles.syncButton}
                >
                  <Text style={styles.syncButtonText}>Sync Now</Text>
                </TouchableOpacity>
              )}

            {/* DEV ONLY: Tombstone cleanup button */}
            {isDeveloperMode && (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const result = await cleanupTombstones();
                    Alert.alert(
                      "Tombstones Cleaned",
                      `Removed ${result.removedTombstones} tombstones.${
                        result.tombstoneNames.length > 0
                          ? `\n\nCleaned: ${result.tombstoneNames.join(", ")}`
                          : ""
                      }`,
                      [{ text: "OK" }]
                    );
                    // Refresh the recipes list to reflect changes
                    queryClient.invalidateQueries({
                      queryKey: [...QUERY_KEYS.RECIPES, "offline"],
                    });
                  } catch (error) {
                    Alert.alert(
                      "Cleanup Failed",
                      "Unable to cleanup tombstones. Please try again.",
                      [{ text: "OK" }]
                    );
                    console.error("Tombstone cleanup error:", error);
                  }
                }}
                style={[
                  styles.syncButton,
                  {
                    backgroundColor: theme.colors.warning || "#ff9800",
                    marginLeft: 8,
                  },
                ]}
              >
                <MaterialIcons
                  name="cleaning-services"
                  size={16}
                  color="#fff"
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.syncButtonText, { fontSize: 12 }]}>
                  Dev: Clean
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Search bar for public recipes */}
        {activeTab === "public" ? (
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
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <MaterialIcons
                  name="clear"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Create and Import buttons for my recipes */}
      {activeTab === "my" ? (
        <View style={styles.floatingButtonGroup}>
          <TouchableOpacity
            style={styles.floatingButtonSecondary}
            onPress={handleImportBeerXML}
          >
            <MaterialIcons
              name="file-upload"
              size={20}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={handleCreateRecipe}
          >
            <MaterialIcons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : null}

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

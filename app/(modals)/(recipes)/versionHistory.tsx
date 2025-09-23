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
import { QUERY_KEYS } from "@services/api/queryClient";
import { Recipe } from "@src/types";
import {
  RecipeVersionHistoryResponse,
  isEnhancedVersionHistoryResponse,
  isLegacyVersionHistoryResponse,
} from "@src/types/api";
import { useTheme } from "@contexts/ThemeContext";
import { viewRecipeStyles } from "@styles/modals/viewRecipeStyles";
import { TEST_IDS } from "@src/constants/testIDs";
import { ModalHeader } from "@src/components/ui/ModalHeader";

/**
 * Version History Screen
 *
 * Displays the version history and lineage for a recipe, allowing users to
 * navigate between different versions and understand the evolution of the recipe.
 */
export default function VersionHistoryScreen() {
  const theme = useTheme();
  const styles = viewRecipeStyles(theme);
  const [refreshing, setRefreshing] = useState(false);

  const { recipe_id } = useLocalSearchParams<{ recipe_id: string }>();

  // Query for version history
  const {
    data: versionHistoryData,
    isLoading: isLoadingVersions,
    error: versionsError,
    refetch: refetchVersions,
  } = useQuery<RecipeVersionHistoryResponse>({
    queryKey: QUERY_KEYS.RECIPE_VERSIONS(recipe_id!),
    queryFn: async () => {
      if (!recipe_id) {
        throw new Error("No recipe ID provided");
      }

      try {
        const response = await ApiService.recipes.getVersionHistory(recipe_id);

        return response.data;
      } catch (error) {
        console.error("🔍 Version History - API error:", error);
        throw error;
      }
    },
    enabled: !!recipe_id,
    retry: 1,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Query for current recipe details
  const {
    data: currentRecipe,
    isLoading: isLoadingCurrent,
    refetch: refetchCurrent,
  } = useQuery<Recipe>({
    queryKey: QUERY_KEYS.RECIPE(recipe_id!),
    queryFn: async () => {
      if (!recipe_id) {
        throw new Error("No recipe ID provided");
      }
      const response = await ApiService.recipes.getById(recipe_id);
      return response.data;
    },
    enabled: !!recipe_id,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });

  const isLoading = isLoadingVersions || isLoadingCurrent;
  const error = versionsError;

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchVersions(), refetchCurrent()]);
    } catch (error) {
      console.error("Error refreshing version history:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Build version list using property-based type guards
  const buildVersionList = () => {
    if (!versionHistoryData) {
      return [];
    }

    // Use type guards to handle different response shapes
    if (isEnhancedVersionHistoryResponse(versionHistoryData)) {
      const versions = versionHistoryData.all_versions.map(version => ({
        id: version.recipe_id,
        name: version.name,
        version: version.version,
        isCurrent: version.is_current,
        unit_system: version.unit_system,
        isRoot: version.is_root,
        isAvailable: version.is_available,
      }));
      return versions.sort((a: any, b: any) => a.version - b.version);
    } else if (isLegacyVersionHistoryResponse(versionHistoryData)) {
      const versions: any[] = [];

      // Add current recipe
      versions.push({
        id: recipe_id!,
        name: currentRecipe?.name || "Current Version",
        version: versionHistoryData.current_version,
        isCurrent: true,
        unit_system: currentRecipe?.unit_system || "imperial",
        isRoot: !versionHistoryData.parent_recipe,
        isAvailable: true,
      });

      // Add parent recipe if exists
      if (versionHistoryData.parent_recipe) {
        versions.push({
          id: versionHistoryData.parent_recipe.recipe_id,
          name: versionHistoryData.parent_recipe.name,
          version: versionHistoryData.parent_recipe.version,
          isCurrent: false,
          unit_system: versionHistoryData.parent_recipe.unit_system,
          isRoot: versionHistoryData.parent_recipe.version === 1,
          isAvailable: true,
        });
      }

      // Add child versions if they exist
      if (versionHistoryData.child_versions) {
        versionHistoryData.child_versions.forEach(child => {
          versions.push({
            id: child.recipe_id,
            name: child.name,
            version: child.version,
            isCurrent: false,
            unit_system: child.unit_system,
            isRoot: false,
            isAvailable: true,
          });
        });
      }

      return versions.sort((a: any, b: any) => a.version - b.version);
    }

    // Fallback for unknown response structure
    console.warn("🔍 Unknown response structure, returning empty list");
    return [];
  };

  // Navigation handlers
  const handleGoBack = () => {
    router.back();
  };

  const handleViewVersion = (versionItem: { id: string }) => {
    router.push({
      pathname: "/(modals)/(recipes)/viewRecipe",
      params: { recipe_id: versionItem.id },
    });
  };

  // Render version item
  const renderVersionItem = (
    versionItem: {
      id: string;
      name: string;
      version: number;
      isCurrent: boolean;
      unit_system?: string;
      isRoot?: boolean;
      isAvailable?: boolean;
    },
    _index: number
  ) => {
    const isClickable = !versionItem.isCurrent && versionItem.isAvailable;

    return (
      <TouchableOpacity
        key={versionItem.id}
        style={[
          styles.recipeCard,
          versionItem.isCurrent && {
            borderColor: theme.colors.primary,
            borderWidth: 2,
          },
        ]}
        onPress={() => isClickable && handleViewVersion(versionItem)}
        disabled={!isClickable}
        testID={TEST_IDS.patterns.touchableOpacityAction(
          `version-item-${encodeURIComponent(versionItem.id)}`
        )}
      >
        <View style={styles.versionHeader}>
          <View style={styles.versionInfo}>
            <Text style={styles.versionNumber}>
              Version {versionItem.version}
            </Text>
            {versionItem.isCurrent ? (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Current</Text>
              </View>
            ) : null}
            {versionItem.isRoot ? (
              <View
                style={[styles.currentBadge, { backgroundColor: "#4CAF50" }]}
              >
                <Text style={styles.currentBadgeText}>Root</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.versionDate}>
            {versionItem.unit_system || "imperial"}
          </Text>
        </View>

        <Text style={styles.versionName} numberOfLines={1}>
          {versionItem.name}
        </Text>

        <Text style={styles.versionDescription} numberOfLines={2}>
          {versionItem.isCurrent
            ? "This is the current version you're viewing"
            : "Tap to view this version"}
        </Text>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ModalHeader title="Version History" testID="version-history-header" />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f4511e" />
          <Text style={styles.loadingText}>Loading version history...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <ModalHeader title="Version History" testID="version-history-header" />

        <View style={styles.errorContainer}>
          <MaterialIcons name="timeline" size={64} color="#ccc" />
          <Text style={styles.errorTitle}>Version History Not Available</Text>
          <Text style={styles.errorText}>
            Version history is not yet available for this recipe. This feature
            may not be implemented on the backend yet.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleGoBack}
            testID={TEST_IDS.patterns.touchableOpacityAction(
              "version-history-go-back"
            )}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Get version list
  const versionList = buildVersionList();

  // Empty state
  if (!versionHistoryData || versionList.length === 0) {
    return (
      <View style={styles.container}>
        <ModalHeader title="Version History" testID="version-history-header" />

        <View style={styles.errorContainer}>
          <MaterialIcons name="timeline" size={64} color="#ccc" />
          <Text style={styles.errorTitle}>No Version History</Text>
          <Text style={styles.errorText}>
            This recipe doesn&apos;t have any version history available.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleGoBack}
            testID={TEST_IDS.patterns.touchableOpacityAction(
              "version-history-go-back"
            )}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Success state
  return (
    <View style={styles.container}>
      <ModalHeader
        title="Version History"
        testID="version-history-header"
        onBack={handleGoBack}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        testID={TEST_IDS.patterns.scrollAction("version-history")}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Recipe Versions (
            {versionHistoryData &&
            isEnhancedVersionHistoryResponse(versionHistoryData)
              ? versionHistoryData.total_versions
              : versionList.length}
            )
          </Text>
          <Text style={styles.sectionSubtitle}>
            Complete version history showing all recipe iterations. Tap any
            version to view its details.
          </Text>
        </View>

        {versionList.map((versionItem: any, index: number) =>
          renderVersionItem(versionItem, index)
        )}
      </ScrollView>
    </View>
  );
}

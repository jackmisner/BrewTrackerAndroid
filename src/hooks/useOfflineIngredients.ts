/**
 * Offline-aware Ingredients Hook
 *
 * React Query hook for fetching and managing ingredients with offline support.
 * Automatically falls back to cached data when network is unavailable.
 *
 * Features:
 * - Automatic offline/online switching
 * - Cached ingredients with background refresh
 * - Network-aware query behavior
 * - Fallback to cached data on API failure
 * - Performance optimization with stale-while-revalidate
 *
 * @example
 * ```typescript
 * const { data: grains, isLoading } = useOfflineIngredients('grain', searchQuery);
 * ```
 */

import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@contexts/NetworkContext";
import ApiService from "@services/api/apiService";
import { OfflineCacheService } from "@services/offline/OfflineCacheService";
import { IngredientType, RecipeIngredient } from "@src/types";

/**
 * Hook for fetching ingredients with offline support
 *
 * @param type - Type of ingredient (grain, hop, yeast, other)
 * @param searchQuery - Optional search query to filter ingredients
 * @param category - Optional category filter
 * @returns React Query result with ingredients data, loading state, and error
 */
export function useOfflineIngredients(
  type: IngredientType,
  searchQuery?: string,
  category?: string
) {
  const { isConnected } = useNetwork();

  return useQuery({
    queryKey: ["ingredients", "offline-aware", type, searchQuery, category],
    queryFn: async (): Promise<RecipeIngredient[]> => {
      // When offline, use cached data
      if (!isConnected) {
        const cachedIngredients =
          await OfflineCacheService.getCachedIngredients(type);
        return filterIngredients(cachedIngredients, searchQuery, category);
      }

      // When online, try API first
      try {
        const response = await ApiService.ingredients.getAll(
          type,
          searchQuery || undefined,
          category || undefined
        );
        return response.data || [];
      } catch (error) {
        // Fallback to cached data on API failure
        console.warn(`API failed for ${type} ingredients, using cache:`, error);
        const cachedIngredients =
          await OfflineCacheService.getCachedIngredients(type);
        return filterIngredients(cachedIngredients, searchQuery, category);
      }
    },

    // Cache configuration for offline support
    staleTime: isConnected ? 5 * 60 * 1000 : Infinity, // 5min online, never stale offline
    gcTime: 24 * 60 * 60 * 1000, // Keep for 24 hours
    refetchOnMount: isConnected ? "always" : false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,

    // Retry configuration
    retry: (failureCount, error: any) => {
      // Don't retry auth errors
      if (error?.response?.status === 401) {
        return false;
      }
      // Only retry network errors when online
      return isConnected && failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Filter ingredients based on search query and category
 * This mimics the server-side filtering when using cached data
 */
function filterIngredients(
  ingredients: RecipeIngredient[],
  searchQuery?: string,
  category?: string
): RecipeIngredient[] {
  let filtered = [...ingredients];

  // Apply search filter
  if (searchQuery && searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      ingredient =>
        ingredient.name.toLowerCase().includes(query) ||
        ingredient.description?.toLowerCase().includes(query)
    );
  }

  // Apply category filter
  if (category) {
    filtered = filtered.filter(ingredient => {
      // Map category filter to ingredient properties
      switch (ingredient.type) {
        case "grain":
          return ingredient.grain_type === category;
        case "yeast":
          return ingredient.yeast_type === category;
        case "hop":
          // Hop categories not implemented in backend yet
          return true;
        case "other":
          // Other categories based on name/description
          return (
            ingredient.name.toLowerCase().includes(category.toLowerCase()) ||
            ingredient.description
              ?.toLowerCase()
              .includes(category.toLowerCase())
          );
        default:
          return true;
      }
    });
  }

  return filtered;
}

/**
 * Hook for getting all ingredient types with offline support
 * Useful for ingredient pickers that need to show multiple types
 */
export function useOfflineAllIngredients(searchQuery?: string) {
  const { isConnected } = useNetwork();

  return useQuery({
    queryKey: ["ingredients", "all", "offline-aware", searchQuery],
    queryFn: async (): Promise<{
      grain: RecipeIngredient[];
      hop: RecipeIngredient[];
      yeast: RecipeIngredient[];
      other: RecipeIngredient[];
    }> => {
      const results = {
        grain: [] as RecipeIngredient[],
        hop: [] as RecipeIngredient[],
        yeast: [] as RecipeIngredient[],
        other: [] as RecipeIngredient[],
      };

      if (!isConnected) {
        // When offline, get all cached ingredients
        results.grain = await OfflineCacheService.getCachedIngredients("grain");
        results.hop = await OfflineCacheService.getCachedIngredients("hop");
        results.yeast = await OfflineCacheService.getCachedIngredients("yeast");
        results.other = await OfflineCacheService.getCachedIngredients("other");
      } else {
        // When online, fetch from API
        const [grainRes, hopRes, yeastRes, otherRes] = await Promise.allSettled(
          [
            ApiService.ingredients.getAll("grain", searchQuery),
            ApiService.ingredients.getAll("hop", searchQuery),
            ApiService.ingredients.getAll("yeast", searchQuery),
            ApiService.ingredients.getAll("other", searchQuery),
          ]
        );

        results.grain =
          grainRes.status === "fulfilled"
            ? grainRes.value.data || []
            : await OfflineCacheService.getCachedIngredients("grain");
        results.hop =
          hopRes.status === "fulfilled"
            ? hopRes.value.data || []
            : await OfflineCacheService.getCachedIngredients("hop");
        results.yeast =
          yeastRes.status === "fulfilled"
            ? yeastRes.value.data || []
            : await OfflineCacheService.getCachedIngredients("yeast");
        results.other =
          otherRes.status === "fulfilled"
            ? otherRes.value.data || []
            : await OfflineCacheService.getCachedIngredients("other");
        // Log any failures for monitoring
        if (grainRes.status === "rejected") {
          console.warn("Failed to fetch grain ingredients:", grainRes.reason);
        }
        if (hopRes.status === "rejected") {
          console.warn("Failed to fetch hop ingredients:", hopRes.reason);
        }
        if (yeastRes.status === "rejected") {
          console.warn("Failed to fetch yeast ingredients:", yeastRes.reason);
        }
        if (otherRes.status === "rejected") {
          console.warn("Failed to fetch other ingredients:", otherRes.reason);
        }
      }

      // Apply search filtering if provided
      if (searchQuery?.trim()) {
        const query = searchQuery.toLowerCase().trim();
        Object.keys(results).forEach(key => {
          const ingredientType = key as keyof typeof results;
          results[ingredientType] = results[ingredientType].filter(
            ingredient =>
              ingredient.name.toLowerCase().includes(query) ||
              ingredient.description?.toLowerCase().includes(query)
          );
        });
      }

      return results;
    },

    // Cache configuration
    staleTime: isConnected ? 5 * 60 * 1000 : Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: isConnected ? "always" : false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,

    // Retry configuration
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) {
        return false;
      }
      return isConnected && failureCount < 2;
    },
  });
}

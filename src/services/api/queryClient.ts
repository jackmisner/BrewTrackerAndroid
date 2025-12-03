/**
 * React Query Client Configuration for BrewTracker Android
 *
 * Configures caching, persistence, and query management for optimal mobile performance.
 * Provides centralized query keys and cache utilities for consistent data management.
 *
 * Features:
 * - Mobile-optimized cache settings (15min stale, indefinite cache)
 * - Offline support with AsyncStorage persister
 * - Standardized query keys for all entities
 * - Cache management utilities for invalidation and cleanup
 *
 * @example
 * ```typescript
 * // Use in components with React Query hooks
 * const { data: recipes } = useQuery({
 *   queryKey: QUERY_KEYS.RECIPES,
 *   queryFn: () => ApiService.recipes.getAll()
 * });
 *
 * // Invalidate cache after mutations
 * cacheUtils.invalidateRecipes();
 * ```
 */

import { QueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QUERY_CLIENT_CONFIG, QUERY_CLIENT_MUTATIONS_CONFIG } from "../config";

/**
 * AsyncStorage persister for offline support
 * Enables data persistence across app sessions with user-scoped keys
 */
export const createUserScopedPersister = (userId?: string) => {
  const cacheKey = userId
    ? `BREWTRACKER_CACHE_${userId}`
    : "BREWTRACKER_CACHE_ANONYMOUS";

  return createAsyncStoragePersister({
    storage: AsyncStorage,
    key: cacheKey,
    serialize: JSON.stringify,
    deserialize: JSON.parse,
    // Throttle writes to prevent excessive storage access
    throttleTime: 1000,
  });
};

/**
 * Default persister for anonymous/initial state
 */
export const asyncStoragePersister = createUserScopedPersister();

/**
 * Main React Query client with mobile-optimized configuration
 * Balances performance, freshness, and network usage for mobile apps
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // CACHE-FIRST STRATEGY: Cache data for 15 minutes by default
      // This means cached data stays "fresh" longer, reducing network requests
      staleTime: QUERY_CLIENT_CONFIG.DEFAULT_STALE_TIME,
      // Keep data in cache indefinitely for offline access
      // StaleDataBanner will warn users when data is very old
      gcTime: QUERY_CLIENT_CONFIG.DEFAULT_GC_TIME,
      // Retry failed requests 2 times with exponential backoff
      retry: QUERY_CLIENT_CONFIG.MAX_RETRIES,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus (not applicable to mobile)
      refetchOnWindowFocus: false,
      // Refetch in background when reconnecting (non-blocking)
      refetchOnReconnect: true,
      // CRITICAL: Use cached data first, don't wait for network
      // false = show cache immediately, refetch in background
      // "always" = wait for network fetch (causes loading spinners)
      refetchOnMount: false,
      // Network timeout for faster fallback to cache
      networkMode: "offlineFirst",
    },
    mutations: {
      // Retry failed mutations once
      retry: QUERY_CLIENT_MUTATIONS_CONFIG.MAX_RETRIES,
      // Queue mutations when offline
      networkMode: "offlineFirst",
    },
  },
});

// Persist query client for offline support
// Note: In newer versions, persistence is handled differently
// This will be configured in the app root with QueryClientProvider

/**
 * Standardized query keys for React Query caching
 * Provides type-safe, hierarchical cache keys for all entities
 * Use these constants to ensure consistent cache management across the app
 */
export const QUERY_KEYS = {
  // Auth
  USER_PROFILE: ["user", "profile"] as const,
  USER_SETTINGS: ["user", "settings"] as const,
  VERIFICATION_STATUS: ["user", "verification"] as const,

  // Recipes
  RECIPES: ["recipes"] as const,
  USER_RECIPES: ["userRecipes"] as const,
  RECIPE: (id: string) => ["recipes", id] as const,
  RECIPE_METRICS: (id: string) => ["recipes", id, "metrics"] as const,
  RECIPE_VERSIONS: (id: string) => ["recipes", id, "versions"] as const,
  PUBLIC_RECIPES: ["recipes", "public"] as const,
  RECIPE_SEARCH: (query: string) => ["recipes", "search", query] as const,

  // Ingredients
  INGREDIENTS: ["ingredients"] as const,
  INGREDIENT: (id: string) => ["ingredients", id] as const,
  INGREDIENT_RECIPES: (id: string) => ["ingredients", id, "recipes"] as const,

  // Beer Styles
  BEER_STYLES: ["beer-styles"] as const,
  BEER_STYLE: (id: string) => ["beer-styles", id] as const,
  STYLE_SUGGESTIONS: (recipeId: string) =>
    ["beer-styles", "suggestions", recipeId] as const,
  STYLE_ANALYSIS: (recipeId: string) =>
    ["beer-styles", "analysis", recipeId] as const,

  // Brew Sessions
  BREW_SESSIONS: ["brew-sessions"] as const,
  BREW_SESSION: (id: string) => ["brew-sessions", id] as const,
  FERMENTATION_DATA: (sessionId: string) =>
    ["brew-sessions", sessionId, "fermentation"] as const,
  FERMENTATION_STATS: (sessionId: string) =>
    ["brew-sessions", sessionId, "stats"] as const,

  // Dashboard
  DASHBOARD: ["dashboard"] as const,

  // AI
  AI_HEALTH: ["ai", "health"] as const,
  AI_ANALYSIS: (recipeId: string) => ["ai", "analysis", recipeId] as const,
} as const;

/**
 * Cache management utilities for React Query
 * Provides convenient methods for cache invalidation, cleanup, and debugging
 */
export const cacheUtils = {
  // Invalidate all recipe-related queries
  invalidateRecipes: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECIPES });
  },

  // Invalidate specific recipe
  invalidateRecipe: (id: string) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECIPE(id) });
  },

  // Clear all cached data
  clearAll: () => {
    queryClient.clear();
  },

  // Clear user-scoped persisted cache from AsyncStorage
  clearUserPersistedCache: async (userId?: string) => {
    const cacheKey = userId
      ? `BREWTRACKER_CACHE_${userId}`
      : "BREWTRACKER_CACHE_ANONYMOUS";
    try {
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn("Failed to clear persisted cache:", error);
    }
  },

  // Clear all persisted cache keys (for complete cleanup)
  clearAllPersistedCache: async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith("BREWTRACKER_CACHE"));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.warn("Failed to clear all persisted cache:", error);
    }
  },

  // Remove cached data older than specified time
  removeStale: (maxAge: number = 24 * 60 * 60 * 1000) => {
    queryClient
      .getQueryCache()
      .getAll()
      .forEach(query => {
        if (query.state.dataUpdatedAt < Date.now() - maxAge) {
          queryClient.removeQueries({ queryKey: query.queryKey });
        }
      });
  },

  // Get cache size for debugging
  getCacheInfo: () => {
    const queries = queryClient.getQueryCache().getAll();
    return {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      freshQueries: queries.filter(q => !q.isStale()).length,
    };
  },
};

export default queryClient;

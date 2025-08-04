import { QueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

// Create async storage persister
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "BREWTRACKER_CACHE",
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});

// Create query client with React Native optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Don't refetch on window focus (not applicable to mobile)
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: "always",
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

// Persist query client for offline support
// Note: In newer versions, persistence is handled differently
// This will be configured in the app root with QueryClientProvider

// Query keys for consistent caching
export const QUERY_KEYS = {
  // Auth
  USER_PROFILE: ["user", "profile"] as const,
  USER_SETTINGS: ["user", "settings"] as const,
  VERIFICATION_STATUS: ["user", "verification"] as const,

  // Recipes
  RECIPES: ["recipes"] as const,
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
} as const;

// Helper functions for cache management
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

/**
 * Offline Cache Service for BrewTracker Android
 *
 * Manages offline caching of essential brewing data (ingredients, beer styles)
 * to enable full recipe creation capability when offline.
 *
 * Features:
 * - Initial data fetching on app startup with visual progress
 * - Background refresh of cached data when network available
 * - Storage management with versioning for cache invalidation
 * - Fallback to cached data when API unavailable
 * - Progress tracking for splash screen integration
 *
 * @example
 * ```typescript
 * // Initialize cache on app startup
 * await OfflineCacheService.initializeCache((progress) => {
 *   console.log(`Cache loading: ${progress.message} (${progress.percent}%)`);
 * });
 *
 * // Get cached data
 * const ingredients = await OfflineCacheService.getCachedIngredients('grain');
 * const beerStyles = await OfflineCacheService.getCachedBeerStyles();
 * ```
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@services/config";
import ApiService from "@services/api/apiService";
import {
  IngredientType,
  RecipeIngredient,
  Recipe,
  BrewSession,
} from "@src/types";
import { BeerStyleOption } from "@src/hooks/useBeerStyles";

// Cache metadata interface
interface CacheMetadata {
  version: number;
  // Core cache (ingredients/beer styles)
  lastUpdated: number;
  // Domain-specific freshness (do not influence core validity)
  dashboardLastUpdated?: number;
  recipeListLastUpdated?: number;
  dataSize: number;
  // Optional: scope cache by user (prevents cross-account leakage)
  userId?: string;
}

// Progress callback interface for splash screen
export interface CacheProgress {
  step: string;
  message: string;
  percent: number;
  isComplete: boolean;
}

// Cached data interfaces
interface CachedIngredients {
  grain: RecipeIngredient[];
  hop: RecipeIngredient[];
  yeast: RecipeIngredient[];
  other: RecipeIngredient[];
}

interface CachedBeerStyles {
  styles: BeerStyleOption[];
}

// Dashboard data types
export interface DashboardUserStats {
  total_recipes: number;
  public_recipes: number;
  total_brew_sessions: number;
  active_brew_sessions: number;
}

export interface CachedDashboardData {
  user_stats: DashboardUserStats;
  recent_recipes: Recipe[];
  active_brew_sessions: BrewSession[];
  timestamp: number;
}

// Recipe list data types
interface CachedRecipeListData {
  recipes: Recipe[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
  timestamp: number;
}

interface CachedData {
  ingredients: CachedIngredients;
  beerStyles: CachedBeerStyles;
  dashboard?: CachedDashboardData;
  recipeList?: CachedRecipeListData;
  metadata: CacheMetadata;
}

/**
 * Offline cache service for essential brewing data
 */
export class OfflineCacheService {
  private static readonly CACHE_KEY = STORAGE_KEYS.OFFLINE_CACHE;
  private static readonly CACHE_VERSION = 1;
  private static readonly CACHE_EXPIRY_HOURS = 24; // Cache expires after 24 hours

  // Ingredient types to cache
  private static readonly INGREDIENT_TYPES: IngredientType[] = [
    "grain",
    "hop",
    "yeast",
    "other",
  ];

  /**
   * Initialize cache with progress tracking for splash screen
   */
  static async initializeCache(
    onProgress?: (progress: CacheProgress) => void
  ): Promise<boolean> {
    try {
      const reportProgress = (
        step: string,
        message: string,
        percent: number
      ) => {
        onProgress?.({
          step,
          message,
          percent,
          isComplete: false,
        });
      };

      reportProgress("init", "Checking cached data...", 5);

      // Check if we have valid cached data
      const cachedData = await this.loadCachedData();
      const isValid = await this.isCacheValid(cachedData);

      if (isValid && cachedData) {
        reportProgress("complete", "Using cached data", 100);
        onProgress?.({
          step: "complete",
          message: "Ready to brew!",
          percent: 100,
          isComplete: true,
        });
        return true;
      }

      // Check network connectivity
      reportProgress("network", "Checking network...", 10);
      const isOnline = await this.isNetworkAvailable();

      if (!isOnline) {
        if (cachedData) {
          // Use expired cache if available when offline
          reportProgress("complete", "Using offline data", 100);
          onProgress?.({
            step: "complete",
            message: "Ready to brew offline!",
            percent: 100,
            isComplete: true,
          });
          return true;
        }

        // No cached data and no network
        reportProgress("error", "No cached data available", 100);
        onProgress?.({
          step: "error",
          message: "No network connection and no cached data",
          percent: 100,
          isComplete: true,
        });
        return false;
      }

      // Fetch fresh data
      reportProgress("fetch", "Downloading brewing data...", 20);
      await this.fetchAndCacheData(reportProgress);

      onProgress?.({
        step: "complete",
        message: "Ready to brew!",
        percent: 100,
        isComplete: true,
      });

      return true;
    } catch (error) {
      console.error("Failed to initialize cache:", error);
      onProgress?.({
        step: "error",
        message: "Failed to load brewing data",
        percent: 100,
        isComplete: true,
      });
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  private static async isAuthenticated(): Promise<boolean> {
    try {
      const token = await ApiService.token.getToken();
      return !!token;
    } catch (error) {
      console.warn("Failed to check authentication status:", error);
      return false;
    }
  }

  /**
   * Fetch and cache all essential data
   */
  private static async fetchAndCacheData(
    reportProgress?: (step: string, message: string, percent: number) => void
  ): Promise<void> {
    const cachedData: CachedData = {
      ingredients: {
        grain: [],
        hop: [],
        yeast: [],
        other: [],
      },
      beerStyles: { styles: [] },
      metadata: {
        version: this.CACHE_VERSION,
        lastUpdated: Date.now(),
        dataSize: 0,
      },
    };

    // Fetch beer styles first
    reportProgress?.("beer-styles", "Loading beer styles...", 30);
    try {
      const stylesResponse = await ApiService.beerStyles.getAll();
      cachedData.beerStyles.styles = this.processBeerStyles(
        stylesResponse.data
      );
    } catch (error) {
      console.warn("Failed to fetch beer styles:", error);
      cachedData.beerStyles.styles = this.getFallbackBeerStyles();
    }

    // Fetch ingredients by type (only if authenticated)
    let progressStep = 40;
    const progressIncrement = 50 / this.INGREDIENT_TYPES.length;

    const isUserAuthenticated = await this.isAuthenticated();

    if (!isUserAuthenticated) {
      reportProgress?.(
        "auth",
        "Authentication required for ingredient data",
        90
      );
      // Fill with empty arrays for now - will be populated after authentication
      for (const type of this.INGREDIENT_TYPES) {
        cachedData.ingredients[type] = [];
      }
    } else {
      // User is authenticated, fetch ingredients
      for (const type of this.INGREDIENT_TYPES) {
        reportProgress?.("ingredients", `Loading ${type}s...`, progressStep);

        try {
          const response = await ApiService.ingredients.getAll(type);
          cachedData.ingredients[type] = response.data || [];
        } catch (error) {
          console.warn(`Failed to fetch ${type}s:`, error);
          cachedData.ingredients[type] = [];
        }

        progressStep += progressIncrement;
      }
    }

    // Calculate data size
    let dataString = JSON.stringify(cachedData);
    cachedData.metadata.dataSize = dataString.length;

    // Check if data size exceeds reasonable limit (e.g., 10MB)
    const MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10MB
    if (cachedData.metadata.dataSize > MAX_CACHE_SIZE) {
      console.warn(
        `Cache size (${cachedData.metadata.dataSize} bytes) exceeds limit`
      );
      delete cachedData.dashboard;
      delete cachedData.recipeList;

      // Recalculate data size
      const prunedDataString = JSON.stringify(cachedData);
      cachedData.metadata.dataSize = prunedDataString.length;
      dataString = prunedDataString;
    }

    reportProgress?.("save", "Saving cache...", 95);

    // Save to AsyncStorage with error handling
    try {
      await AsyncStorage.setItem(this.CACHE_KEY, dataString);
    } catch (error) {
      console.error("Failed to save cache to AsyncStorage:", {
        error,
        dataSize: cachedData.metadata.dataSize,
        cacheKey: this.CACHE_KEY,
      });
      throw new Error(
        `Cache save failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Process beer styles response into the expected format
   */
  private static processBeerStyles(data: any): BeerStyleOption[] {
    if (!data || !data.categories) {
      return this.getFallbackBeerStyles();
    }

    const styles: BeerStyleOption[] = [];

    Object.values(data.categories).forEach((category: any) => {
      if (category.styles && Array.isArray(category.styles)) {
        category.styles.forEach((style: any) => {
          if (style.name && style.style_id) {
            styles.push({
              name: style.name,
              styleId: style.style_id,
            });
          }
        });
      }
    });

    // Sort by style ID
    return styles.sort((a, b) => {
      const parseStyleId = (id: string) => {
        const match = id.match(/(\d+)([A-Z]+)/);
        return match
          ? { num: parseInt(match[1], 10), letter: match[2].toUpperCase() }
          : { num: 999, letter: "Z" };
      };

      const aId = parseStyleId(a.styleId);
      const bId = parseStyleId(b.styleId);

      if (aId.num !== bId.num) {
        return aId.num - bId.num;
      }
      return aId.letter.localeCompare(bId.letter);
    });
  }

  /**
   * Get fallback beer styles for offline use
   */
  private static getFallbackBeerStyles(): BeerStyleOption[] {
    return [
      { name: "American Pale Ale", styleId: "18B" },
      { name: "American IPA", styleId: "21A" },
      { name: "American Porter", styleId: "20A" },
      { name: "American Stout", styleId: "20B" },
      { name: "Wheat Beer", styleId: "1A" },
      { name: "German Pilsner", styleId: "5D" },
      { name: "Munich Helles", styleId: "4A" },
      { name: "Oktoberfest", styleId: "6A" },
      { name: "English Bitter", styleId: "11A" },
      { name: "English Brown Ale", styleId: "13B" },
    ];
  }

  /**
   * Load cached data from storage
   */
  private static async loadCachedData(): Promise<CachedData | null> {
    try {
      const dataString = await AsyncStorage.getItem(this.CACHE_KEY);
      if (!dataString) {
        return null;
      }

      const data: CachedData = JSON.parse(dataString);
      return data;
    } catch (error) {
      console.error("Failed to load cached data:", error);
      return null;
    }
  }

  /**
   * Check if cached data is valid and not expired
   */
  private static async isCacheValid(
    cachedData: CachedData | null
  ): Promise<boolean> {
    if (!cachedData || !cachedData.metadata) {
      return false;
    }

    // Check version
    if (cachedData.metadata.version !== this.CACHE_VERSION) {
      return false;
    }

    // Check expiry
    const expiryTime = this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
    const isExpired = Date.now() - cachedData.metadata.lastUpdated > expiryTime;

    return !isExpired;
  }

  /**
   * Check network availability
   */
  private static async isNetworkAvailable(): Promise<boolean> {
    try {
      return await ApiService.checkConnection();
    } catch {
      return false;
    }
  }

  /**
   * Get cached ingredients by type
   */
  static async getCachedIngredients(
    type: IngredientType
  ): Promise<RecipeIngredient[]> {
    const cachedData = await this.loadCachedData();
    if (!cachedData || !cachedData.ingredients) {
      return [];
    }
    return cachedData.ingredients[type as keyof CachedIngredients] || [];
  }

  /**
   * Get cached beer styles
   */
  static async getCachedBeerStyles(): Promise<BeerStyleOption[]> {
    const cachedData = await this.loadCachedData();
    if (!cachedData || !cachedData.beerStyles.styles) {
      return this.getFallbackBeerStyles();
    }
    return cachedData.beerStyles.styles;
  }

  /**
   * Background refresh of cache when network available
   */
  static async refreshCacheInBackground(): Promise<void> {
    try {
      const isOnline = await this.isNetworkAvailable();
      if (!isOnline) {
        return;
      }

      const isUserAuthenticated = await this.isAuthenticated();
      if (!isUserAuthenticated) {
        return;
      }

      await this.fetchAndCacheData();
    } catch (error) {
      console.error("Background cache refresh failed:", error);
    }
  }

  /**
   * Fetch and cache ingredients after user authentication
   * Call this after successful login to populate ingredient cache
   */
  static async cacheIngredientsAfterAuth(): Promise<boolean> {
    try {
      const isUserAuthenticated = await this.isAuthenticated();
      if (!isUserAuthenticated) {
        console.warn("Cannot cache ingredients - user not authenticated");
        return false;
      }

      const isOnline = await this.isNetworkAvailable();
      if (!isOnline) {
        return false;
      }

      // Load existing cached data
      let cachedData = await this.loadCachedData();
      if (!cachedData) {
        // If no cache exists, create empty structure
        cachedData = {
          ingredients: { grain: [], hop: [], yeast: [], other: [] },
          beerStyles: { styles: this.getFallbackBeerStyles() },
          metadata: {
            version: this.CACHE_VERSION,
            lastUpdated: Date.now(),
            dataSize: 0,
          },
        };
      }

      // Fetch ingredients by type
      for (const type of this.INGREDIENT_TYPES) {
        try {
          const response = await ApiService.ingredients.getAll(type);
          cachedData.ingredients[type] = response.data || [];
        } catch (error) {
          console.warn(`Failed to fetch ${type}s:`, error);
          // Keep existing cache or empty array
        }
      }

      // Update metadata
      cachedData.metadata.lastUpdated = Date.now();
      const dataString = JSON.stringify(cachedData);
      cachedData.metadata.dataSize = dataString.length;

      // Save updated cache
      await AsyncStorage.setItem(this.CACHE_KEY, dataString);

      return true;
    } catch (error) {
      console.error("Failed to cache ingredients after authentication:", error);
      return false;
    }
  }

  /**
   * Get cache status for debugging
   */
  static async getCacheStatus(): Promise<{
    isValid: boolean;
    lastUpdated: Date | null;
    dataSize: number;
    version: number;
    ingredientCounts: { [key in IngredientType]: number };
  }> {
    const cachedData = await this.loadCachedData();
    const isValid = await this.isCacheValid(cachedData);

    const ingredientCounts: { [key in IngredientType]: number } = {
      grain: cachedData?.ingredients.grain?.length || 0,
      hop: cachedData?.ingredients.hop?.length || 0,
      yeast: cachedData?.ingredients.yeast?.length || 0,
      other: cachedData?.ingredients.other?.length || 0,
    };

    return {
      isValid,
      lastUpdated: cachedData?.metadata.lastUpdated
        ? new Date(cachedData.metadata.lastUpdated)
        : null,
      dataSize: cachedData?.metadata.dataSize || 0,
      version: cachedData?.metadata.version || 0,
      ingredientCounts,
    };
  }

  /**
   * Check if ingredients are available in cache
   */
  static async hasIngredients(): Promise<boolean> {
    const cachedData = await this.loadCachedData();
    if (!cachedData || !cachedData.ingredients) {
      return false;
    }

    // Check if we have at least some ingredients of each type
    const hasGrains = (cachedData.ingredients.grain?.length || 0) > 0;
    const hasHops = (cachedData.ingredients.hop?.length || 0) > 0;

    // We need at least grains and hops for basic recipe creation
    return hasGrains && hasHops;
  }

  /**
   * Clear cached data
   */
  static async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(this.CACHE_KEY);
  }

  /**
   * Log cache status for debugging
   */
  static async logCacheStatus(): Promise<void> {
    try {
      const _status = await this.getCacheStatus();
      const _hasIngredientsAvailable = await this.hasIngredients();
      const _isAuthenticated = await this.isAuthenticated();

      // Cache status logging disabled - too verbose
      // Enable only when specifically debugging cache issues
    } catch (error) {
      console.error("Failed to get cache status:", error);
    }
  }

  // ==============================
  // DASHBOARD DATA METHODS
  // ==============================

  /**
   * Cache dashboard data for offline viewing
   */
  static async cacheDashboardData(dashboardData: {
    user_stats: DashboardUserStats;
    recent_recipes: Recipe[];
    active_brew_sessions: BrewSession[];
  }): Promise<void> {
    try {
      const cachedData = await this.loadCachedData();
      if (!cachedData) {
        console.warn("Cannot cache dashboard data: no base cache exists");
        return;
      }

      cachedData.dashboard = {
        ...dashboardData,
        timestamp: Date.now(),
      };

      // Update metadata
      cachedData.metadata.lastUpdated = Date.now();
      const dataString = JSON.stringify(cachedData);
      cachedData.metadata.dataSize = dataString.length;

      await AsyncStorage.setItem(this.CACHE_KEY, dataString);
    } catch (error) {
      console.error("Failed to cache dashboard data:", error);
    }
  }

  /**
   * Get cached dashboard data
   */
  static async getCachedDashboardData(): Promise<CachedDashboardData | null> {
    try {
      const cachedData = await this.loadCachedData();
      if (!cachedData?.dashboard) {
        return null;
      }

      // Check if dashboard cache is still valid (24 hours)
      const dashboardCacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
      const isExpired =
        Date.now() - cachedData.dashboard.timestamp > dashboardCacheExpiry;

      if (isExpired) {
        console.log("Cached dashboard data is expired but returning anyway");
      }

      return cachedData.dashboard;
    } catch (error) {
      console.error("Failed to get cached dashboard data:", error);
      return null;
    }
  }

  // ==============================
  // RECIPE LIST DATA METHODS
  // ==============================

  /**
   * Cache recipe list data for offline viewing
   */
  static async cacheRecipeListData(
    recipes: Recipe[],
    pagination: {
      page: number;
      per_page: number;
      total: number;
      pages: number;
    }
  ): Promise<void> {
    try {
      const cachedData = await this.loadCachedData();
      if (!cachedData) {
        console.warn("Cannot cache recipe list data: no base cache exists");
        return;
      }

      cachedData.recipeList = {
        recipes,
        pagination,
        timestamp: Date.now(),
      };

      // Update domain-specific timestamp
      cachedData.metadata.recipeListLastUpdated = Date.now();
      let dataString = JSON.stringify(cachedData);
      cachedData.metadata.dataSize = dataString.length;
      // Optional: cap size by trimming recipes if too large
      const MAX_CACHE_SIZE = 10 * 1024 * 1024;
      if (
        cachedData.metadata.dataSize > MAX_CACHE_SIZE &&
        cachedData.recipeList
      ) {
        console.warn(
          `Cache size (${cachedData.metadata.dataSize} bytes) exceeds limit after recipe list update; trimming list.`
        );
        cachedData.recipeList.recipes = cachedData.recipeList.recipes.slice(
          0,
          100
        );
        dataString = JSON.stringify(cachedData);
        cachedData.metadata.dataSize = dataString.length;
      }
      try {
        await AsyncStorage.setItem(this.CACHE_KEY, dataString);
      } catch (error) {
        console.error("Failed to cache recipe list data:", {
          error,
          dataSize: cachedData.metadata.dataSize,
          cacheKey: this.CACHE_KEY,
        });
      }
    } catch (error) {
      console.error("Failed to cache recipe list data:", error);
    }
  }

  /**
   * Get cached recipe list data
   */
  static async getCachedRecipeListData(): Promise<CachedRecipeListData | null> {
    try {
      const cachedData = await this.loadCachedData();
      if (!cachedData?.recipeList) {
        return null;
      }

      // Check if recipe list cache is still valid (30 minutes)
      const recipeListCacheExpiry = 30 * 60 * 1000; // 30 minutes
      const isExpired =
        Date.now() - cachedData.recipeList.timestamp > recipeListCacheExpiry;

      if (isExpired) {
        console.log("Cached recipe list data is expired but returning anyway");
      }

      return cachedData.recipeList;
    } catch (error) {
      console.error("Failed to get cached recipe list data:", error);
      return null;
    }
  }

  /**
   * Enhanced background refresh that includes dashboard and recipe list data
   */
  static async refreshAllCacheInBackground(): Promise<void> {
    try {
      const isOnline = await this.isNetworkAvailable();
      if (!isOnline) {
        return;
      }

      const isUserAuthenticated = await this.isAuthenticated();
      if (!isUserAuthenticated) {
        return;
      }

      // Refresh basic cache (ingredients, beer styles)
      await this.fetchAndCacheData();

      // Refresh dashboard data
      try {
        const dashboardData = await this.fetchDashboardData();
        if (dashboardData) {
          await this.cacheDashboardData(dashboardData);
        }
      } catch (error) {
        console.warn("Failed to refresh dashboard data:", error);
      }

      // Refresh recipe list data
      try {
        const recipeListData = await this.fetchRecipeListData();
        if (recipeListData) {
          await this.cacheRecipeListData(
            recipeListData.recipes,
            recipeListData.pagination
          );
        }
      } catch (error) {
        console.warn("Failed to refresh recipe list data:", error);
      }
    } catch (error) {
      console.error("Comprehensive background cache refresh failed:", error);
    }
  }

  /**
   * Fetch fresh dashboard data from API
   */
  private static async fetchDashboardData(): Promise<{
    user_stats: DashboardUserStats;
    recent_recipes: Recipe[];
    active_brew_sessions: BrewSession[];
  } | null> {
    try {
      // Check authentication before making API calls
      const isUserAuthenticated = await this.isAuthenticated();
      if (!isUserAuthenticated) {
        return null;
      }

      const PAGE = 1;
      const RECENT_RECIPES_LIMIT = 5;
      const BREW_SESSIONS_LIMIT = 20;
      const PUBLIC_PAGE_SIZE = 1;

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

      const userStats: DashboardUserStats = {
        total_recipes: recipesResponse.data.pagination?.total || recipes.length,
        public_recipes: publicRecipesResponse.data.pagination?.total || 0,
        total_brew_sessions:
          brewSessionsResponse.data.pagination?.total || brewSessions.length,
        active_brew_sessions: activeBrewSessions.length,
      };

      return {
        user_stats: userStats,
        recent_recipes: recipes.slice(0, 3),
        active_brew_sessions: activeBrewSessions.slice(0, 3),
      };
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      return null;
    }
  }

  /**
   * Fetch fresh recipe list data from API
   */
  private static async fetchRecipeListData(): Promise<{
    recipes: Recipe[];
    pagination: any;
  } | null> {
    try {
      // Check authentication before making API calls
      const isUserAuthenticated = await this.isAuthenticated();
      if (!isUserAuthenticated) {
        return null;
      }

      const response = await ApiService.recipes.getAll(1, 20); // First page with 20 items
      return {
        recipes: response.data?.recipes || [],
        pagination: response.data?.pagination || {
          page: 1,
          per_page: 20,
          total: 0,
          pages: 0,
        },
      };
    } catch (error) {
      console.error("Failed to fetch recipe list data:", error);
      return null;
    }
  }
}

export default OfflineCacheService;

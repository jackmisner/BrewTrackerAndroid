/**
 * StaticDataService - BrewTracker Offline V2
 *
 * Handles permanent caching of ingredients and beer styles with version-based updates.
 * Data is cached indefinitely until backend version changes.
 *
 * Features:
 * - Version-based cache invalidation
 * - Permanent storage until version updates
 * - Optimistic UI responses
 * - Background version checking
 * - Graceful error handling
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiService from "@services/api/apiService";
import {
  CachedStaticData,
  StaticDataCacheStats,
  VersionCheckResult,
  OfflineError,
  VersionError,
  STORAGE_KEYS_V2,
  Ingredient,
  BeerStyle,
} from "@src/types";

export class StaticDataService {
  private static versionCheckInProgress = false;
  private static lastVersionCheck = 0;
  private static readonly VERSION_CHECK_COOLDOWN = 30000; // 30 seconds

  // ============================================================================
  // Core Data Access Methods
  // ============================================================================

  /**
   * Get all ingredients with optional filtering
   */
  static async getIngredients(filters?: {
    type?: string;
    search?: string;
    category?: string;
  }): Promise<Ingredient[]> {
    try {
      // Try to get from cache first
      const cached = await this.getCachedIngredients();

      if (cached && cached.data) {
        // Apply filters if provided
        let filtered = cached.data;

        if (filters?.type) {
          filtered = filtered.filter(ing => ing.type === filters.type);
        }

        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          filtered = filtered.filter(ing =>
            ing.name.toLowerCase().includes(searchLower)
          );
        }

        if (filters?.category) {
          filtered = filtered.filter(ing => {
            if (filters.type === "grain") {
              return ing.grain_type === filters.category;
            }
            if (filters.type === "yeast") {
              return ing.yeast_type === filters.category;
            }
            return true;
          });
        }

        // Background version check (don't wait for it)
        this.backgroundVersionCheck("ingredients");

        return filtered;
      }

      // No cache, fetch fresh data
      return await this.fetchAndCacheIngredients();
    } catch (error) {
      console.error("Error getting ingredients:", error);
      throw new OfflineError(
        "Failed to get ingredients data",
        "INGREDIENTS_ERROR",
        true
      );
    }
  }

  /**
   * Get all beer styles with optional filtering
   */
  static async getBeerStyles(filters?: {
    category?: string;
    search?: string;
  }): Promise<BeerStyle[]> {
    try {
      // Try to get from cache first
      const cached = await this.getCachedBeerStyles();

      if (cached && cached.data) {
        // Apply filters if provided
        let filtered = cached.data;

        if (filters?.category) {
          filtered = filtered.filter(
            style => style.category === filters.category
          );
        }

        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          filtered = filtered.filter(
            style =>
              style.name.toLowerCase().includes(searchLower) ||
              style.description?.toLowerCase().includes(searchLower)
          );
        }

        // Background version check (don't wait for it)
        this.backgroundVersionCheck("beer_styles");

        return filtered;
      }

      // No cache, fetch fresh data
      return await this.fetchAndCacheBeerStyles();
    } catch (error) {
      console.error("Error getting beer styles:", error);
      throw new OfflineError(
        "Failed to get beer styles data",
        "BEER_STYLES_ERROR",
        true
      );
    }
  }

  // ============================================================================
  // Version Management
  // ============================================================================

  /**
   * Check if updates are available for static data
   */
  static async checkForUpdates(): Promise<VersionCheckResult> {
    try {
      // Check version using new ApiService endpoints
      const [ingredientsResponse, beerStylesResponse] = await Promise.all([
        ApiService.ingredients.getVersion(),
        ApiService.beerStyles.getVersion(),
      ]);

      const ingredientsVersion = ingredientsResponse.data;
      const beerStylesVersion = beerStylesResponse.data;

      const [cachedIngredients, cachedBeerStyles] = await Promise.all([
        this.getCachedVersion("ingredients"),
        this.getCachedVersion("beer_styles"),
      ]);

      return {
        ingredients:
          !cachedIngredients ||
          cachedIngredients !== ingredientsVersion.version,
        beerStyles:
          !cachedBeerStyles || cachedBeerStyles !== beerStylesVersion.version,
      };
    } catch (error) {
      console.warn("Failed to check for updates:", error);
      // Return false for both if check fails
      return { ingredients: false, beerStyles: false };
    }
  }

  /**
   * Update ingredients cache with fresh data
   */
  static async updateIngredientsCache(): Promise<void> {
    try {
      await this.fetchAndCacheIngredients();
    } catch (error) {
      console.error("Failed to update ingredients cache:", error);
      throw new VersionError(
        "Failed to update ingredients cache",
        "ingredients"
      );
    }
  }

  /**
   * Update beer styles cache with fresh data
   */
  static async updateBeerStylesCache(): Promise<void> {
    try {
      await this.fetchAndCacheBeerStyles();
    } catch (error) {
      console.error("Failed to update beer styles cache:", error);
      throw new VersionError(
        "Failed to update beer styles cache",
        "beer_styles"
      );
    }
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * Clear all static data cache
   */
  static async clearCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS_V2.INGREDIENTS_DATA),
        AsyncStorage.removeItem(STORAGE_KEYS_V2.INGREDIENTS_VERSION),
        AsyncStorage.removeItem(STORAGE_KEYS_V2.BEER_STYLES_DATA),
        AsyncStorage.removeItem(STORAGE_KEYS_V2.BEER_STYLES_VERSION),
      ]);
    } catch (error) {
      console.error("Failed to clear cache:", error);
      throw new OfflineError(
        "Failed to clear cache",
        "CACHE_CLEAR_ERROR",
        true
      );
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<StaticDataCacheStats> {
    try {
      const [
        ingredientsData,
        ingredientsVersion,
        beerStylesData,
        beerStylesVersion,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS_V2.INGREDIENTS_DATA),
        AsyncStorage.getItem(STORAGE_KEYS_V2.INGREDIENTS_VERSION),
        AsyncStorage.getItem(STORAGE_KEYS_V2.BEER_STYLES_DATA),
        AsyncStorage.getItem(STORAGE_KEYS_V2.BEER_STYLES_VERSION),
      ]);

      const ingredientsCached = ingredientsData
        ? JSON.parse(ingredientsData)
        : null;
      const beerStylesCached = beerStylesData
        ? JSON.parse(beerStylesData)
        : null;

      return {
        ingredients: {
          cached: !!ingredientsCached,
          version: ingredientsVersion,
          record_count: ingredientsCached?.data?.length || 0,
          last_updated: ingredientsCached?.cached_at || null,
        },
        beerStyles: {
          cached: !!beerStylesCached,
          version: beerStylesVersion,
          record_count: beerStylesCached?.data?.length || 0,
          last_updated: beerStylesCached?.cached_at || null,
        },
      };
    } catch (error) {
      console.error("Failed to get cache stats:", error);
      // Return empty stats on error
      return {
        ingredients: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
        beerStyles: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Fetch and cache ingredients from API
   */
  private static async fetchAndCacheIngredients(): Promise<Ingredient[]> {
    try {
      // Get version and data
      const [versionResponse, dataResponse] = await Promise.all([
        ApiService.ingredients.getVersion(),
        ApiService.ingredients.getAll(),
      ]);

      // Handle the response structure - response.data might be an array or have ingredients property
      let ingredients: any[] = [];
      if (Array.isArray(dataResponse.data)) {
        ingredients = dataResponse.data;
      } else if (
        dataResponse.data &&
        typeof dataResponse.data === "object" &&
        "ingredients" in dataResponse.data
      ) {
        ingredients = (dataResponse.data as any).ingredients || [];
      }

      // Cache the data
      const version = versionResponse.data.version;
      const cachedData: CachedStaticData<Ingredient> = {
        data: ingredients,
        version,
        cached_at: Date.now(),
        expires_never: true,
      };

      await Promise.all([
        AsyncStorage.setItem(
          STORAGE_KEYS_V2.INGREDIENTS_DATA,
          JSON.stringify(cachedData)
        ),
        AsyncStorage.setItem(STORAGE_KEYS_V2.INGREDIENTS_VERSION, version),
      ]);

      return ingredients;
    } catch (error) {
      console.error("Failed to fetch ingredients:", error);
      throw new OfflineError(
        "Failed to fetch ingredients",
        "FETCH_ERROR",
        true
      );
    }
  }

  /**
   * Fetch and cache beer styles from API
   */
  private static async fetchAndCacheBeerStyles(): Promise<BeerStyle[]> {
    try {
      // Get version and data
      const [versionResponse, dataResponse] = await Promise.all([
        ApiService.beerStyles.getVersion(),
        ApiService.beerStyles.getAll(),
      ]);

      const beerStylesData =
        dataResponse.data.categories || dataResponse.data || [];

      // Flatten categories into styles
      const allStyles: BeerStyle[] = [];
      beerStylesData.forEach((category: any) => {
        if (category.styles) {
          allStyles.push(...category.styles);
        }
      });

      // Cache the data
      const version = versionResponse.data.version;
      const cachedData: CachedStaticData<BeerStyle> = {
        data: allStyles,
        version,
        cached_at: Date.now(),
        expires_never: true,
      };

      await Promise.all([
        AsyncStorage.setItem(
          STORAGE_KEYS_V2.BEER_STYLES_DATA,
          JSON.stringify(cachedData)
        ),
        AsyncStorage.setItem(STORAGE_KEYS_V2.BEER_STYLES_VERSION, version),
      ]);

      return allStyles;
    } catch (error) {
      console.error("Failed to fetch beer styles:", error);
      throw new OfflineError(
        "Failed to fetch beer styles",
        "FETCH_ERROR",
        true
      );
    }
  }

  /**
   * Get cached ingredients
   */
  private static async getCachedIngredients(): Promise<CachedStaticData<Ingredient> | null> {
    try {
      const cached = await AsyncStorage.getItem(
        STORAGE_KEYS_V2.INGREDIENTS_DATA
      );
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error("Failed to get cached ingredients:", error);
      return null;
    }
  }

  /**
   * Get cached beer styles
   */
  private static async getCachedBeerStyles(): Promise<CachedStaticData<BeerStyle> | null> {
    try {
      const cached = await AsyncStorage.getItem(
        STORAGE_KEYS_V2.BEER_STYLES_DATA
      );
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error("Failed to get cached beer styles:", error);
      return null;
    }
  }

  /**
   * Get cached version for a data type
   */
  private static async getCachedVersion(
    dataType: "ingredients" | "beer_styles"
  ): Promise<string | null> {
    try {
      const key =
        dataType === "ingredients"
          ? STORAGE_KEYS_V2.INGREDIENTS_VERSION
          : STORAGE_KEYS_V2.BEER_STYLES_VERSION;

      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Failed to get cached version for ${dataType}:`, error);
      return null;
    }
  }

  /**
   * Background version check with cooldown
   */
  private static async backgroundVersionCheck(
    dataType: "ingredients" | "beer_styles"
  ): Promise<void> {
    // Prevent excessive version checks
    const now = Date.now();
    if (
      this.versionCheckInProgress ||
      now - this.lastVersionCheck < this.VERSION_CHECK_COOLDOWN
    ) {
      return;
    }

    this.versionCheckInProgress = true;
    this.lastVersionCheck = now;

    try {
      // Get version using ApiService
      const versionResponse =
        dataType === "ingredients"
          ? await ApiService.ingredients.getVersion()
          : await ApiService.beerStyles.getVersion();

      const cachedVersion = await this.getCachedVersion(dataType);

      // If version differs, update cache in background
      if (cachedVersion !== versionResponse.data.version) {
        if (dataType === "ingredients") {
          await this.fetchAndCacheIngredients();
        } else {
          await this.fetchAndCacheBeerStyles();
        }
      }
    } catch (error) {
      // Silent fail for background checks
      console.warn(`Background version check failed for ${dataType}:`, error);
    } finally {
      this.versionCheckInProgress = false;
    }
  }
}

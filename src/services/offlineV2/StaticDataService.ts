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
import { UnifiedLogger } from "@/src/services/logger/UnifiedLogger";
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
  private static versionCheckInProgress: Record<
    "ingredients" | "beer_styles",
    boolean
  > = {
    ingredients: false,
    beer_styles: false,
  };
  private static lastVersionCheck: Record<
    "ingredients" | "beer_styles",
    number
  > = {
    ingredients: 0,
    beer_styles: 0,
  };
  private static readonly VERSION_CHECK_COOLDOWN = 30000; // 30 seconds

  // ============================================================================
  // Core Data Access Methods
  // ============================================================================

  /**
   * Get all ingredients with optional filtering
   */
  static async getIngredients(filters?: {
    type?: Ingredient["type"];
    search?: string;
    category?: string;
  }): Promise<Ingredient[]> {
    try {
      // Try to get from cache first
      const cached = await this.getCachedIngredients();

      if (cached && cached.data) {
        // Apply filters using helper method
        const filtered = this.applyIngredientFilters(cached.data, filters);

        // Background version check (don't wait for it)
        this.backgroundVersionCheck("ingredients");

        return filtered;
      }

      // No cache, fetch fresh data
      const freshData = await this.fetchAndCacheIngredients();
      return this.applyIngredientFilters(freshData, filters);
    } catch (error) {
      UnifiedLogger.error(
        "offline-static",
        "Error getting ingredients:",
        error
      );
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
        // Apply filters using helper method
        const filtered = this.applyBeerStyleFilters(cached.data, filters);

        // Background version check (don't wait for it)
        this.backgroundVersionCheck("beer_styles");

        return filtered;
      }

      // No cache, fetch fresh data
      const freshData = await this.fetchAndCacheBeerStyles();
      return this.applyBeerStyleFilters(freshData, filters);
    } catch (error) {
      UnifiedLogger.error(
        "offline-static",
        "Error getting beer styles:",
        error
      );
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
          String(cachedIngredients) !== String(ingredientsVersion.version),
        beerStyles:
          !cachedBeerStyles ||
          String(cachedBeerStyles) !== String(beerStylesVersion.version),
      };
    } catch (error) {
      UnifiedLogger.warn(
        "offline-static",
        "Failed to check for updates:",
        error
      );
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
      UnifiedLogger.error(
        "offline-static",
        "Failed to update ingredients cache:",
        error
      );
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
      UnifiedLogger.error(
        "offline-static",
        "Failed to update beer styles cache:",
        error
      );
      throw new VersionError(
        "Failed to update beer styles cache",
        "beer_styles"
      );
    }
  }

  /**
   * Force refresh ingredients after user authentication
   * This is useful when the user logs in and we need to fetch ingredients
   * that were previously unavailable due to auth requirements
   */
  static async refreshIngredientsAfterAuth(): Promise<void> {
    try {
      await this.fetchAndCacheIngredients();
    } catch (error) {
      UnifiedLogger.warn(
        "offline-static",
        "Failed to refresh ingredients after authentication:",
        error
      );
      // Don't throw here, as this is a background operation
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
      UnifiedLogger.error("offline-static", "Failed to clear cache:", error);
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
      UnifiedLogger.error(
        "offline-static",
        "Failed to get cache stats:",
        error
      );
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
      // Get version first (doesn't require auth)
      const versionResponse = await ApiService.ingredients.getVersion();

      // Try to get data - this requires authentication
      let dataResponse;
      try {
        dataResponse = await ApiService.ingredients.getAll();
      } catch (authError: any) {
        // If we get a 401/403 error, it means user is not authenticated
        // In this case, we can't fetch ingredients, so return empty array
        // but still cache the version info for when user logs in
        if (authError?.status === 401 || authError?.status === 403) {
          UnifiedLogger.warn(
            "offline-static",
            "Cannot fetch ingredients: user not authenticated. Ingredients will be available after login."
          );

          // Cache empty data with version for now
          const version = versionResponse.data.version;
          const cachedData: CachedStaticData<Ingredient> = {
            data: [],
            version,
            cached_at: Date.now(),
            expires_never: true,
          };

          await AsyncStorage.multiSet([
            [STORAGE_KEYS_V2.INGREDIENTS_DATA, JSON.stringify(cachedData)],
            [STORAGE_KEYS_V2.INGREDIENTS_VERSION, String(version)],
          ]);

          return [];
        }
        // Re-throw non-auth errors
        throw authError;
      }

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

      await AsyncStorage.multiSet([
        [STORAGE_KEYS_V2.INGREDIENTS_DATA, JSON.stringify(cachedData)],
        [STORAGE_KEYS_V2.INGREDIENTS_VERSION, String(version)],
      ]);

      return ingredients;
    } catch (error) {
      UnifiedLogger.error(
        "offline-static",
        "Failed to fetch ingredients:",
        error
      );
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
      if (__DEV__) {
        UnifiedLogger.debug(
          "offline-static",
          `[StaticDataService.fetchAndCacheBeerStyles] Starting fetch...`
        );
      }

      // Get version and data
      const [versionResponse, dataResponse] = await Promise.all([
        ApiService.beerStyles.getVersion(),
        ApiService.beerStyles.getAll(),
      ]);

      if (__DEV__) {
        UnifiedLogger.debug(
          "offline-static",
          `[StaticDataService.fetchAndCacheBeerStyles] API responses received - version: ${versionResponse?.data?.version}`
        );
      }

      let beerStylesData = dataResponse.data?.categories || dataResponse.data;

      // Handle different response formats
      let allStyles: BeerStyle[] = [];

      if (Array.isArray(beerStylesData)) {
        // If it's already an array, process normally
        UnifiedLogger.debug(
          "offline-static",
          `[StaticDataService.fetchAndCacheBeerStyles] Processing array format with ${beerStylesData.length} items`
        );
        beerStylesData.forEach((item: any) => {
          if (Array.isArray(item?.styles)) {
            // Item is a category with styles array
            const catName = item.name ?? item.category;
            allStyles.push(
              ...item.styles.map((s: any) => this.mapStyleWithId(s, catName))
            );
          } else {
            // Item is already a style
            allStyles.push(this.mapStyleWithId(item));
          }
        });
      } else if (
        typeof beerStylesData === "object" &&
        beerStylesData !== null
      ) {
        // If it's an object with numeric keys (like "1", "2", etc.), convert to array
        if (__DEV__) {
          UnifiedLogger.debug(
            "offline-static",
            `[StaticDataService.fetchAndCacheBeerStyles] Processing object format with keys: ${Object.keys(beerStylesData).length}`
          );
        }
        const categories = Object.values(beerStylesData);
        categories.forEach((category: any) => {
          if (Array.isArray(category?.styles)) {
            const catName = category.name ?? category.category;
            allStyles.push(
              ...category.styles.map((s: any) =>
                this.mapStyleWithId(s, catName)
              )
            );
          }
        });
      } else {
        UnifiedLogger.error(
          "offline-static",
          `[StaticDataService.fetchAndCacheBeerStyles] Unexpected data format:`,
          { type: typeof beerStylesData, data: beerStylesData }
        );
        throw new OfflineError(
          "Beer styles data is not in expected format",
          "INVALID_DATA_FORMAT"
        );
      }

      // Cache the data
      const version = versionResponse.data.version;
      const cachedData: CachedStaticData<BeerStyle> = {
        data: allStyles,
        version,
        cached_at: Date.now(),
        expires_never: true,
      };

      await AsyncStorage.multiSet([
        [STORAGE_KEYS_V2.BEER_STYLES_DATA, JSON.stringify(cachedData)],
        [STORAGE_KEYS_V2.BEER_STYLES_VERSION, String(version)],
      ]);

      return allStyles;
    } catch (error) {
      UnifiedLogger.error(
        "offline-static",
        "Failed to fetch beer styles:",
        error
      );
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
      UnifiedLogger.error(
        "offline-static",
        "Failed to get cached ingredients:",
        error
      );
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
      UnifiedLogger.error(
        "offline-static",
        "Failed to get cached beer styles:",
        error
      );
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
      UnifiedLogger.error(
        "offline-static",
        `Failed to get cached version for ${dataType}:`,
        error
      );
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
      this.versionCheckInProgress[dataType] ||
      now - this.lastVersionCheck[dataType] < this.VERSION_CHECK_COOLDOWN
    ) {
      return;
    }

    this.versionCheckInProgress[dataType] = true;
    this.lastVersionCheck[dataType] = now;

    try {
      // Get version using ApiService
      const versionResponse =
        dataType === "ingredients"
          ? await ApiService.ingredients.getVersion()
          : await ApiService.beerStyles.getVersion();

      const cachedVersion = await this.getCachedVersion(dataType);

      // If version differs, update cache in background
      if (String(cachedVersion) !== String(versionResponse.data.version)) {
        try {
          if (dataType === "ingredients") {
            await this.fetchAndCacheIngredients();
          } else {
            await this.fetchAndCacheBeerStyles();
          }
        } catch (error: any) {
          // For background version checks, if ingredients fail due to auth,
          // just log a warning and continue - don't throw error
          if (
            dataType === "ingredients" &&
            (error?.status === 401 || error?.status === 403)
          ) {
            UnifiedLogger.warn(
              "offline-static",
              "Background ingredients update failed: authentication required"
            );
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      // Silent fail for background checks
      UnifiedLogger.warn(
        "offline-static",
        `Background version check failed for ${dataType}:`,
        error
      );
    } finally {
      this.versionCheckInProgress[dataType] = false;
    }
  }

  // ============================================================================
  // Style Mapping Helper
  // ============================================================================

  /**
   * Map a style object with validated ID and category
   * Throws OfflineError if no valid ID found
   */
  private static mapStyleWithId(style: any, categoryName?: string): BeerStyle {
    const id = style.id || style.style_guide_id || style._id;
    const styleId = style.style_id || style.style_guide_id || id;

    if (!id) {
      throw new OfflineError(
        `Beer style missing required ID fields: ${JSON.stringify(style)}`,
        "MISSING_STYLE_ID"
      );
    }

    return {
      ...style,
      id,
      style_id: styleId,
      category: style?.category ?? categoryName,
    };
  }

  // ============================================================================
  // Filter Helper Methods
  // ============================================================================

  /**
   * Apply filters to ingredients data
   */
  private static applyIngredientFilters(
    data: Ingredient[],
    filters?: {
      type?: Ingredient["type"];
      category?: string;
      search?: string;
    }
  ): Ingredient[] {
    if (!filters) {
      return data;
    }

    let filtered = data;

    if (filters.type) {
      filtered = filtered.filter(ing => ing.type === filters.type);
    }

    if (filters.search) {
      const searchLower = filters.search.trim().toLowerCase();
      filtered = filtered.filter(
        ing =>
          ing.name.toLowerCase().includes(searchLower) ||
          (ing.description ?? "").toLowerCase().includes(searchLower)
      );
    }

    if (filters.category) {
      filtered = filtered.filter(ing => {
        if (filters.type === "grain") {
          return ing.grain_type === filters.category;
        }
        if (filters.type === "yeast") {
          return ing.yeast_type === filters.category;
        }
        if (filters.type === "hop") {
          return ing.hop_type === filters.category;
        }
        return true;
      });
    }

    return filtered;
  }

  /**
   * Apply filters to beer styles data
   */
  private static applyBeerStyleFilters(
    data: BeerStyle[],
    filters?: {
      category?: string;
      search?: string;
    }
  ): BeerStyle[] {
    if (!filters) {
      return data;
    }

    let filtered = data;

    if (filters.category) {
      filtered = filtered.filter(style => style.category === filters.category);
    }

    if (filters.search) {
      const searchLower = filters.search.trim().toLowerCase(); // avoids misses due to leading/trailing spaces.

      filtered = filtered.filter(
        style =>
          style.name.toLowerCase().includes(searchLower) ||
          (style.description ?? "").toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }
}

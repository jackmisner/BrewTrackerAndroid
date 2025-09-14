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
import { IngredientType, RecipeIngredient } from "@src/types";
import { BeerStyleOption } from "@src/hooks/useBeerStyles";

// Cache metadata interface
interface CacheMetadata {
  version: number;
  lastUpdated: number;
  dataSize: number;
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

interface CachedData {
  ingredients: CachedIngredients;
  beerStyles: CachedBeerStyles;
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

    // Fetch ingredients by type
    let progressStep = 40;
    const progressIncrement = 50 / this.INGREDIENT_TYPES.length;

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

    // Calculate data size
    // Calculate data size
    const dataString = JSON.stringify(cachedData);
    cachedData.metadata.dataSize = dataString.length;

    // Check if data size exceeds reasonable limit (e.g., 10MB)
    const MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10MB
    if (cachedData.metadata.dataSize > MAX_CACHE_SIZE) {
      console.warn(
        `Cache size (${cachedData.metadata.dataSize} bytes) exceeds limit`
      );
      // Consider implementing data pruning or compression
    }

    reportProgress?.("save", "Saving cache...", 95);

    // Save to AsyncStorage with error handling
    try {
      await AsyncStorage.setItem(this.CACHE_KEY, dataString);
      console.log(`Cache saved: ${cachedData.metadata.dataSize} bytes`);
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

      console.log("Starting background cache refresh...");
      await this.fetchAndCacheData();
      console.log("Background cache refresh completed");
    } catch (error) {
      console.error("Background cache refresh failed:", error);
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
  }> {
    const cachedData = await this.loadCachedData();
    const isValid = await this.isCacheValid(cachedData);

    return {
      isValid,
      lastUpdated: cachedData?.metadata.lastUpdated
        ? new Date(cachedData.metadata.lastUpdated)
        : null,
      dataSize: cachedData?.metadata.dataSize || 0,
      version: cachedData?.metadata.version || 0,
    };
  }

  /**
   * Clear cached data
   */
  static async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(this.CACHE_KEY);
  }
}

export default OfflineCacheService;

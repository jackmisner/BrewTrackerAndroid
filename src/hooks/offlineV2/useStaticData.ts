/**
 * useStaticData Hook - BrewTracker Offline V2
 *
 * React hook for accessing cached ingredients and beer styles with automatic
 * version management and background updates.
 *
 * Features:
 * - Immediate cache response with background updates
 * - Version-based cache invalidation
 * - Loading states and error handling
 * - Cache statistics and refresh capability
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { StaticDataService } from "@services/offlineV2/StaticDataService";
import {
  UseStaticDataReturn,
  StaticDataCacheStats,
  Ingredient,
  BeerStyle,
} from "@src/types";

/**
 * Hook for accessing ingredients with filtering
 */
export function useIngredients(filters?: {
  type?: Ingredient["type"];
  search?: string;
  category?: string;
}): UseStaticDataReturn<Ingredient> {
  const [data, setData] = useState<Ingredient[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StaticDataCacheStats["ingredients"]>({
    cached: false,
    version: null,
    record_count: 0,
    last_updated: null,
  });

  // Memoize filters to prevent infinite re-renders
  // Use JSON.stringify for stable comparison of filter object contents
  const filtersKey = JSON.stringify(filters);
  /* eslint-disable react-hooks/exhaustive-deps */
  const memoizedFilters = useMemo(() => filters, [filtersKey]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const loadData = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setIsLoading(true);
        }
        setError(null);

        const ingredients =
          await StaticDataService.getIngredients(memoizedFilters);
        setData(ingredients);

        // Get updated stats
        const cacheStats = await StaticDataService.getCacheStats();
        setStats(cacheStats.ingredients);
      } catch (err) {
        console.error("Error loading ingredients:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load ingredients"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [memoizedFilters]
  );

  const refresh = useCallback(async () => {
    try {
      await StaticDataService.updateIngredientsCache();
      await loadData(false); // Reload without showing loading state
    } catch (err) {
      console.error("Error refreshing ingredients:", err);
      setError(
        err instanceof Error ? err.message : "Failed to refresh ingredients"
      );
    }
  }, [loadData]);

  // Load data on mount and when filters change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check if data is stale (could be improved with more sophisticated logic)
  const isStale = stats.last_updated
    ? Date.now() - stats.last_updated > 24 * 60 * 60 * 1000 // 24 hours
    : false;

  return {
    data,
    isLoading,
    error,
    isStale,
    lastUpdated: stats.last_updated,
    refresh,
    stats,
  };
}

/**
 * Hook for accessing beer styles with filtering
 */
export function useBeerStyles(filters?: {
  category?: string;
  search?: string;
}): UseStaticDataReturn<BeerStyle> {
  const [data, setData] = useState<BeerStyle[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StaticDataCacheStats["beerStyles"]>({
    cached: false,
    version: null,
    record_count: 0,
    last_updated: null,
  });

  // Memoize filters to prevent infinite re-renders
  // Use JSON.stringify for stable comparison of filter object contents
  const filtersKey = JSON.stringify(filters);
  /* eslint-disable react-hooks/exhaustive-deps */
  const memoizedFilters = useMemo(() => filters, [filtersKey]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const loadData = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setIsLoading(true);
        }
        setError(null);

        const beerStyles =
          await StaticDataService.getBeerStyles(memoizedFilters);
        setData(beerStyles);

        // Get updated stats
        const cacheStats = await StaticDataService.getCacheStats();
        setStats(cacheStats.beerStyles);
      } catch (err) {
        console.error("Error loading beer styles:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load beer styles"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [memoizedFilters]
  );

  const refresh = useCallback(async () => {
    try {
      await StaticDataService.updateBeerStylesCache();
      await loadData(false); // Reload without showing loading state
    } catch (err) {
      console.error("Error refreshing beer styles:", err);
      setError(
        err instanceof Error ? err.message : "Failed to refresh beer styles"
      );
    }
  }, [loadData]);

  // Load data on mount and when filters change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check if data is stale
  const isStale = stats.last_updated
    ? Date.now() - stats.last_updated > 24 * 60 * 60 * 1000 // 24 hours
    : false;

  return {
    data,
    isLoading,
    error,
    isStale,
    lastUpdated: stats.last_updated,
    refresh,
    stats,
  };
}

/**
 * Hook for managing static data cache
 */
export function useStaticDataCache() {
  const [stats, setStats] = useState<StaticDataCacheStats | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const cacheStats = await StaticDataService.getCacheStats();
      setStats(cacheStats);
    } catch (err) {
      console.error("Error loading cache stats:", err);
    }
  }, []);

  const checkForUpdates = useCallback(async () => {
    try {
      setIsChecking(true);
      const updates = await StaticDataService.checkForUpdates();

      // Update caches if needed
      if (updates.ingredients) {
        await StaticDataService.updateIngredientsCache();
      }

      if (updates.beerStyles) {
        await StaticDataService.updateBeerStylesCache();
      }

      // Reload stats
      await loadStats();

      return updates;
    } catch (err) {
      console.error("Error checking for updates:", err);
      throw err;
    } finally {
      setIsChecking(false);
    }
  }, [loadStats]);

  const clearCache = useCallback(async () => {
    try {
      setIsClearing(true);
      await StaticDataService.clearCache();
      await loadStats();
    } catch (err) {
      console.error("Error clearing cache:", err);
      throw err;
    } finally {
      setIsClearing(false);
    }
  }, [loadStats]);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    isChecking,
    isClearing,
    checkForUpdates,
    clearCache,
    refresh: loadStats,
  };
}

/**
 * Combined hook for both ingredients and beer styles
 */
export function useStaticData(
  options: {
    ingredients?: {
      enabled?: boolean;
      filters?: {
        type?: Ingredient["type"];
        search?: string;
        category?: string;
      };
    };
    beerStyles?: {
      enabled?: boolean;
      filters?: {
        category?: string;
        search?: string;
      };
    };
  } = {}
) {
  const ingredients = useIngredients(
    options.ingredients?.enabled !== false
      ? options.ingredients?.filters
      : undefined
  );

  const beerStyles = useBeerStyles(
    options.beerStyles?.enabled !== false
      ? options.beerStyles?.filters
      : undefined
  );

  const cache = useStaticDataCache();

  return {
    ingredients: options.ingredients?.enabled !== false ? ingredients : null,
    beerStyles: options.beerStyles?.enabled !== false ? beerStyles : null,
    cache,
    isLoading:
      (options.ingredients?.enabled !== false && ingredients.isLoading) ||
      (options.beerStyles?.enabled !== false && beerStyles.isLoading),
    hasError: !!(ingredients.error || beerStyles.error),
    errors: [ingredients.error, beerStyles.error].filter(Boolean),
  };
}

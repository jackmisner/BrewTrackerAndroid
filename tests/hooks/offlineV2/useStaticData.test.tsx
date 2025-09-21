/**
 * useStaticData Hook Test Suite
 * Tests for React hooks that manage static data with offline capabilities.
 */

import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useIngredients,
  useBeerStyles,
  useStaticDataCache,
  useStaticData,
} from "@hooks/offlineV2/useStaticData";
import { StaticDataService } from "@services/offlineV2/StaticDataService";
import { Ingredient, BeerStyle } from "@src/types";

// Mock StaticDataService
jest.mock("@services/offlineV2/StaticDataService", () => ({
  StaticDataService: {
    getIngredients: jest.fn(),
    getBeerStyles: jest.fn(),
    getCacheStats: jest.fn(),
    updateIngredientsCache: jest.fn(),
    updateBeerStylesCache: jest.fn(),
    checkForUpdates: jest.fn(),
    clearCache: jest.fn(),
  },
}));

// Mock React Native Appearance more specifically
jest.mock("react-native/Libraries/Utilities/Appearance", () => ({
  getColorScheme: jest.fn(() => "light"),
  addChangeListener: jest.fn(),
  removeChangeListener: jest.fn(),
}));

describe("useStaticData hooks", () => {
  const mockStaticDataService = StaticDataService as jest.Mocked<
    typeof StaticDataService
  >;

  const mockIngredients: Ingredient[] = [
    {
      id: "1",
      name: "Pale Malt",
      type: "grain",
      grain_type: "base_malt",
      potential: 1.037,
      color: 2,
    },
    {
      id: "2",
      name: "Cascade",
      type: "hop",
      alpha_acid: 5.5,
    },
  ];

  const mockBeerStyles: BeerStyle[] = [
    {
      id: "1",
      style_id: "21A",
      name: "American IPA",
      category: "IPA",
      description: "A hoppy American ale",
    },
  ];

  const mockCacheStats = {
    ingredients: {
      cached: true,
      version: "v1.0.0",
      record_count: 2,
      last_updated: 1640995200000,
    },
    beerStyles: {
      cached: true,
      version: "v1.0.0",
      record_count: 1,
      last_updated: 1640995200000,
    },
  };

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("useIngredients", () => {
    it("should load ingredients successfully", async () => {
      mockStaticDataService.getIngredients.mockResolvedValue(mockIngredients);
      mockStaticDataService.getCacheStats.mockResolvedValue(mockCacheStats);

      const { result } = renderHook(() => useIngredients(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockIngredients);
      expect(result.current.error).toBeNull();
      expect(mockStaticDataService.getIngredients).toHaveBeenCalledWith(
        undefined
      );
    });

    it("should apply filters when provided", async () => {
      mockStaticDataService.getIngredients.mockResolvedValue(mockIngredients);
      mockStaticDataService.getCacheStats.mockResolvedValue(mockCacheStats);

      const filters = { type: "grain" as const, search: "pale" };
      const { result } = renderHook(() => useIngredients(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockStaticDataService.getIngredients).toHaveBeenCalledWith(
        filters
      );
    });

    it("should handle loading error", async () => {
      const errorMessage = "Failed to load ingredients";
      mockStaticDataService.getIngredients.mockRejectedValue(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useIngredients(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe(errorMessage);
    });

    it("should calculate isStale correctly", async () => {
      const staleStats = {
        ...mockCacheStats,
        ingredients: {
          ...mockCacheStats.ingredients,
          last_updated: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        },
      };

      mockStaticDataService.getIngredients.mockResolvedValue(mockIngredients);
      mockStaticDataService.getCacheStats.mockResolvedValue(staleStats);

      const { result } = renderHook(() => useIngredients(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isStale).toBe(true);
    });

    it("should refresh ingredients cache", async () => {
      mockStaticDataService.getIngredients.mockResolvedValue(mockIngredients);
      mockStaticDataService.getCacheStats.mockResolvedValue(mockCacheStats);
      mockStaticDataService.updateIngredientsCache.mockResolvedValue();

      const { result } = renderHook(() => useIngredients(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.refresh();

      expect(mockStaticDataService.updateIngredientsCache).toHaveBeenCalled();
    });

    it("should handle refresh error", async () => {
      mockStaticDataService.getIngredients.mockResolvedValue(mockIngredients);
      mockStaticDataService.getCacheStats.mockResolvedValue(mockCacheStats);
      mockStaticDataService.updateIngredientsCache.mockRejectedValue(
        new Error("Refresh failed")
      );

      const { result } = renderHook(() => useIngredients(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.refresh();

      await waitFor(() => {
        expect(result.current.error).toBe("Refresh failed");
      });
    });
  });

  describe("useBeerStyles", () => {
    it("should load beer styles successfully", async () => {
      mockStaticDataService.getBeerStyles.mockResolvedValue(mockBeerStyles);
      mockStaticDataService.getCacheStats.mockResolvedValue(mockCacheStats);

      const { result } = renderHook(() => useBeerStyles(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockBeerStyles);
      expect(result.current.error).toBeNull();
      expect(mockStaticDataService.getBeerStyles).toHaveBeenCalledWith(
        undefined
      );
    });

    it("should apply filters when provided", async () => {
      mockStaticDataService.getBeerStyles.mockResolvedValue(mockBeerStyles);
      mockStaticDataService.getCacheStats.mockResolvedValue(mockCacheStats);

      const filters = { category: "IPA", search: "american" };
      const { result } = renderHook(() => useBeerStyles(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockStaticDataService.getBeerStyles).toHaveBeenCalledWith(filters);
    });

    it("should refresh beer styles cache", async () => {
      mockStaticDataService.getBeerStyles.mockResolvedValue(mockBeerStyles);
      mockStaticDataService.getCacheStats.mockResolvedValue(mockCacheStats);
      mockStaticDataService.updateBeerStylesCache.mockResolvedValue();

      const { result } = renderHook(() => useBeerStyles(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.refresh();

      expect(mockStaticDataService.updateBeerStylesCache).toHaveBeenCalled();
    });
  });

  describe("useStaticDataCache", () => {
    it("should load cache stats", async () => {
      mockStaticDataService.getCacheStats.mockResolvedValue(mockCacheStats);

      const { result } = renderHook(() => useStaticDataCache(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.stats).toEqual(mockCacheStats);
      });

      expect(mockStaticDataService.getCacheStats).toHaveBeenCalled();
    });

    it("should check for updates", async () => {
      mockStaticDataService.getCacheStats.mockResolvedValue(mockCacheStats);
      mockStaticDataService.checkForUpdates.mockResolvedValue({
        ingredients: true,
        beerStyles: false,
      });
      mockStaticDataService.updateIngredientsCache.mockResolvedValue();

      const { result } = renderHook(() => useStaticDataCache(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.stats).toBeDefined();
      });

      expect(result.current.isChecking).toBe(false);

      const updates = await result.current.checkForUpdates();

      expect(updates.ingredients).toBe(true);
      expect(updates.beerStyles).toBe(false);
      expect(mockStaticDataService.updateIngredientsCache).toHaveBeenCalled();
      expect(
        mockStaticDataService.updateBeerStylesCache
      ).not.toHaveBeenCalled();
    });

    it("should clear cache", async () => {
      mockStaticDataService.getCacheStats.mockResolvedValue(mockCacheStats);
      mockStaticDataService.clearCache.mockResolvedValue();

      const { result } = renderHook(() => useStaticDataCache(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.stats).toBeDefined();
      });

      expect(result.current.isClearing).toBe(false);

      await result.current.clearCache();

      expect(mockStaticDataService.clearCache).toHaveBeenCalled();
    });

    it("should handle check for updates error", async () => {
      mockStaticDataService.getCacheStats.mockResolvedValue(mockCacheStats);
      mockStaticDataService.checkForUpdates.mockRejectedValue(
        new Error("Update check failed")
      );

      const { result } = renderHook(() => useStaticDataCache(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.stats).toBeDefined();
      });

      await expect(result.current.checkForUpdates()).rejects.toThrow(
        "Update check failed"
      );
    });

    it("should handle clear cache error", async () => {
      mockStaticDataService.getCacheStats.mockResolvedValue(mockCacheStats);
      mockStaticDataService.clearCache.mockRejectedValue(
        new Error("Clear cache failed")
      );

      const { result } = renderHook(() => useStaticDataCache(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.stats).toBeDefined();
      });

      await expect(result.current.clearCache()).rejects.toThrow(
        "Clear cache failed"
      );
    });
  });

  describe("useStaticData (combined hook)", () => {
    it("should load both ingredients and beer styles by default", async () => {
      mockStaticDataService.getIngredients.mockResolvedValue(mockIngredients);
      mockStaticDataService.getBeerStyles.mockResolvedValue(mockBeerStyles);
      mockStaticDataService.getCacheStats.mockResolvedValue(mockCacheStats);

      const { result } = renderHook(() => useStaticData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.ingredients?.data).toEqual(mockIngredients);
      expect(result.current.beerStyles?.data).toEqual(mockBeerStyles);
      expect(result.current.cache.stats).toEqual(mockCacheStats);
    });

    it("should disable ingredients when enabled is false", async () => {
      mockStaticDataService.getBeerStyles.mockResolvedValue(mockBeerStyles);
      mockStaticDataService.getCacheStats.mockResolvedValue(mockCacheStats);

      const { result } = renderHook(
        () =>
          useStaticData({
            ingredients: { enabled: false },
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.ingredients).toBeNull();
      expect(result.current.beerStyles?.data).toEqual(mockBeerStyles);
    });

    it("should disable beer styles when enabled is false", async () => {
      mockStaticDataService.getIngredients.mockResolvedValue(mockIngredients);
      mockStaticDataService.getCacheStats.mockResolvedValue(mockCacheStats);

      const { result } = renderHook(
        () =>
          useStaticData({
            beerStyles: { enabled: false },
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.ingredients?.data).toEqual(mockIngredients);
      expect(result.current.beerStyles).toBeNull();
    });

    it("should apply filters to ingredients and beer styles", async () => {
      mockStaticDataService.getIngredients.mockResolvedValue(mockIngredients);
      mockStaticDataService.getBeerStyles.mockResolvedValue(mockBeerStyles);
      mockStaticDataService.getCacheStats.mockResolvedValue(mockCacheStats);

      const options = {
        ingredients: {
          filters: { type: "grain" as const },
        },
        beerStyles: {
          filters: { category: "IPA" },
        },
      };

      renderHook(() => useStaticData(options), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockStaticDataService.getIngredients).toHaveBeenCalledWith({
          type: "grain",
        });
      });

      expect(mockStaticDataService.getBeerStyles).toHaveBeenCalledWith({
        category: "IPA",
      });
    });

    it("should calculate combined loading state", async () => {
      mockStaticDataService.getIngredients.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      mockStaticDataService.getBeerStyles.mockResolvedValue(mockBeerStyles);
      mockStaticDataService.getCacheStats.mockResolvedValue(mockCacheStats);

      const { result } = renderHook(() => useStaticData(), {
        wrapper: createWrapper(),
      });

      // Should be loading because ingredients is still loading
      expect(result.current.isLoading).toBe(true);
    });

    it("should calculate combined error state", async () => {
      mockStaticDataService.getIngredients.mockRejectedValue(
        new Error("Ingredients error")
      );
      mockStaticDataService.getBeerStyles.mockRejectedValue(
        new Error("Beer styles error")
      );

      const { result } = renderHook(() => useStaticData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasError).toBe(true);
      expect(result.current.errors).toHaveLength(2);
      expect(result.current.errors).toContain("Ingredients error");
      expect(result.current.errors).toContain("Beer styles error");
    });
  });
});

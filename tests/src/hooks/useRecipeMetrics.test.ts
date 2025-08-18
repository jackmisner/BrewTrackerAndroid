import { renderHook, waitFor, act } from "@testing-library/react-native";
import React from "react";

// Mock the API service before importing anything that uses it
jest.mock("@services/api/apiService", () => ({
  __esModule: true,
  default: {
    recipes: {
      calculateMetricsPreview: jest.fn(),
    },
  },
}));

// Clear the global React Query mock and import the actual implementation
jest.unmock("@tanstack/react-query");

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRecipeMetrics } from "@src/hooks/useRecipeMetrics";
import { RecipeFormData, RecipeMetrics, RecipeIngredient } from "@src/types";
import ApiService from "@services/api/apiService";

const mockedApiService = jest.mocked(ApiService);

// Helper to create mock AxiosResponse
const createMockAxiosResponse = <T>(data: T) => ({
  data,
  status: 200,
  statusText: "OK",
  headers: {},
  config: {} as any,
});

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

// Mock recipe ingredient factory
const createMockIngredient = (
  overrides: Partial<RecipeIngredient> = {}
): RecipeIngredient => ({
  id: "ing-1",
  name: "Test Ingredient",
  type: "grain",
  amount: 10,
  unit: "lb",
  potential: 1.036,
  color: 2,
  ...overrides,
});

// Mock recipe form data factory
const createMockRecipeData = (
  overrides: Partial<RecipeFormData> = {}
): RecipeFormData => ({
  name: "Test Recipe",
  style: "American IPA",
  description: "Test description",
  batch_size: 5,
  batch_size_unit: "gal",
  unit_system: "imperial",
  boil_time: 60,
  efficiency: 75,
  mash_temperature: 152,
  mash_temp_unit: "F",
  is_public: false,
  notes: "",
  ingredients: [createMockIngredient()],
  ...overrides,
});

describe("useRecipeMetrics - Essential Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("should not enable query when no ingredients exist", () => {
    const recipeDataWithoutIngredients = createMockRecipeData({
      ingredients: [],
    });

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(
      () => useRecipeMetrics(recipeDataWithoutIngredients),
      { wrapper }
    );

    // Should remain disabled
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(
      mockedApiService.recipes.calculateMetricsPreview
    ).not.toHaveBeenCalled();
  });

  it("should not enable query when batch_size is zero", () => {
    const recipeDataWithZeroBatchSize = createMockRecipeData({ batch_size: 0 });

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(
      () => useRecipeMetrics(recipeDataWithZeroBatchSize),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(
      mockedApiService.recipes.calculateMetricsPreview
    ).not.toHaveBeenCalled();
  });

  it("should respect explicit enabled parameter", () => {
    const mockRecipeData = createMockRecipeData();

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(
      () => useRecipeMetrics(mockRecipeData, false),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(
      mockedApiService.recipes.calculateMetricsPreview
    ).not.toHaveBeenCalled();
  });

  it("should filter out NaN and invalid numeric values", async () => {
    const mockRecipeData = createMockRecipeData();
    const mockMetricsResponse = {
      data: {
        og: 1.055,
        fg: NaN,
        abv: "invalid", // Should be filtered out
        ibu: 45,
        srm: null, // Should be filtered out
      } as any,
    };

    mockedApiService.recipes.calculateMetricsPreview.mockResolvedValue(
      createMockAxiosResponse(mockMetricsResponse.data)
    );

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useRecipeMetrics(mockRecipeData), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      og: 1.055,
      fg: undefined, // NaN filtered out
      abv: undefined, // Invalid string filtered out
      ibu: 45,
      srm: undefined, // Null filtered out
    });
  });

  it("should handle empty metrics response gracefully", async () => {
    const mockRecipeData = createMockRecipeData();
    const mockMetricsResponse = {
      data: {} as RecipeMetrics,
    };

    mockedApiService.recipes.calculateMetricsPreview.mockResolvedValue(
      createMockAxiosResponse(mockMetricsResponse.data)
    );

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useRecipeMetrics(mockRecipeData), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      og: undefined,
      fg: undefined,
      abv: undefined,
      ibu: undefined,
      srm: undefined,
    });
  });

  it("should handle API validation errors without retries", async () => {
    const mockRecipeData = createMockRecipeData();
    const validationError = {
      response: { status: 400 },
      message: "Invalid recipe data",
    };
    mockedApiService.recipes.calculateMetricsPreview.mockRejectedValue(
      validationError
    );

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useRecipeMetrics(mockRecipeData), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(validationError);
    expect(result.current.data).toBeUndefined();
    // Should only be called once (no retries for 400 errors)
    expect(
      mockedApiService.recipes.calculateMetricsPreview
    ).toHaveBeenCalledTimes(1);
  });

  it("should retry network errors up to 2 times", async () => {
    jest.useFakeTimers();
    
    try {
      const mockRecipeData = createMockRecipeData();
      const networkError = {
        response: { status: 500 },
        message: "Network error",
      };
      mockedApiService.recipes.calculateMetricsPreview.mockRejectedValue(
        networkError
      );

      const wrapper = createWrapper(queryClient);
      renderHook(() => useRecipeMetrics(mockRecipeData), {
        wrapper,
      });

      // Wait for initial query to complete
      await act(async () => {
        jest.runOnlyPendingTimers();
      });

      // Initial call should happen
      expect(
        mockedApiService.recipes.calculateMetricsPreview
      ).toHaveBeenCalledTimes(1);

      // Advance timers for first retry (1000ms delay)
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(
        mockedApiService.recipes.calculateMetricsPreview
      ).toHaveBeenCalledTimes(2);

      // Advance timers for second retry (2000ms delay) 
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(
        mockedApiService.recipes.calculateMetricsPreview
      ).toHaveBeenCalledTimes(3);

      // Run remaining timers to complete retries
      await act(async () => {
        jest.runAllTimers();
      });
    } finally {
      jest.useRealTimers();
    }
  });



  it("should handle complex recipe data with all ingredient types", async () => {
    const complexRecipeData = createMockRecipeData({
      ingredients: [
        // Grain
        createMockIngredient({
          id: "grain-1",
          name: "Pale Ale Malt",
          type: "grain",
          amount: 9,
          unit: "lb",
          potential: 1.036,
          color: 2,
        }),
        // Hops
        createMockIngredient({
          id: "hop-1",
          name: "Cascade",
          type: "hop",
          amount: 1,
          unit: "oz",
          alpha_acid: 5.5,
          use: "boil",
          time: 60,
        }),
        // Yeast
        createMockIngredient({
          id: "yeast-1",
          name: "American Ale Yeast",
          type: "yeast",
          amount: 1,
          unit: "pkg",
          attenuation: 75,
        }),
        // Other
        createMockIngredient({
          id: "other-1",
          name: "Irish Moss",
          type: "other",
          amount: 1,
          unit: "tsp",
        }),
      ],
    });

    const mockMetricsResponse = {
      data: {
        og: 1.058,
        fg: 1.015,
        abv: 5.7,
        ibu: 38,
        srm: 12,
      } as RecipeMetrics,
    };

    mockedApiService.recipes.calculateMetricsPreview.mockResolvedValue(
      createMockAxiosResponse(mockMetricsResponse.data)
    );

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useRecipeMetrics(complexRecipeData), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      og: 1.058,
      fg: 1.015,
      abv: 5.7,
      ibu: 38,
      srm: 12,
    });

    // Verify API was called with correct data structure
    expect(
      mockedApiService.recipes.calculateMetricsPreview
    ).toHaveBeenCalledWith({
      batch_size: complexRecipeData.batch_size,
      batch_size_unit: complexRecipeData.batch_size_unit,
      efficiency: complexRecipeData.efficiency,
      boil_time: complexRecipeData.boil_time,
      ingredients: complexRecipeData.ingredients,
      mash_temperature: complexRecipeData.mash_temperature,
      mash_temp_unit: complexRecipeData.mash_temp_unit,
    });
  });

  it("should create correct query key with recipe parameters", async () => {
    const mockRecipeData = createMockRecipeData({
      batch_size: 5.5,
      batch_size_unit: "gal",
      efficiency: 72,
      boil_time: 90,
      mash_temperature: 154,
      mash_temp_unit: "F",
      ingredients: [
        createMockIngredient({
          id: "grain-1",
          name: "Pale Ale Malt",
          type: "grain",
          amount: 10,
          unit: "lb",
          potential: 1.036,
        }),
      ],
    });

    const mockMetricsResponse = {
      data: {
        og: 1.055,
        fg: 1.012,
        abv: 5.6,
        ibu: 45,
        srm: 8,
      } as RecipeMetrics,
    };

    mockedApiService.recipes.calculateMetricsPreview.mockResolvedValue(
      createMockAxiosResponse(mockMetricsResponse.data)
    );

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useRecipeMetrics(mockRecipeData), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Check that query was cached properly by looking at all query keys
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll();
    const recipeMetricsQueries = queries.filter(
      query => query.queryKey[0] === "recipeMetrics"
    );

    expect(recipeMetricsQueries).toHaveLength(1);
    expect(recipeMetricsQueries[0].queryKey[1]).toBe(5.5); // batch_size
    expect(recipeMetricsQueries[0].queryKey[2]).toBe("gal"); // batch_size_unit
    expect(recipeMetricsQueries[0].queryKey[3]).toBe(72); // efficiency
  });
});

/* eslint-disable import/first */
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

// Mock the OfflineMetricsCalculator
jest.mock("@services/brewing/OfflineMetricsCalculator", () => ({
  OfflineMetricsCalculator: {
    validateRecipeData: jest.fn(),
    calculateMetrics: jest.fn(),
  },
}));

// Clear the global React Query mock and import the actual implementation
jest.unmock("@tanstack/react-query");

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRecipeMetrics } from "@src/hooks/useRecipeMetrics";
import { RecipeFormData, RecipeMetrics, RecipeIngredient } from "@src/types";
import { OfflineMetricsCalculator } from "@services/brewing/OfflineMetricsCalculator";

const mockedCalculator = jest.mocked(OfflineMetricsCalculator);

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
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = "QueryClientProviderWrapper";
  return Wrapper;
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
  instance_id: "mock-uuid",
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
    expect(mockedCalculator.calculateMetrics).not.toHaveBeenCalled();
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
    expect(mockedCalculator.calculateMetrics).not.toHaveBeenCalled();
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
    expect(mockedCalculator.calculateMetrics).not.toHaveBeenCalled();
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

    mockedCalculator.validateRecipeData.mockReturnValue({
      isValid: true,
      errors: [],
    });
    mockedCalculator.calculateMetrics.mockReturnValue(mockMetricsResponse.data);

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
    const mockMetricsResponse = {} as RecipeMetrics;

    mockedCalculator.validateRecipeData.mockReturnValue({
      isValid: true,
      errors: [],
    });
    mockedCalculator.calculateMetrics.mockReturnValue(mockMetricsResponse);

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

  it("should handle ingredients with missing id and name fields in sorting", () => {
    const mockRecipeData = {
      ...createMockRecipeData(),
      ingredients: [
        // Ingredient with empty fields to test sorting logic
        {
          amount: 2,
          unit: "lb" as const,
          type: "grain" as const,
          id: "",
          name: "",
          instance_id: "mock-uuid",
        },
        {
          amount: 1,
          unit: "oz" as const,
          type: "hop" as const,
          id: "hop-1",
          name: "Cascade",
          instance_id: "mock-uuid",
        },
        {
          amount: 3,
          unit: "lb" as const,
          type: "grain" as const,
          id: "",
          name: "",
          instance_id: "mock-uuid",
        },
      ],
    };

    // Mock successful metrics calculation
    const mockMetrics: RecipeMetrics = {
      og: 1.05,
      fg: 1.012,
      abv: 5.0,
      ibu: 30,
      srm: 6,
    };

    mockedCalculator.validateRecipeData.mockReturnValue({
      isValid: true,
      errors: [],
    });
    mockedCalculator.calculateMetrics.mockReturnValue(mockMetrics);

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useRecipeMetrics(mockRecipeData), {
      wrapper,
    });

    // Test should complete without errors despite null/undefined id/name fields
    expect(() => result.current).not.toThrow();
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

    mockedCalculator.validateRecipeData.mockReturnValue({
      isValid: true,
      errors: [],
    });
    mockedCalculator.calculateMetrics.mockReturnValue(mockMetricsResponse.data);

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

    // Verify calculator was called with correct data
    expect(mockedCalculator.calculateMetrics).toHaveBeenCalledWith(
      complexRecipeData
    );
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

    const mockMetricsResponse: RecipeMetrics = {
      og: 1.055,
      fg: 1.012,
      abv: 5.6,
      ibu: 45,
      srm: 8,
    };

    mockedCalculator.validateRecipeData.mockReturnValue({
      isValid: true,
      errors: [],
    });
    mockedCalculator.calculateMetrics.mockReturnValue(mockMetricsResponse);

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
    expect(recipeMetricsQueries[0].queryKey[1]).toBe("offline-first");
    expect(recipeMetricsQueries[0].queryKey[2]).toBe(5.5); // batch_size
    expect(recipeMetricsQueries[0].queryKey[3]).toBe("gal"); // batch_size_unit
    expect(recipeMetricsQueries[0].queryKey[4]).toBe(72); // efficiency
  });
});

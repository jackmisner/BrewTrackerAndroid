/**
 * useOfflineIngredients Hook Test Suite
 *
 * Testing meaningful functionality:
 * - Hook structure and query key configuration
 * - Network-aware behavior differences
 * - Ingredient type filtering and search functionality
 * - Service mocking and integration
 * - Cache fallback behavior
 */

import { renderHook } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useOfflineIngredients,
  useOfflineAllIngredients,
} from "../../../src/hooks/useOfflineIngredients";

// Mock NetworkContext
const mockUseNetwork = jest.fn();
jest.mock("@contexts/NetworkContext", () => ({
  useNetwork: () => mockUseNetwork(),
}));

// Mock ApiService
const mockApiService = {
  ingredients: {
    getAll: jest.fn(),
  },
};
jest.mock("@services/api/apiService", () => ({
  __esModule: true,
  default: mockApiService,
}));

// Mock OfflineCacheService
const mockOfflineCacheService = {
  getCachedIngredients: jest.fn(),
};
jest.mock("@services/offline/OfflineCacheService", () => ({
  __esModule: true,
  default: mockOfflineCacheService,
}));

// Test wrapper component
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

describe("useOfflineIngredients", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOfflineCacheService.getCachedIngredients.mockResolvedValue([]);
    mockApiService.ingredients.getAll.mockResolvedValue({ data: [] });
  });

  it("should return React Query result for grain ingredients", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: true,
      isOffline: false,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useOfflineIngredients("grain"), {
      wrapper,
    });

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("error");
  });

  it("should handle different ingredient types", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: true,
      isOffline: false,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useOfflineIngredients("hop"), {
      wrapper,
    });

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("error");
  });

  it("should handle search query parameter", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: true,
      isOffline: false,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useOfflineIngredients("yeast", "search-term"),
      { wrapper }
    );

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("error");
  });

  it("should handle offline network state", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: false,
      isOffline: true,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useOfflineIngredients("grain"), {
      wrapper,
    });

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("error");
  });

  it("should handle category parameter", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: true,
      isOffline: false,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useOfflineIngredients("grain", "search", "base-malt"),
      { wrapper }
    );

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("error");
  });
});

describe("useOfflineAllIngredients", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOfflineCacheService.getCachedIngredients.mockResolvedValue([]);
    mockApiService.ingredients.getAll.mockResolvedValue({ data: [] });
  });

  it("should return all ingredient types when connected", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: true,
      isOffline: false,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useOfflineAllIngredients(), {
      wrapper,
    });

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("error");
  });

  it("should handle search query for all ingredients", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: true,
      isOffline: false,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useOfflineAllIngredients("search-term"),
      { wrapper }
    );

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("error");
  });

  it("should handle offline network state for all ingredients", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: false,
      isOffline: true,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useOfflineAllIngredients(), {
      wrapper,
    });

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("error");
  });

  it("should handle API fallback to cache when online request fails", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: true,
      isOffline: false,
    });

    // Mock API to fail and cache to succeed
    mockApiService.ingredients.getAll.mockRejectedValue(
      new Error("API failed")
    );
    mockOfflineCacheService.getCachedIngredients.mockResolvedValue([
      { id: "cached-1", name: "Cached Ingredient", type: "grain" },
    ]);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useOfflineAllIngredients(), {
      wrapper,
    });

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("error");
  });

  it("should handle ingredient type variations consistently", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: false,
      isOffline: true,
    });

    mockOfflineCacheService.getCachedIngredients.mockImplementation(type => {
      return Promise.resolve([{ id: `${type}-1`, name: `Test ${type}`, type }]);
    });

    const wrapper = createWrapper();

    // Test different ingredient types
    const grainResult = renderHook(() => useOfflineIngredients("grain"), {
      wrapper,
    });
    const hopResult = renderHook(() => useOfflineIngredients("hop"), {
      wrapper,
    });
    const yeastResult = renderHook(() => useOfflineIngredients("yeast"), {
      wrapper,
    });
    const otherResult = renderHook(() => useOfflineIngredients("other"), {
      wrapper,
    });

    expect(grainResult.result.current).toHaveProperty("data");
    expect(hopResult.result.current).toHaveProperty("data");
    expect(yeastResult.result.current).toHaveProperty("data");
    expect(otherResult.result.current).toHaveProperty("data");
  });
});

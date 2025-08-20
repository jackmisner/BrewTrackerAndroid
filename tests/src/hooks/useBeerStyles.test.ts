import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

// Mock the API service before importing anything that uses it
jest.mock("@services/api/apiService", () => ({
  __esModule: true,
  default: {
    beerStyles: {
      getAll: jest.fn(),
      getById: jest.fn(),
      search: jest.fn(),
    },
  },
}));

// Clear the global React Query mock and import the actual implementation
jest.unmock("@tanstack/react-query");

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useBeerStyles, type BeerStyleOption } from "@src/hooks/useBeerStyles";
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

describe("useBeerStyles", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const getBeerStylesQuery = (queryClient: QueryClient) => {
    const queries = queryClient.getQueryCache().getAll();
    const beerStylesQuery = queries.find(q => q.queryKey[0] === "beerStyles");
    expect(beerStylesQuery).toBeDefined();
    return beerStylesQuery!;
  };

  it("should successfully fetch and transform beer styles data", async () => {
    // Mock successful API response with realistic data structure
    const mockApiResponse = {
      data: {
        categories: {
          "light-lager": {
            styles: [
              { name: "American Light Lager", style_id: "1A" },
              { name: "American Lager", style_id: "1B" },
            ],
          },
          pilsner: {
            styles: [
              { name: "German Pils", style_id: "5D" },
              { name: "Czech Premium Pale Lager", style_id: "3B" },
            ],
          },
        },
      },
    };

    mockedApiService.beerStyles.getAll.mockResolvedValue(
      createMockAxiosResponse(mockApiResponse.data)
    );

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useBeerStyles(), { wrapper });

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify the data transformation and sorting
    const expectedStyles: BeerStyleOption[] = [
      { name: "American Light Lager", styleId: "1A" },
      { name: "American Lager", styleId: "1B" },
      { name: "Czech Premium Pale Lager", styleId: "3B" },
      { name: "German Pils", styleId: "5D" },
    ];

    expect(result.current.data).toEqual(expectedStyles);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should handle empty API response gracefully", async () => {
    const mockApiResponse = {
      data: {},
    };

    mockedApiService.beerStyles.getAll.mockResolvedValue(
      createMockAxiosResponse(mockApiResponse.data)
    );

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useBeerStyles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle missing categories gracefully", async () => {
    const mockApiResponse = {
      data: {
        categories: null,
      },
    };

    mockedApiService.beerStyles.getAll.mockResolvedValue(
      createMockAxiosResponse(mockApiResponse.data)
    );

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useBeerStyles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it("should filter out styles with missing name or style_id", async () => {
    const mockApiResponse = {
      data: {
        categories: {
          "test-category": {
            styles: [
              { name: "Valid Style", style_id: "1A" },
              { name: "Missing ID Style" }, // Missing style_id
              { style_id: "2A" }, // Missing name
              { name: "", style_id: "3A" }, // Empty name
              { name: "Another Valid", style_id: "1B" },
            ],
          },
        },
      },
    };

    mockedApiService.beerStyles.getAll.mockResolvedValue(
      createMockAxiosResponse(mockApiResponse.data)
    );

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useBeerStyles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const expectedStyles: BeerStyleOption[] = [
      { name: "Valid Style", styleId: "1A" },
      { name: "Another Valid", styleId: "1B" },
    ];

    expect(result.current.data).toEqual(expectedStyles);
  });

  it("should sort styles correctly by ID", async () => {
    const mockApiResponse = {
      data: {
        categories: {
          test: {
            styles: [
              { name: "Style 10A", style_id: "10A" },
              { name: "Style 2B", style_id: "2B" },
              { name: "Style 2A", style_id: "2A" },
              { name: "Style 1C", style_id: "1C" },
              { name: "Style 1A", style_id: "1A" },
              { name: "Style 10B", style_id: "10B" },
            ],
          },
        },
      },
    };

    mockedApiService.beerStyles.getAll.mockResolvedValue(
      createMockAxiosResponse(mockApiResponse.data)
    );

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useBeerStyles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const expectedOrder = [
      { name: "Style 1A", styleId: "1A" },
      { name: "Style 1C", styleId: "1C" },
      { name: "Style 2A", styleId: "2A" },
      { name: "Style 2B", styleId: "2B" },
      { name: "Style 10A", styleId: "10A" },
      { name: "Style 10B", styleId: "10B" },
    ];

    expect(result.current.data).toEqual(expectedOrder);
  });

  it("should handle API errors correctly", async () => {
    // Create a specific error that won't trigger retries based on the hook's retry logic
    const apiError = { status: 404, message: "Not found" };
    mockedApiService.beerStyles.getAll.mockRejectedValue(apiError);

    // Create a query client that respects the hook's retry configuration
    const errorQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: 0,
        },
      },
    });

    const wrapper = createWrapper(errorQueryClient);
    const { result } = renderHook(() => useBeerStyles(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(result.current.error).toEqual(apiError);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle malformed category data", async () => {
    const mockApiResponse = {
      data: {
        categories: {
          "valid-category": {
            styles: [{ name: "Valid Style", style_id: "1A" }],
          },
          "invalid-category": {
            styles: "not an array", // Invalid structure
          },
          "missing-styles": {
            // Missing styles property
          },
          "null-styles": {
            styles: null,
          },
        },
      },
    };

    mockedApiService.beerStyles.getAll.mockResolvedValue(
      createMockAxiosResponse(mockApiResponse.data)
    );

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useBeerStyles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([
      { name: "Valid Style", styleId: "1A" },
    ]);
  });

  it("should handle styles with invalid ID formats", async () => {
    const mockApiResponse = {
      data: {
        categories: {
          test: {
            styles: [
              { name: "Valid Style", style_id: "1A" },
              { name: "Invalid ID Style", style_id: "invalid-format" },
              { name: "Another Valid", style_id: "2B" },
              { name: "Numeric Only", style_id: "123" },
            ],
          },
        },
      },
    };

    mockedApiService.beerStyles.getAll.mockResolvedValue(
      createMockAxiosResponse(mockApiResponse.data)
    );

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useBeerStyles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // All styles should be included, but ones with invalid format should be sorted last
    expect(result.current.data).toHaveLength(4);
    expect(result.current.data![0]).toEqual({
      name: "Valid Style",
      styleId: "1A",
    });
    expect(result.current.data![1]).toEqual({
      name: "Another Valid",
      styleId: "2B",
    });
  });

  it("should use correct query configuration", async () => {
    const mockApiResponse = {
      data: {
        categories: {
          test: {
            styles: [{ name: "Test Style", style_id: "1A" }],
          },
        },
      },
    };

    mockedApiService.beerStyles.getAll.mockResolvedValue(
      createMockAxiosResponse(mockApiResponse.data)
    );

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useBeerStyles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify the API was called
    expect(mockedApiService.beerStyles.getAll).toHaveBeenCalledTimes(1);

    // Check that the query key is correct by verifying cache behavior
    const cacheData = queryClient.getQueryData(["beerStyles"]);
    expect(cacheData).toBeDefined();
  });

  it("should handle real-world BJCP data structure", async () => {
    // Mock data that resembles actual BJCP style guide structure
    const mockApiResponse = {
      data: {
        categories: {
          "1": {
            name: "Standard American Beer",
            styles: [
              { name: "American Light Lager", style_id: "1A" },
              { name: "American Lager", style_id: "1B" },
              { name: "Cream Ale", style_id: "1C" },
              { name: "American Wheat Beer", style_id: "1D" },
            ],
          },
          "2": {
            name: "International Lager",
            styles: [
              { name: "International Pale Lager", style_id: "2A" },
              { name: "International Amber Lager", style_id: "2B" },
              { name: "International Dark Lager", style_id: "2C" },
            ],
          },
        },
      },
    };

    mockedApiService.beerStyles.getAll.mockResolvedValue(
      createMockAxiosResponse(mockApiResponse.data)
    );

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useBeerStyles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(7);

    // Verify proper sorting
    const styleIds = result.current.data?.map(style => style.styleId);
    expect(styleIds).toEqual(["1A", "1B", "1C", "1D", "2A", "2B", "2C"]);

    // Verify all expected styles are present
    expect(result.current.data).toEqual([
      { name: "American Light Lager", styleId: "1A" },
      { name: "American Lager", styleId: "1B" },
      { name: "Cream Ale", styleId: "1C" },
      { name: "American Wheat Beer", styleId: "1D" },
      { name: "International Pale Lager", styleId: "2A" },
      { name: "International Amber Lager", styleId: "2B" },
      { name: "International Dark Lager", styleId: "2C" },
    ]);
  });

  it("should be loading initially", () => {
    jest.useFakeTimers();

    // Mock API call with controlled pending promise
    mockedApiService.beerStyles.getAll.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useBeerStyles(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();

    jest.useRealTimers();
  });

  it("should not retry after 2 failures based on retry logic", () => {
    // Test the retry function directly rather than full retry behavior
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useBeerStyles(), { wrapper });

    // Access the query to get the retry function
    const beerStylesQuery = getBeerStylesQuery(queryClient);

    {
      const retryConfig = beerStylesQuery.options.retry as (
        failureCount: number,
        error: any
      ) => boolean;

      // Test retry logic for server errors
      const serverError = { response: { status: 500 } };
      expect(retryConfig(0, serverError)).toBe(true); // Should retry first failure
      expect(retryConfig(1, serverError)).toBe(true); // Should retry second failure
      expect(retryConfig(2, serverError)).toBe(false); // Should not retry third failure

      // Test that 4xx errors don't retry (except 429)
      const clientError = { response: { status: 404 } };
      expect(retryConfig(0, clientError)).toBe(false);

      // Test that 429 errors do retry
      const rateLimitError = { response: { status: 429 } };
      expect(retryConfig(0, rateLimitError)).toBe(true);
    }
  });

  it("should have correct retry delay configuration", () => {
    // Test the retry delay function directly
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useBeerStyles(), { wrapper });

    // Access the query to get the retry delay function
    const beerStylesQuery = getBeerStylesQuery(queryClient);

    {
      const retryDelayFn = beerStylesQuery.options.retryDelay as (
        attemptIndex: number
      ) => number;

      // Test exponential backoff with cap at 5000ms
      expect(retryDelayFn(0)).toBe(1000); // 1000 * 2^0 = 1000
      expect(retryDelayFn(1)).toBe(2000); // 1000 * 2^1 = 2000
      expect(retryDelayFn(2)).toBe(4000); // 1000 * 2^2 = 4000
      expect(retryDelayFn(3)).toBe(5000); // Min(8000, 5000) = 5000 (capped)
      expect(retryDelayFn(10)).toBe(5000); // Should remain capped at 5000
    }
  });
});

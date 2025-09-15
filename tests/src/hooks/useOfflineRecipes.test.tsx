/* eslint-disable import/first */
/**
 * useOfflineRecipes Hook Test Suite - Working Tests
 *
 * Testing ACTUAL functionality one test at a time
 */

// Mock data - define before mocks
const mockRecipes = [
  { id: "1", name: "Test Recipe 1", style: "IPA" },
  { id: "2", name: "Test Recipe 2", style: "Stout" },
];

// IMPORTANT: Override the global mocks from setupTests.js to use the REAL implementations
jest.unmock("../../../src/hooks/useOfflineRecipes");
jest.unmock("@tanstack/react-query");

// Import the real service so we can spy on it
import { OfflineRecipeService } from "../../../src/services/offline/OfflineRecipeService";

// Mock QUERY_KEYS - use real structure
jest.mock("@services/api/queryClient", () => ({
  QUERY_KEYS: {
    RECIPES: ["recipes"],
    RECIPE: (id: string) => ["recipe", id],
  },
}));

import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { AuthProvider } from "@contexts/AuthContext";
import { NetworkProvider } from "@contexts/NetworkContext";
import {
  useOfflineRecipes,
  useOfflineRecipe,
  useOfflineCreateRecipe,
  useOfflineUpdateRecipe,
  useOfflineDeleteRecipe,
  useOfflineSyncStatus,
} from "../../../src/hooks/useOfflineRecipes";

// Create wrapper using real providers
const createWrapper = (isConnected: boolean = true) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NetworkProvider initialState={{ isConnected }}>
          {children}
        </NetworkProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
  Wrapper.displayName = isConnected ? "OnlineWrapper" : "OfflineWrapper";
  return Wrapper;
};

describe("useOfflineRecipes", () => {
  let getAllSpy: jest.SpyInstance;
  let getByIdSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Spy on the real service methods and mock their return values
    getAllSpy = jest
      .spyOn(OfflineRecipeService, "getAll")
      .mockResolvedValue(mockRecipes as any);
    getByIdSpy = jest
      .spyOn(OfflineRecipeService, "getById")
      .mockResolvedValue(mockRecipes[0] as any);
  });

  afterEach(() => {
    getAllSpy?.mockRestore();
    getByIdSpy?.mockRestore();
  });

  it("should call OfflineRecipeService.getAll and return data when online", async () => {
    const wrapper = createWrapper();

    const { result } = renderHook(() => useOfflineRecipes(), {
      wrapper,
    });

    // Wait for the query to complete (isLoading becomes false)
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 2000 }
    );

    // Should have called the service
    expect(getAllSpy).toHaveBeenCalledTimes(1);

    // Should return the mock data
    expect(result.current.data).toEqual(mockRecipes);

    // Should be successful
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should work when network is offline", async () => {
    const offlineRecipes = [
      { id: "offline-1", name: "Offline Recipe", style: "Pilsner" },
    ];
    getAllSpy.mockResolvedValue(offlineRecipes);

    const { result } = renderHook(() => useOfflineRecipes(), {
      wrapper: createWrapper(false),
    });

    // Wait for the query to complete
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 2000 }
    );

    // Should have called the service even when offline
    expect(getAllSpy).toHaveBeenCalledTimes(1);

    // Should return the offline data
    expect(result.current.data).toEqual(offlineRecipes);

    // Should be successful
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should handle service errors properly", async () => {
    const serviceError = new Error("Service unavailable");
    getAllSpy.mockRejectedValue(serviceError);

    const wrapper = createWrapper();

    const { result } = renderHook(() => useOfflineRecipes(), {
      wrapper,
    });

    // Wait for the query to complete with error
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 2000 }
    );

    // Should have called the service
    expect(getAllSpy).toHaveBeenCalledTimes(1);

    // Should be in error state
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(serviceError);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isSuccess).toBe(false);
  });

  it("should support manual refetch", async () => {
    const initialRecipes = [{ id: "1", name: "Initial Recipe", style: "IPA" }];
    const refetchedRecipes = [
      { id: "1", name: "Initial Recipe", style: "IPA" },
      { id: "2", name: "New Recipe", style: "Stout" },
    ];

    getAllSpy.mockResolvedValueOnce(initialRecipes);

    const wrapper = createWrapper();

    const { result } = renderHook(() => useOfflineRecipes(), {
      wrapper,
    });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(initialRecipes);
    expect(getAllSpy).toHaveBeenCalledTimes(1);

    // Mock new data for refetch
    getAllSpy.mockResolvedValueOnce(refetchedRecipes);

    // Trigger refetch
    const refetchResult = await result.current.refetch();

    // Wait for the refetch to update the hook state
    await waitFor(() => {
      expect(result.current.data).toEqual(refetchedRecipes);
    });

    // Should have called service again
    expect(getAllSpy).toHaveBeenCalledTimes(2);

    // Should return new data
    expect(refetchResult.data).toEqual(refetchedRecipes);
  });
});

describe("useOfflineRecipe", () => {
  let getAllSpy: jest.SpyInstance;
  let getByIdSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Spy on the real service methods
    getAllSpy = jest
      .spyOn(OfflineRecipeService, "getAll")
      .mockResolvedValue(mockRecipes as any);
    getByIdSpy = jest
      .spyOn(OfflineRecipeService, "getById")
      .mockResolvedValue(mockRecipes[0] as any);
  });

  afterEach(() => {
    getAllSpy?.mockRestore();
    getByIdSpy?.mockRestore();
  });

  it("should call OfflineRecipeService.getById with correct id and return single recipe", async () => {
    const recipeId = "test-recipe-id";
    const expectedRecipe = {
      id: recipeId,
      name: "Single Recipe",
      style: "IPA",
    };
    getByIdSpy.mockResolvedValue(expectedRecipe);

    const wrapper = createWrapper();

    const { result } = renderHook(() => useOfflineRecipe(recipeId), {
      wrapper,
    });

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have called getById with correct id
    expect(getByIdSpy).toHaveBeenCalledTimes(1);
    expect(getByIdSpy).toHaveBeenCalledWith(recipeId);

    // Should return the single recipe
    expect(result.current.data).toEqual(expectedRecipe);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should not call service when id is empty", async () => {
    const wrapper = createWrapper();

    const { result } = renderHook(() => useOfflineRecipe(""), {
      wrapper,
    });

    // Should not call the service for empty id
    expect(getByIdSpy).not.toHaveBeenCalled();

    // Should be in idle state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});

describe("useOfflineCreateRecipe", () => {
  let getAllSpy: jest.SpyInstance;
  let createSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Spy on the service methods
    getAllSpy = jest
      .spyOn(OfflineRecipeService, "getAll")
      .mockResolvedValue(mockRecipes as any);
    createSpy = jest.spyOn(OfflineRecipeService, "create").mockResolvedValue({
      id: "new-recipe-id",
      name: "New Recipe",
      style: "IPA",
      isOffline: false,
      lastModified: Date.now(),
      syncStatus: "synced",
      user_id: "test-user",
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      batch_size_unit: "gal" as const,
      mash_temp_unit: "F" as "F" | "C",
      unit_system: "imperial" as const,
      efficiency: 75,
      batch_size: 5,
      description: "",
      mash_temperature: 152,
      mash_time: 60,
      boil_time: 60,
      ingredients: [],
      notes: "",
    });
  });

  afterEach(() => {
    getAllSpy?.mockRestore();
    createSpy?.mockRestore();
  });

  it("should create a recipe successfully", async () => {
    const wrapper = createWrapper();

    const { result } = renderHook(() => useOfflineCreateRecipe(), {
      wrapper,
    });

    const recipeData = {
      name: "Test Recipe",
      style: "IPA",
      batch_size: 5,
      batch_size_unit: "gal" as const,
      efficiency: 75,
      description: "A test recipe",
      is_public: false,
      mash_temperature: 152,
      mash_temp_unit: "F" as "F" | "C",
      mash_time: 60,
      boil_time: 60,
      ingredients: [],
      instructions: "",
      notes: "",
      unit_system: "imperial" as const,
    };

    // Initially should not be pending
    expect(result.current.isPending).toBe(false);

    // Trigger the mutation
    await result.current.mutateAsync(recipeData);

    // Should have called create service
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(recipeData);

    // Should not be pending anymore
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should handle create errors", async () => {
    const createError = new Error("Create failed");
    createSpy.mockRejectedValue(createError);

    const wrapper = createWrapper();

    const { result } = renderHook(() => useOfflineCreateRecipe(), {
      wrapper,
    });

    const recipeData = {
      name: "Test Recipe",
      style: "IPA",
      batch_size: 5,
      batch_size_unit: "gal" as const,
      efficiency: 75,
      description: "A test recipe",
      is_public: false,
      mash_temperature: 152,
      mash_temp_unit: "F" as "F" | "C",
      mash_time: 60,
      boil_time: 60,
      ingredients: [],
      instructions: "",
      notes: "",
      unit_system: "imperial" as const,
    };

    // Should reject with error
    await expect(result.current.mutateAsync(recipeData)).rejects.toThrow(
      "Create failed"
    );

    // Should have called create service
    expect(createSpy).toHaveBeenCalledTimes(1);

    // Should have error set (check right after the failed mutation)
    await waitFor(() => {
      expect(result.current.error).toBe(createError);
    });
  });
});

describe("useOfflineUpdateRecipe", () => {
  let updateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    updateSpy = jest.spyOn(OfflineRecipeService, "update").mockResolvedValue({
      id: "updated-recipe-id",
      name: "Updated Recipe",
      style: "Stout",
      isOffline: false,
      lastModified: Date.now(),
      syncStatus: "synced",
      user_id: "test-user",
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 2,
      batch_size_unit: "gal" as const,
      mash_temp_unit: "F" as "F" | "C",
      unit_system: "imperial" as const,
      efficiency: 75,
      batch_size: 5,
      description: "",
      mash_temperature: 152,
      mash_time: 60,
      boil_time: 60,
      ingredients: [],
      notes: "",
    });
  });

  afterEach(() => {
    updateSpy?.mockRestore();
  });

  it("should update a recipe successfully", async () => {
    const wrapper = createWrapper();

    const { result } = renderHook(() => useOfflineUpdateRecipe(), {
      wrapper,
    });

    const updateData = {
      id: "recipe-123",
      data: { name: "Updated Recipe Name", style: "Porter" },
    };

    // Trigger the mutation
    await result.current.mutateAsync(updateData);

    // Should have called update service with correct parameters
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith(updateData.id, updateData.data);

    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe("useOfflineDeleteRecipe", () => {
  let deleteSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    deleteSpy = jest
      .spyOn(OfflineRecipeService, "delete")
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    deleteSpy?.mockRestore();
  });

  it("should delete a recipe successfully", async () => {
    const wrapper = createWrapper();

    const { result } = renderHook(() => useOfflineDeleteRecipe(), {
      wrapper,
    });

    const recipeId = "recipe-to-delete";

    // Trigger the mutation
    await result.current.mutateAsync(recipeId);

    // Should have called delete service with correct id
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledWith(recipeId);

    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe("useOfflineSyncStatus", () => {
  let getSyncStatusSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    getSyncStatusSpy = jest
      .spyOn(OfflineRecipeService, "getSyncStatus")
      .mockResolvedValue({
        totalRecipes: 5,
        activeRecipes: 3,
        needsSync: 2,
        pendingDeletions: 1,
        pendingSync: 2,
        conflicts: 0,
        failedSync: 1,
        lastSync: Date.now(),
      });
  });

  afterEach(() => {
    getSyncStatusSpy?.mockRestore();
  });

  it("should fetch sync status successfully", async () => {
    const wrapper = createWrapper();

    const { result } = renderHook(() => useOfflineSyncStatus(), {
      wrapper,
    });

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have called getSyncStatus
    expect(getSyncStatusSpy).toHaveBeenCalledTimes(1);

    // Should return sync status data
    expect(result.current.data).toEqual({
      totalRecipes: 5,
      activeRecipes: 3,
      needsSync: 2,
      pendingDeletions: 1,
      pendingSync: 2,
      conflicts: 0,
      failedSync: 1,
      lastSync: expect.any(Number),
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.error).toBeNull();
  });
});

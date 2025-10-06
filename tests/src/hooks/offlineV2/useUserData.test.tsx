/**
 * useUserData Hook Test Suite
 * Tests for React hooks that manage user-specific data with offline capabilities.
 */

import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRecipes, useBrewSessions } from "@hooks/offlineV2/useUserData";
import { UserCacheService } from "@services/offlineV2/UserCacheService";
import { useAuth } from "@contexts/AuthContext";
import { Recipe, BrewSession, User } from "@src/types";

// Mock UserCacheService
jest.mock("@services/offlineV2/UserCacheService", () => ({
  UserCacheService: {
    getRecipes: jest.fn(),
    getRecipeById: jest.fn(),
    createRecipe: jest.fn(),
    updateRecipe: jest.fn(),
    deleteRecipe: jest.fn(),
    getBrewSessions: jest.fn(),
    getBrewSessionById: jest.fn(),
    createBrewSession: jest.fn(),
    updateBrewSession: jest.fn(),
    deleteBrewSession: jest.fn(),
    syncPendingOperations: jest.fn(),
    getPendingOperationsCount: jest.fn(),
  },
}));

// Mock useAuth hook
jest.mock("@contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

// Mock UnitContext hook with shared utility
jest.mock(
  "@contexts/UnitContext",
  () => require("../../../utils/unitContextMock").unitContextMock
);

// Mock React Native Appearance
jest.mock("react-native", () => ({
  Appearance: {
    getColorScheme: jest.fn(() => "light"),
    addChangeListener: jest.fn(),
    removeChangeListener: jest.fn(),
  },
}));

describe("useUserData hooks", () => {
  const mockUserCacheService = UserCacheService as jest.Mocked<
    typeof UserCacheService
  >;
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  const mockUser = {
    id: "test-user-id",
    username: "testuser",
    email: "test@example.com",
  };

  // Helper to create complete mock auth context with biometric fields
  const createMockAuthValue = (overrides: any = {}) => ({
    user: mockUser as User,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    isBiometricAvailable: false,
    isBiometricEnabled: false,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    refreshUser: jest.fn(),
    clearError: jest.fn(),
    signInWithGoogle: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
    checkVerificationStatus: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    loginWithBiometrics: jest.fn(),
    enableBiometrics: jest.fn(),
    disableBiometrics: jest.fn(),
    checkBiometricAvailability: jest.fn(),
    getUserId: jest.fn().mockReturnValue(mockUser.id),
    ...overrides,
  });

  const mockRecipe: Recipe = {
    id: "recipe-1",
    name: "Test Recipe",
    description: "A test recipe",
    style: "IPA",
    batch_size: 5.0,
    boil_time: 60,
    efficiency: 75,
    mash_temperature: 152,
    mash_temp_unit: "F",
    unit_system: "imperial",
    batch_size_unit: "gal",
    ingredients: [],
    notes: "Some notes",
    created_at: "1640995200000",
    updated_at: "1640995200000",
    user_id: mockUser.id,
    is_public: false,
  };

  const mockBrewSession: BrewSession = {
    id: "session-1",
    user_id: mockUser.id,
    name: "Test Session",
    recipe_id: "recipe-1",
    status: "fermenting",
    batch_size: 5.0,
    batch_size_unit: "gal",
    brew_date: "2024-01-15T00:00:00Z",
    actual_og: 1.064,
    actual_fg: undefined,
    actual_abv: undefined,
    created_at: "1640995200000",
    updated_at: "1640995200000",
    notes: "Test session",
    fermentation_data: [],
    target_fg: 1.012,
    temperature_unit: "F",
  };

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    return Wrapper;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("useRecipes", () => {
    it("should load recipes when user is authenticated", async () => {
      mockUseAuth.mockReturnValue(createMockAuthValue());
      mockUserCacheService.getRecipes.mockResolvedValue([mockRecipe]);
      mockUserCacheService.getPendingOperationsCount.mockResolvedValue(0);

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([mockRecipe]);
      expect(result.current.error).toBeNull();
      expect(mockUserCacheService.getRecipes).toHaveBeenCalledWith(
        mockUser.id,
        "imperial"
      );
    });

    it("should not load recipes when user is not authenticated", async () => {
      mockUseAuth.mockReturnValue(
        createMockAuthValue({ user: null, isAuthenticated: false })
      );

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(mockUserCacheService.getRecipes).not.toHaveBeenCalled();
    });

    it("should create a new recipe", async () => {
      mockUseAuth.mockReturnValue(createMockAuthValue());
      mockUserCacheService.getRecipes.mockResolvedValue([mockRecipe]);
      mockUserCacheService.getPendingOperationsCount.mockResolvedValue(0);
      mockUserCacheService.createRecipe.mockResolvedValue(mockRecipe);

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newRecipeData = {
        name: "New Recipe",
        description: "A new test recipe",
      };

      const createdRecipe = await result.current.create(newRecipeData);

      expect(createdRecipe).toEqual(mockRecipe);
      expect(mockUserCacheService.createRecipe).toHaveBeenCalledWith({
        ...newRecipeData,
        user_id: mockUser.id,
      });
    });

    it("should throw error when creating recipe without authenticated user", async () => {
      mockUseAuth.mockReturnValue(
        createMockAuthValue({ user: null, isAuthenticated: false })
      );

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        result.current.create({ name: "Test Recipe" })
      ).rejects.toThrow("User not authenticated");
    });

    it("should update an existing recipe", async () => {
      mockUseAuth.mockReturnValue(createMockAuthValue());
      mockUserCacheService.getRecipes.mockResolvedValue([mockRecipe]);
      mockUserCacheService.getPendingOperationsCount.mockResolvedValue(0);

      const updatedRecipe = { ...mockRecipe, name: "Updated Recipe" };
      mockUserCacheService.updateRecipe.mockResolvedValue(updatedRecipe);

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updates = { name: "Updated Recipe" };
      const updated = await result.current.update("recipe-1", updates);

      expect(updated).toEqual(updatedRecipe);
      expect(mockUserCacheService.updateRecipe).toHaveBeenCalledWith(
        "recipe-1",
        {
          ...updates,
          user_id: mockUser.id,
        }
      );
    });

    it("should delete a recipe", async () => {
      mockUseAuth.mockReturnValue(createMockAuthValue());
      mockUserCacheService.getRecipes.mockResolvedValue([mockRecipe]);
      mockUserCacheService.getPendingOperationsCount.mockResolvedValue(0);
      mockUserCacheService.deleteRecipe.mockResolvedValue();

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.delete("recipe-1");

      expect(mockUserCacheService.deleteRecipe).toHaveBeenCalledWith(
        "recipe-1",
        mockUser.id
      );
    });

    it("should sync pending operations", async () => {
      mockUseAuth.mockReturnValue(createMockAuthValue());
      mockUserCacheService.getRecipes.mockResolvedValue([mockRecipe]);
      mockUserCacheService.getPendingOperationsCount.mockResolvedValue(1);

      const syncResult = {
        success: true,
        processed: 1,
        failed: 0,
        conflicts: 0,
        errors: [],
      };
      mockUserCacheService.syncPendingOperations.mockResolvedValue(syncResult);

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const result_sync = await result.current.sync();

      expect(result_sync).toEqual(syncResult);
      expect(mockUserCacheService.syncPendingOperations).toHaveBeenCalled();
      expect(result.current.lastSync).toBeDefined();
    });

    it("should handle loading error", async () => {
      mockUseAuth.mockReturnValue(createMockAuthValue());
      mockUserCacheService.getRecipes.mockRejectedValue(
        new Error("Failed to load recipes")
      );

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe("Failed to load recipes");
    });

    it("should track pending operations count", async () => {
      mockUseAuth.mockReturnValue(createMockAuthValue());
      mockUserCacheService.getRecipes.mockResolvedValue([mockRecipe]);
      mockUserCacheService.getPendingOperationsCount.mockResolvedValue(3);

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pendingCount).toBe(3);
    });

    it("should reload data when user changes", async () => {
      // Initially no user
      mockUseAuth.mockReturnValue(
        createMockAuthValue({ user: null, isAuthenticated: false })
      );

      const { rerender } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      });

      rerender(undefined);

      // User logs in
      mockUseAuth.mockReturnValue(createMockAuthValue());
      mockUserCacheService.getRecipes.mockResolvedValue([mockRecipe]);
      mockUserCacheService.getPendingOperationsCount.mockResolvedValue(0);

      rerender(undefined);

      await waitFor(() => {
        expect(mockUserCacheService.getRecipes).toHaveBeenCalledWith(
          mockUser.id,
          "imperial"
        );
      });
    });

    it("should get a recipe by ID", async () => {
      mockUseAuth.mockReturnValue(createMockAuthValue());

      mockUserCacheService.getRecipes.mockResolvedValue([mockRecipe]);
      mockUserCacheService.getPendingOperationsCount.mockResolvedValue(0);
      mockUserCacheService.getRecipeById.mockResolvedValue(mockRecipe);

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const recipe = await result.current.getById("recipe-1");

      expect(recipe).toEqual(mockRecipe);
      expect(mockUserCacheService.getRecipeById).toHaveBeenCalledWith(
        "recipe-1",
        mockUser.id
      );
    });
  });

  describe("useBrewSessions", () => {
    it("should load brew sessions when user is authenticated", async () => {
      mockUseAuth.mockReturnValue(createMockAuthValue());

      mockUserCacheService.getBrewSessions.mockResolvedValue([mockBrewSession]);
      mockUserCacheService.getPendingOperationsCount.mockResolvedValue(0);

      const { result } = renderHook(() => useBrewSessions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([mockBrewSession]);
      expect(result.current.error).toBeNull();
      expect(mockUserCacheService.getBrewSessions).toHaveBeenCalledWith(
        mockUser.id,
        "imperial"
      );
    });

    it("should create a new brew session", async () => {
      mockUseAuth.mockReturnValue(createMockAuthValue());

      mockUserCacheService.getBrewSessions.mockResolvedValue([mockBrewSession]);
      mockUserCacheService.getPendingOperationsCount.mockResolvedValue(0);
      mockUserCacheService.createBrewSession.mockResolvedValue(mockBrewSession);

      const { result } = renderHook(() => useBrewSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newSessionData = {
        name: "Test Brew Session",
        recipe_id: "recipe-1",
        brew_date: "2024-01-01",
      };

      const createdSession = await result.current.create(newSessionData);

      expect(createdSession).toEqual(mockBrewSession);
      expect(mockUserCacheService.createBrewSession).toHaveBeenCalledWith({
        ...newSessionData,
        user_id: mockUser.id,
      });
    });

    it("should update an existing brew session", async () => {
      mockUseAuth.mockReturnValue(createMockAuthValue());

      mockUserCacheService.getBrewSessions.mockResolvedValue([mockBrewSession]);
      mockUserCacheService.getPendingOperationsCount.mockResolvedValue(0);

      const updatedSession = { ...mockBrewSession, name: "Updated Session" };
      mockUserCacheService.updateBrewSession.mockResolvedValue(updatedSession);

      const { result } = renderHook(() => useBrewSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updates = { name: "Updated Session" };
      const updated = await result.current.update("session-1", updates);

      expect(updated).toEqual(updatedSession);
      expect(mockUserCacheService.updateBrewSession).toHaveBeenCalledWith(
        "session-1",
        {
          ...updates,
          user_id: mockUser.id,
        }
      );
    });

    it("should delete a brew session", async () => {
      mockUseAuth.mockReturnValue(createMockAuthValue());

      mockUserCacheService.getBrewSessions.mockResolvedValue([mockBrewSession]);
      mockUserCacheService.getPendingOperationsCount.mockResolvedValue(0);
      mockUserCacheService.deleteBrewSession.mockResolvedValue();

      const { result } = renderHook(() => useBrewSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.delete("session-1");

      expect(mockUserCacheService.deleteBrewSession).toHaveBeenCalledWith(
        "session-1",
        mockUser.id
      );
    });

    it("should sync pending operations", async () => {
      mockUseAuth.mockReturnValue(createMockAuthValue());

      mockUserCacheService.getBrewSessions.mockResolvedValue([mockBrewSession]);
      mockUserCacheService.getPendingOperationsCount.mockResolvedValue(1);

      const syncResult = {
        success: true,
        processed: 1,
        failed: 0,
        conflicts: 0,
        errors: [],
      };
      mockUserCacheService.syncPendingOperations.mockResolvedValue(syncResult);

      const { result } = renderHook(() => useBrewSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const result_sync = await result.current.sync();

      expect(result_sync).toEqual(syncResult);
      expect(mockUserCacheService.syncPendingOperations).toHaveBeenCalled();
      expect(result.current.lastSync).toBeDefined();
    });

    it("should get a brew session by ID", async () => {
      mockUseAuth.mockReturnValue(createMockAuthValue());

      mockUserCacheService.getBrewSessions.mockResolvedValue([mockBrewSession]);
      mockUserCacheService.getPendingOperationsCount.mockResolvedValue(0);
      mockUserCacheService.getBrewSessionById.mockResolvedValue(
        mockBrewSession
      );

      const { result } = renderHook(() => useBrewSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const session = await result.current.getById("session-1");

      expect(session).toEqual(mockBrewSession);
      expect(mockUserCacheService.getBrewSessionById).toHaveBeenCalledWith(
        "session-1",
        mockUser.id
      );
    });
  });
});

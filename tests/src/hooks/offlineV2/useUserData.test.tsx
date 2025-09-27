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
    createRecipe: jest.fn(),
    updateRecipe: jest.fn(),
    deleteRecipe: jest.fn(),
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
      mockUseAuth.mockReturnValue({
        user: mockUser as User,
        isAuthenticated: true,
        isLoading: false,
        error: null,
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
        getUserId: jest.fn().mockReturnValue(mockUser.id),
      });
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
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
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
        getUserId: jest.fn().mockReturnValue(null),
      });

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
      mockUseAuth.mockReturnValue({
        user: mockUser as User,
        isAuthenticated: true,
        isLoading: false,
        error: null,
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
        getUserId: jest.fn().mockReturnValue(mockUser.id),
      });
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
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
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
        getUserId: jest.fn().mockReturnValue(null),
      });

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
      mockUseAuth.mockReturnValue({
        user: mockUser as User,
        isAuthenticated: true,
        isLoading: false,
        error: null,
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
        getUserId: jest.fn().mockReturnValue(mockUser.id),
      });
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
      mockUseAuth.mockReturnValue({
        user: mockUser as User,
        isAuthenticated: true,
        isLoading: false,
        error: null,
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
        getUserId: jest.fn().mockReturnValue(mockUser.id),
      });
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
      mockUseAuth.mockReturnValue({
        user: mockUser as User,
        isAuthenticated: true,
        isLoading: false,
        error: null,
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
        getUserId: jest.fn().mockReturnValue(mockUser.id),
      });
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
      mockUseAuth.mockReturnValue({
        user: mockUser as User,
        isAuthenticated: true,
        isLoading: false,
        error: null,
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
        getUserId: jest.fn().mockReturnValue(mockUser.id),
      });
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
      mockUseAuth.mockReturnValue({
        user: mockUser as User,
        isAuthenticated: true,
        isLoading: false,
        error: null,
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
        getUserId: jest.fn().mockReturnValue(mockUser.id),
      });
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
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
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
        getUserId: jest.fn().mockReturnValue(null),
      });

      const { rerender } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      });

      rerender(undefined);

      // User logs in
      mockUseAuth.mockReturnValue({
        user: mockUser as User,
        isAuthenticated: true,
        isLoading: false,
        error: null,
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
        getUserId: jest.fn().mockReturnValue(mockUser.id),
      });
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
  });

  describe("useBrewSessions", () => {
    it("should return initial state with TODO implementation", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser as User,
        isAuthenticated: true,
        isLoading: false,
        error: null,
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
        getUserId: jest.fn().mockReturnValue(mockUser.id),
      });

      const { result } = renderHook(() => useBrewSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.pendingCount).toBe(0);
      expect(result.current.conflictCount).toBe(0);
      expect(result.current.lastSync).toBeNull();
    });

    it("should throw error for unimplemented create method", async () => {
      const { result } = renderHook(() => useBrewSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(result.current.create(mockBrewSession)).rejects.toThrow(
        "Brew sessions not yet implemented in UserCacheService"
      );
    });

    it("should throw error for unimplemented update method", async () => {
      const { result } = renderHook(() => useBrewSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        result.current.update("session-1", { name: "Updated" })
      ).rejects.toThrow(
        "Brew sessions not yet implemented in UserCacheService"
      );
    });

    it("should throw error for unimplemented delete method", async () => {
      const { result } = renderHook(() => useBrewSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(result.current.delete("session-1")).rejects.toThrow(
        "Brew sessions not yet implemented in UserCacheService"
      );
    });

    it("should return empty sync result for unimplemented sync", async () => {
      const { result } = renderHook(() => useBrewSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const syncResult = await result.current.sync();

      expect(syncResult).toEqual({
        success: true,
        processed: 0,
        failed: 0,
        conflicts: 0,
        errors: [],
      });
    });
  });
});

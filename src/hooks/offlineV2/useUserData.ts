/**
 * useUserData Hook - BrewTracker Offline V2
 *
 * React hook for managing user-specific data (recipes, brew sessions) with
 * offline CRUD operations and automatic sync capabilities.
 */

import { useState, useEffect, useCallback } from "react";
import { UserCacheService } from "@services/offlineV2/UserCacheService";
import { UseUserDataReturn, SyncResult, Recipe, BrewSession } from "@src/types";
import { useAuth } from "@contexts/AuthContext";

/**
 * Hook for managing recipes with offline capabilities
 */
export function useRecipes(): UseUserDataReturn<Recipe> {
  const { getUserId } = useAuth();
  const [data, setData] = useState<Recipe[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount] = useState(0);
  const [lastSync, setLastSync] = useState<number | null>(null);

  // Helper to get user ID consistently
  const getUserIdForOperations = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) {
      console.log(`[useRecipes] No user ID available`);
      setData(null);
      setIsLoading(false);
      return null;
    }
    return userId;
  }, [getUserId]);

  const loadData = useCallback(
    async (showLoading = true) => {
      const userId = await getUserIdForOperations();
      if (!userId) {
        console.log(`[useRecipes.loadData] No user ID found`);
        return;
      }

      try {
        if (showLoading) {
          setIsLoading(true);
        }
        setError(null);

        console.log(
          `[useRecipes.loadData] Loading recipes for user ID: "${userId}"`
        );

        const recipes = await UserCacheService.getRecipes(userId);
        console.log(
          `[useRecipes.loadData] UserCacheService returned ${recipes.length} recipes`
        );
        setData(recipes);

        // Update sync status
        const pending = await UserCacheService.getPendingOperationsCount();
        setPendingCount(pending);
      } catch (err) {
        console.error("Error loading recipes:", err);
        setError(err instanceof Error ? err.message : "Failed to load recipes");
      } finally {
        setIsLoading(false);
      }
    },
    [getUserIdForOperations]
  );

  const create = useCallback(
    async (recipe: Partial<Recipe>): Promise<Recipe> => {
      const userId = await getUserIdForOperations();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const newRecipe = await UserCacheService.createRecipe({
        ...recipe,
        user_id: userId,
      });

      // Refresh data
      await loadData(false);

      return newRecipe;
    },
    [getUserIdForOperations, loadData]
  );

  const update = useCallback(
    async (id: string, updates: Partial<Recipe>): Promise<Recipe> => {
      const userId = await getUserIdForOperations();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const updatedRecipe = await UserCacheService.updateRecipe(id, {
        ...updates,
        user_id: userId,
      });

      // Refresh data
      await loadData(false);

      return updatedRecipe;
    },
    [getUserIdForOperations, loadData]
  );

  const deleteRecipe = useCallback(
    async (id: string): Promise<void> => {
      const userId = await getUserIdForOperations();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      await UserCacheService.deleteRecipe(id, userId);

      // Refresh data
      await loadData(false);
    },
    [getUserIdForOperations, loadData]
  );

  const sync = useCallback(async (): Promise<SyncResult> => {
    const result = await UserCacheService.syncPendingOperations();

    // Refresh data and sync status
    await loadData(false);
    setLastSync(Date.now());

    return result;
  }, [loadData]);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const userIdForCache = await getUserIdForOperations();
      if (!userIdForCache) {
        console.log(`[useRecipes.refresh] No user ID found for refresh`);
        return;
      }

      setIsLoading(true);
      setError(null);

      console.log(
        `[useRecipes.refresh] Refreshing recipes from server for user: "${userIdForCache}"`
      );

      const refreshedRecipes =
        await UserCacheService.refreshRecipesFromServer(userIdForCache);
      console.log(
        `[useRecipes.refresh] Refresh completed, got ${refreshedRecipes.length} recipes`
      );

      setData(refreshedRecipes);

      // Update sync status
      const pending = await UserCacheService.getPendingOperationsCount();
      setPendingCount(pending);
      setLastSync(Date.now());
    } catch (error) {
      console.error(`[useRecipes.refresh] Refresh failed:`, error);
      setError(
        error instanceof Error ? error.message : "Failed to refresh recipes"
      );
    } finally {
      setIsLoading(false);
    }
  }, [getUserIdForOperations]);

  // Load data on mount and when user changes
  useEffect(() => {
    const loadDataIfAuthenticated = async () => {
      const userId = await getUserIdForOperations();
      if (userId) {
        loadData();
      } else {
        setData(null);
        setIsLoading(false);
      }
    };

    loadDataIfAuthenticated();
  }, [getUserIdForOperations, loadData]);

  return {
    data,
    isLoading,
    error,
    pendingCount,
    conflictCount, // TODO: Implement conflict tracking
    lastSync,
    create,
    update,
    delete: deleteRecipe,
    sync,
    refresh,
  };
}

/**
 * Hook for managing brew sessions with offline capabilities
 */
export function useBrewSessions(): UseUserDataReturn<BrewSession> {
  const { user: _user } = useAuth();
  const [data] = useState<BrewSession[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [pendingCount] = useState(0);
  const [conflictCount] = useState(0);
  const [lastSync] = useState<number | null>(null);

  // TODO: Implement brew sessions methods similar to recipes
  // For now, return basic structure

  // TODO: Implement loadData when UserCacheService supports brew sessions
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const create = useCallback(
    async (_session: Partial<BrewSession>): Promise<BrewSession> => {
      // TODO: Implement
      throw new Error("Brew sessions not yet implemented in UserCacheService");
    },
    []
  );

  const update = useCallback(
    async (
      _id: string,
      _updates: Partial<BrewSession>
    ): Promise<BrewSession> => {
      // TODO: Implement
      throw new Error("Brew sessions not yet implemented in UserCacheService");
    },
    []
  );

  const deleteSession = useCallback(async (_id: string): Promise<void> => {
    // TODO: Implement
    throw new Error("Brew sessions not yet implemented in UserCacheService");
  }, []);

  const sync = useCallback(async (): Promise<SyncResult> => {
    // TODO: Implement
    return {
      success: true,
      processed: 0,
      failed: 0,
      conflicts: 0,
      errors: [],
    };
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    // TODO: Implement when UserCacheService supports brew sessions
    // For now, do nothing since brew sessions are not implemented
  }, []);

  return {
    data,
    isLoading,
    error,
    pendingCount,
    conflictCount,
    lastSync,
    create,
    update,
    delete: deleteSession,
    sync,
    refresh,
  };
}

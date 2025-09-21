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
  const { user } = useAuth();
  const [data, setData] = useState<Recipe[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount] = useState(0);
  const [lastSync, setLastSync] = useState<number | null>(null);

  const loadData = useCallback(
    async (showLoading = true) => {
      if (!user?.id) {
        return;
      }

      try {
        if (showLoading) {
          setIsLoading(true);
        }
        setError(null);

        const recipes = await UserCacheService.getRecipes(user.id);
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
    [user?.id]
  );

  const create = useCallback(
    async (recipe: Partial<Recipe>): Promise<Recipe> => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const newRecipe = await UserCacheService.createRecipe({
        ...recipe,
        user_id: user.id,
      });

      // Refresh data
      await loadData(false);

      return newRecipe;
    },
    [user?.id, loadData]
  );

  const update = useCallback(
    async (id: string, updates: Partial<Recipe>): Promise<Recipe> => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const updatedRecipe = await UserCacheService.updateRecipe(id, {
        ...updates,
        user_id: user.id,
      });

      // Refresh data
      await loadData(false);

      return updatedRecipe;
    },
    [user?.id, loadData]
  );

  const deleteRecipe = useCallback(
    async (id: string): Promise<void> => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      await UserCacheService.deleteRecipe(id, user.id);

      // Refresh data
      await loadData(false);
    },
    [user?.id, loadData]
  );

  const sync = useCallback(async (): Promise<SyncResult> => {
    const result = await UserCacheService.syncPendingOperations();

    // Refresh data and sync status
    await loadData(false);
    setLastSync(Date.now());

    return result;
  }, [loadData]);

  // Load data on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      loadData();
    } else {
      setData(null);
      setIsLoading(false);
    }
  }, [user?.id, loadData]);

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

  const loadData = useCallback(async (_showLoading = true) => {
    // TODO: Implement when UserCacheService supports brew sessions
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

  useEffect(() => {
    loadData();
  }, [loadData]);

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
  };
}

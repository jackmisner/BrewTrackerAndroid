/**
 * useUserData Hook - BrewTracker Offline V2
 *
 * React hook for managing user-specific data (recipes, brew sessions) with
 * offline CRUD operations and automatic sync capabilities.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { UserCacheService } from "@services/offlineV2/UserCacheService";
import { UseUserDataReturn, SyncResult, Recipe, BrewSession } from "@src/types";
import { useAuth } from "@contexts/AuthContext";
import { useUnits } from "@contexts/UnitContext";
import { UnifiedLogger } from "@services/logger/UnifiedLogger";

/**
 * Hook for managing recipes with offline capabilities
 */
export function useRecipes(): UseUserDataReturn<Recipe> {
  const { user } = useAuth(); // Use user object directly instead of getUserId function
  const { unitSystem } = useUnits();
  const [data, setData] = useState<Recipe[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount] = useState(0);
  const [lastSync, setLastSync] = useState<number | null>(null);

  // Create a stable ref for the loadData function to avoid dependency issues
  const loadDataRef = useRef<(() => Promise<void>) | null>(null);

  // Helper to get user ID consistently using stable user object
  const getUserIdForOperations = useCallback(async () => {
    const userId = user?.id;
    if (!userId) {
      setData(null);
      setIsLoading(false);
      return null;
    }
    return userId;
  }, [user?.id]); // Depend on user.id directly, not getUserId function

  const loadData = useCallback(
    async (showLoading = true) => {
      const userId = await getUserIdForOperations();
      if (!userId) {
        return;
      }

      try {
        if (showLoading) {
          setIsLoading(true);
        }
        setError(null);

        const recipes = await UserCacheService.getRecipes(userId, unitSystem);
        setData(recipes);

        // Update sync status
        const pending = await UserCacheService.getPendingOperationsCount();
        setPendingCount(pending);
      } catch (err) {
        await UnifiedLogger.error("useRecipes.loadData", "Error loading recipes:", err);
        setError(err instanceof Error ? err.message : "Failed to load recipes");
      } finally {
        setIsLoading(false);
      }
    },
    [getUserIdForOperations, unitSystem]
  );

  // Store the current loadData function in the ref
  loadDataRef.current = loadData;

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

  const clone = useCallback(
    async (id: string): Promise<Recipe> => {
      const userId = await getUserIdForOperations();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const clonedRecipe = await UserCacheService.cloneRecipe(id, userId);

      // Refresh data
      await loadData(false);

      return clonedRecipe;
    },
    [getUserIdForOperations, loadData]
  );

  const getById = useCallback(
    async (id: string): Promise<Recipe | null> => {
      const userId = await getUserIdForOperations();
      if (!userId) {
        return null;
      }

      const recipe = await UserCacheService.getRecipeById(id, userId);

      if (recipe) {
        await UnifiedLogger.info(
          "useRecipes.getById",
          `Retrieved recipe: ${recipe.name}`,
          {
            recipeId: id,
            userId,
            source: "offline_cache",
            style: recipe.style,
          }
        );
      }

      return recipe;
    },
    [getUserIdForOperations]
  );

  const refresh = useCallback(async (): Promise<void> => {
    const userIdForCache = await getUserIdForOperations();
    if (!userIdForCache) {
      return;
    }

    try {
      setIsLoading(true);

      const refreshedRecipes = await UserCacheService.refreshRecipesFromServer(
        userIdForCache,
        unitSystem
      );

      setData(refreshedRecipes);
      setError(null); // Only clear error on successful refresh

      // Update sync status
      const pending = await UserCacheService.getPendingOperationsCount();
      setPendingCount(pending);
      setLastSync(Date.now());
    } catch (error) {
      // Don't set error state for refresh failures - preserve offline cache
      // Try to load existing offline data to ensure offline-created recipes are available
      try {
        const offlineRecipes = await UserCacheService.getRecipes(
          userIdForCache,
          unitSystem
        );
        setData(offlineRecipes);

        // Update sync status to reflect pending operations
        const pending = await UserCacheService.getPendingOperationsCount();
        setPendingCount(pending);
      } catch (cacheError) {
        await UnifiedLogger.error("useRecipes.refresh", "Failed to load offline recipe cache:", cacheError);
        // Only set error if we can't even load offline cache
        setError(
          error instanceof Error ? error.message : "Failed to refresh recipes"
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [getUserIdForOperations, unitSystem]);

  // Load data on mount and when user changes
  useEffect(() => {
    const loadDataIfAuthenticated = async () => {
      const userId = await getUserIdForOperations();
      if (userId && loadDataRef.current) {
        loadDataRef.current();
      } else {
        setData(null);
        setIsLoading(false);
      }
    };

    loadDataIfAuthenticated();
  }, [getUserIdForOperations]);

  return useMemo(
    () => ({
      data,
      isLoading,
      error,
      pendingCount,
      conflictCount, // TODO: Implement conflict tracking
      lastSync,
      create,
      update,
      delete: deleteRecipe,
      clone,
      getById,
      sync,
      refresh,
    }),
    [
      data,
      isLoading,
      error,
      pendingCount,
      conflictCount,
      lastSync,
      create,
      update,
      deleteRecipe,
      clone,
      getById,
      sync,
      refresh,
    ]
  );
}

/**
 * Hook for managing brew sessions with offline capabilities
 */
export function useBrewSessions(): UseUserDataReturn<BrewSession> {
  const { user } = useAuth(); // Use user object directly instead of getUserId function
  const { unitSystem } = useUnits();
  const [data, setData] = useState<BrewSession[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount] = useState(0);
  const [lastSync, setLastSync] = useState<number | null>(null);

  // Create a stable ref for the loadData function to avoid dependency issues
  const loadDataRef = useRef<(() => Promise<void>) | null>(null);

  // Helper to get user ID consistently using stable user object
  const getUserIdForOperations = useCallback(async () => {
    const userId = user?.id;
    if (!userId) {
      setData(null);
      setIsLoading(false);
      return null;
    }
    return userId;
  }, [user?.id]); // Depend on user.id directly, not getUserId function

  const loadData = useCallback(
    async (showLoading = true) => {
      const userId = await getUserIdForOperations();
      if (!userId) {
        return;
      }

      try {
        if (showLoading) {
          setIsLoading(true);
        }
        setError(null);

        const sessions = await UserCacheService.getBrewSessions(
          userId,
          unitSystem
        );

        await UnifiedLogger.info(
          "useBrewSessions.loadData",
          `Loaded ${sessions.length} brew sessions`,
          { userId, sessionCount: sessions.length }
        );

        setData(sessions);

        // Update sync status
        const pending = await UserCacheService.getPendingOperationsCount();
        setPendingCount(pending);
      } catch (err) {
        await UnifiedLogger.error("useBrewSessions.loadData", "Error loading brew sessions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load brew sessions"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [getUserIdForOperations, unitSystem]
  );

  // Store the current loadData function in the ref
  loadDataRef.current = loadData;

  const create = useCallback(
    async (session: Partial<BrewSession>): Promise<BrewSession> => {
      const userId = await getUserIdForOperations();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const newSession = await UserCacheService.createBrewSession({
        ...session,
        user_id: userId,
      });

      // Refresh data
      await loadData(false);

      return newSession;
    },
    [getUserIdForOperations, loadData]
  );

  const update = useCallback(
    async (id: string, updates: Partial<BrewSession>): Promise<BrewSession> => {
      const userId = await getUserIdForOperations();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const updatedSession = await UserCacheService.updateBrewSession(id, {
        ...updates,
        user_id: userId,
      });

      // Refresh data
      await loadData(false);

      return updatedSession;
    },
    [getUserIdForOperations, loadData]
  );

  const deleteSession = useCallback(
    async (id: string): Promise<void> => {
      const userId = await getUserIdForOperations();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      await UserCacheService.deleteBrewSession(id, userId);

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

  // Note: Brew sessions don't support cloning operations (removed from plan)
  const clone = useCallback(async (_id: string): Promise<BrewSession> => {
    throw new Error("Brew session cloning is not supported");
  }, []);

  const getById = useCallback(
    async (id: string): Promise<BrewSession | null> => {
      const userId = await getUserIdForOperations();
      if (!userId) {
        return null;
      }

      const session = await UserCacheService.getBrewSessionById(id, userId);

      if (session) {
        await UnifiedLogger.info(
          "useBrewSessions.getById",
          `Retrieved brew session: ${session.name}`,
          {
            sessionId: id,
            realSessionId: session.id,
            userId,
            source: "offline_cache",
            status: session.status,
          }
        );
      }

      return session;
    },
    [getUserIdForOperations]
  );

  const refresh = useCallback(async (): Promise<void> => {
    const userIdForCache = await getUserIdForOperations();
    if (!userIdForCache) {
      return;
    }

    try {
      setIsLoading(true);

      await UnifiedLogger.info(
        "useBrewSessions.refresh",
        "Refreshing brew sessions from server",
        { userId: userIdForCache }
      );

      const refreshedSessions =
        await UserCacheService.refreshBrewSessionsFromServer(
          userIdForCache,
          unitSystem
        );

      await UnifiedLogger.info(
        "useBrewSessions.refresh",
        `Refresh completed: ${refreshedSessions.length} sessions`,
        { sessionCount: refreshedSessions.length }
      );

      setData(refreshedSessions);
      setError(null); // Only clear error on successful refresh

      // Update sync status
      const pending = await UserCacheService.getPendingOperationsCount();
      setPendingCount(pending);
      setLastSync(Date.now());
    } catch (error) {
      await UnifiedLogger.error("useBrewSessions.refresh", "Brew sessions refresh failed:", error);

      // Don't set error state for refresh failures - preserve offline cache
      // Try to load existing offline data to ensure offline-created sessions are available
      try {
        const offlineSessions = await UserCacheService.getBrewSessions(
          userIdForCache,
          unitSystem
        );

        await UnifiedLogger.info(
          "useBrewSessions.refresh",
          "Using offline cache after refresh failure",
          { offlineSessionCount: offlineSessions.length }
        );

        setData(offlineSessions);

        // Update sync status to reflect pending operations
        const pending = await UserCacheService.getPendingOperationsCount();
        setPendingCount(pending);
      } catch (cacheError) {
        await UnifiedLogger.error("useBrewSessions.refresh", "Failed to load offline brew session cache:", cacheError);
        // Only set error if we can't even load offline cache
        setError(
          error instanceof Error ? error.message : "Failed to refresh sessions"
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [getUserIdForOperations, unitSystem]);

  // Fermentation entry operations
  const addFermentationEntry = useCallback(
    async (
      sessionId: string,
      entry: Partial<import("@src/types").FermentationEntry>
    ): Promise<BrewSession> => {
      const updatedSession = await UserCacheService.addFermentationEntry(
        sessionId,
        entry
      );

      await UnifiedLogger.info(
        "useBrewSessions.addFermentationEntry",
        `Added fermentation entry to session ${sessionId}`,
        { sessionId, gravity: entry.gravity, temperature: entry.temperature }
      );

      // Refresh data
      await loadData(false);

      return updatedSession;
    },
    [loadData]
  );

  const updateFermentationEntry = useCallback(
    async (
      sessionId: string,
      entryIndex: number,
      updates: Partial<import("@src/types").FermentationEntry>
    ): Promise<BrewSession> => {
      const updatedSession = await UserCacheService.updateFermentationEntry(
        sessionId,
        entryIndex,
        updates
      );

      await UnifiedLogger.info(
        "useBrewSessions.updateFermentationEntry",
        `Updated fermentation entry ${entryIndex} in session ${sessionId}`,
        { sessionId, entryIndex }
      );

      // Refresh data
      await loadData(false);

      return updatedSession;
    },
    [loadData]
  );

  const deleteFermentationEntry = useCallback(
    async (sessionId: string, entryIndex: number): Promise<BrewSession> => {
      const updatedSession = await UserCacheService.deleteFermentationEntry(
        sessionId,
        entryIndex
      );

      await UnifiedLogger.info(
        "useBrewSessions.deleteFermentationEntry",
        `Deleted fermentation entry ${entryIndex} from session ${sessionId}`,
        { sessionId, entryIndex }
      );

      // Refresh data
      await loadData(false);

      return updatedSession;
    },
    [loadData]
  );

  // Dry-hop operations
  const addDryHopFromRecipe = useCallback(
    async (
      sessionId: string,
      dryHopData: import("@src/types").CreateDryHopFromRecipeRequest
    ): Promise<BrewSession> => {
      const updatedSession = await UserCacheService.addDryHopFromRecipe(
        sessionId,
        dryHopData
      );

      await UnifiedLogger.info(
        "useBrewSessions.addDryHopFromRecipe",
        `Added dry-hop ${dryHopData.hop_name} to session ${sessionId}`,
        { sessionId, hopName: dryHopData.hop_name, amount: dryHopData.amount }
      );

      // Refresh data
      await loadData(false);

      return updatedSession;
    },
    [loadData]
  );

  const removeDryHop = useCallback(
    async (sessionId: string, dryHopIndex: number): Promise<BrewSession> => {
      const updatedSession = await UserCacheService.removeDryHop(
        sessionId,
        dryHopIndex
      );

      await UnifiedLogger.info(
        "useBrewSessions.removeDryHop",
        `Removed dry-hop ${dryHopIndex} from session ${sessionId}`,
        { sessionId, dryHopIndex }
      );

      // Refresh data
      await loadData(false);

      return updatedSession;
    },
    [loadData]
  );

  const deleteDryHopAddition = useCallback(
    async (sessionId: string, dryHopIndex: number): Promise<BrewSession> => {
      const updatedSession = await UserCacheService.deleteDryHopAddition(
        sessionId,
        dryHopIndex
      );

      await UnifiedLogger.info(
        "useBrewSessions.deleteDryHopAddition",
        `Deleted dry-hop ${dryHopIndex} from session ${sessionId}`,
        { sessionId, dryHopIndex }
      );

      // Refresh data
      await loadData(false);

      return updatedSession;
    },
    [loadData]
  );

  // Load data on mount and when user changes
  useEffect(() => {
    const loadDataIfAuthenticated = async () => {
      const userId = await getUserIdForOperations();
      if (userId && loadDataRef.current) {
        loadDataRef.current();
      } else {
        setData(null);
        setIsLoading(false);
      }
    };

    loadDataIfAuthenticated();
  }, [getUserIdForOperations]);

  return useMemo(
    () => ({
      data,
      isLoading,
      error,
      pendingCount,
      conflictCount, // TODO: Implement conflict tracking
      lastSync,
      create,
      update,
      delete: deleteSession,
      clone,
      getById,
      sync,
      refresh,
      // Fermentation entry operations
      addFermentationEntry,
      updateFermentationEntry,
      deleteFermentationEntry,
      // Dry-hop operations
      addDryHopFromRecipe,
      removeDryHop,
      deleteDryHopAddition,
    }),
    [
      data,
      isLoading,
      error,
      pendingCount,
      conflictCount,
      lastSync,
      create,
      update,
      deleteSession,
      clone,
      getById,
      sync,
      refresh,
      addFermentationEntry,
      updateFermentationEntry,
      deleteFermentationEntry,
      addDryHopFromRecipe,
      removeDryHop,
      deleteDryHopAddition,
    ]
  );
}

/**
 * Offline-aware React Query hooks for recipes
 *
 * Provides seamless offline/online recipe management with React Query integration.
 * Automatically falls back to offline storage when network is unavailable.
 *
 * Features:
 * - Automatic offline/online switching
 * - Background sync when network returns
 * - Optimistic updates with rollback
 * - Conflict resolution UI hints
 * - Sync status indicators
 *
 * @example
 * ```typescript
 * const { data: recipes, isLoading } = useOfflineRecipes();
 * const createRecipe = useOfflineCreateRecipe();
 *
 * // Create recipe (works offline)
 * await createRecipe.mutateAsync(recipeData);
 * ```
 */

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNetwork } from "@contexts/NetworkContext";
import {
  OfflineRecipeService,
  OfflineRecipe,
} from "@services/offline/OfflineRecipeService";
import { QUERY_KEYS } from "@services/api/queryClient";
import { CreateRecipeRequest, UpdateRecipeRequest } from "@src/types";

/**
 * Hook for getting all recipes with offline support
 */
export function useOfflineRecipes() {
  const { isConnected } = useNetwork();

  return useQuery({
    queryKey: [...QUERY_KEYS.RECIPES, "offline"],
    queryFn: () => OfflineRecipeService.getAll(),
    staleTime: isConnected ? 5 * 60 * 1000 : Infinity, // 5min online, never stale offline
    gcTime: 24 * 60 * 60 * 1000, // Keep for 24 hours
    refetchOnMount: isConnected ? "always" : false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for getting single recipe with offline support
 */
export function useOfflineRecipe(id: string) {
  const { isConnected } = useNetwork();

  return useQuery({
    queryKey: [...QUERY_KEYS.RECIPE(id), "offline"],
    queryFn: () => OfflineRecipeService.getById(id),
    enabled: !!id,
    staleTime: isConnected ? 5 * 60 * 1000 : Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: isConnected ? "always" : false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for creating recipes with offline support
 */
export function useOfflineCreateRecipe() {
  const queryClient = useQueryClient();
  const { isConnected } = useNetwork();

  return useMutation({
    mutationFn: (recipeData: CreateRecipeRequest) =>
      OfflineRecipeService.create(recipeData),

    onMutate: async newRecipe => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [...QUERY_KEYS.RECIPES, "offline"],
      });

      // Snapshot the previous value
      const previousRecipes = queryClient.getQueryData<OfflineRecipe[]>([
        ...QUERY_KEYS.RECIPES,
        "offline",
      ]);

      // Optimistically update to the new value
      // Validate required fields
      if (!newRecipe.name || !newRecipe.style) {
        throw new Error("Recipe name and style are required");
      }

      const optimisticRecipe: OfflineRecipe = {
        id: `optimistic_${Date.now()}`,
        ...newRecipe,
        isOffline: !isConnected,
        lastModified: Date.now(),
        syncStatus: isConnected ? "synced" : "pending",
        user_id: "current_user",
        is_public: false,
        is_owner: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      };

      queryClient.setQueryData<OfflineRecipe[]>(
        [...QUERY_KEYS.RECIPES, "offline"],
        old => [optimisticRecipe, ...(old || [])]
      );

      // Return a context object with the snapshotted value
      return { previousRecipes };
    },

    onError: (err, newRecipe, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(
        [...QUERY_KEYS.RECIPES, "offline"],
        context?.previousRecipes
      );
    },

    onSuccess: data => {
      // Update the cache with the actual result
      queryClient.setQueryData<OfflineRecipe[]>(
        [...QUERY_KEYS.RECIPES, "offline"],
        old => {
          const updated =
            old?.filter(r => !r.id.startsWith("optimistic_")) || [];
          return [data, ...updated];
        }
      );
    },

    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.RECIPES, "offline"],
      });
    },
  });
}

/**
 * Hook for updating recipes with offline support
 */
export function useOfflineUpdateRecipe() {
  const queryClient = useQueryClient();
  const { isConnected } = useNetwork();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRecipeRequest }) =>
      OfflineRecipeService.update(id, data),

    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [...QUERY_KEYS.RECIPES, "offline"],
      });
      await queryClient.cancelQueries({
        queryKey: [...QUERY_KEYS.RECIPE(id), "offline"],
      });

      // Snapshot the previous values
      const previousRecipes = queryClient.getQueryData<OfflineRecipe[]>([
        ...QUERY_KEYS.RECIPES,
        "offline",
      ]);
      const previousRecipe = queryClient.getQueryData<OfflineRecipe>([
        ...QUERY_KEYS.RECIPE(id),
        "offline",
      ]);

      // Optimistically update the recipe
      if (previousRecipe) {
        const updatedRecipe: OfflineRecipe = {
          ...previousRecipe,
          ...data,
          lastModified: Date.now(),
          syncStatus: isConnected ? "synced" : "pending",
          updated_at: new Date().toISOString(),
        };

        // Update single recipe cache
        queryClient.setQueryData(
          [...QUERY_KEYS.RECIPE(id), "offline"],
          updatedRecipe
        );

        // Update recipes list cache
        queryClient.setQueryData<OfflineRecipe[]>(
          [...QUERY_KEYS.RECIPES, "offline"],
          old => old?.map(r => (r.id === id ? updatedRecipe : r)) || []
        );
      }

      return { previousRecipes, previousRecipe };
    },

    onError: (err, { id }, context) => {
      // Rollback on error
      queryClient.setQueryData(
        [...QUERY_KEYS.RECIPES, "offline"],
        context?.previousRecipes
      );
      queryClient.setQueryData(
        [...QUERY_KEYS.RECIPE(id), "offline"],
        context?.previousRecipe
      );
    },

    onSuccess: (data, { id }) => {
      // Update caches with actual result
      queryClient.setQueryData([...QUERY_KEYS.RECIPE(id), "offline"], data);
      queryClient.setQueryData<OfflineRecipe[]>(
        [...QUERY_KEYS.RECIPES, "offline"],
        old =>
          old?.map(r =>
            r.id === id || (r.tempId && r.tempId === id) ? data : r
          ) || []
      );
    },

    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.RECIPES, "offline"],
      });
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.RECIPE(id), "offline"],
      });
    },
  });
}

/**
 * Hook for deleting recipes with offline support
 */
export function useOfflineDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => OfflineRecipeService.delete(id),

    onMutate: async id => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [...QUERY_KEYS.RECIPES, "offline"],
      });

      // Snapshot the previous value
      const previousRecipes = queryClient.getQueryData<OfflineRecipe[]>([
        ...QUERY_KEYS.RECIPES,
        "offline",
      ]);

      // Optimistically remove the recipe
      queryClient.setQueryData<OfflineRecipe[]>(
        [...QUERY_KEYS.RECIPES, "offline"],
        old =>
          old?.filter(r => r.id !== id && !(r.tempId && r.tempId === id)) || []
      );

      return { previousRecipes };
    },

    onError: (err, id, context) => {
      // Rollback on error
      queryClient.setQueryData(
        [...QUERY_KEYS.RECIPES, "offline"],
        context?.previousRecipes
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.RECIPES, "offline"],
      });
    },
  });
}

/**
 * Hook for sync status information
 */
export function useOfflineSyncStatus() {
  const { isConnected } = useNetwork();

  return useQuery({
    queryKey: ["offline", "sync-status"],
    queryFn: () => OfflineRecipeService.getSyncStatus(),
    refetchInterval: isConnected ? 30000 : false, // Refetch every 30s when online
    staleTime: 10000, // Consider fresh for 10 seconds
  });
}

/**
 * Hook for manually triggering sync
 */
export function useOfflineSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => OfflineRecipeService.syncPendingChanges(),

    onSuccess: result => {
      // Invalidate all recipe queries after successful sync
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.RECIPES, "offline"],
      });
      queryClient.invalidateQueries({ queryKey: ["offline", "sync-status"] });

      console.log(
        `Sync completed: ${result.success} successful, ${result.failed} failed`
      );
    },

    onError: error => {
      console.error("Sync failed:", error);
    },
  });
}

/**
 * Hook that automatically syncs when network becomes available
 */
export function useAutoOfflineSync() {
  const { isConnected } = useNetwork();
  const syncMutation = useOfflineSync();
  const { mutate } = syncMutation;
  const lastSyncRef = useRef<number | null>(null);
  const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  // Trigger sync when network becomes available
  useEffect(() => {
    if (!isConnected || syncMutation.isPending) {
      return;
    }
    const now = Date.now();
    const canSync =
      lastSyncRef.current == null ||
      now - lastSyncRef.current > SYNC_COOLDOWN_MS;
    if (canSync) {
      mutate();
      lastSyncRef.current = now;
    }
  }, [isConnected, syncMutation.isPending, mutate, SYNC_COOLDOWN_MS]);
  return syncMutation;
}

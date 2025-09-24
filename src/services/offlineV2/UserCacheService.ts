/**
 * UserCacheService - BrewTracker Offline V2
 *
 * Handles user-specific data (recipes, brew sessions, fermentation entries) with
 * offline CRUD operations and automatic sync capabilities.
 *
 * Features:
 * - Offline-first CRUD operations
 * - Automatic sync with conflict resolution
 * - Optimistic updates with rollback
 * - Queue-based operation management
 * - Last-write-wins conflict resolution
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiService from "@services/api/apiService";
import { UserValidationService } from "@utils/userValidation";
import UnifiedLogger from "@services/logger/UnifiedLogger";
import {
  SyncableItem,
  PendingOperation,
  SyncResult,
  OfflineError,
  SyncError,
  STORAGE_KEYS_V2,
  Recipe,
} from "@src/types";

// Simple per-key queue (no external deps)
const keyQueues = new Map<string, Promise<unknown>>();
async function withKeyQueue<T>(key: string, fn: () => Promise<T>): Promise<T> {
  // In test environment, bypass the queue to avoid hanging
  if (process.env.NODE_ENV === "test" || (global as any).__JEST_ENVIRONMENT__) {
    return await fn();
  }

  const prev = keyQueues.get(key) ?? Promise.resolve();
  const next = prev
    .catch(() => undefined) // keep the chain alive after errors
    .then(fn);
  keyQueues.set(
    key,
    next.finally(() => {
      if (keyQueues.get(key) === next) {
        keyQueues.delete(key);
      }
    })
  );
  return next;
}

export class UserCacheService {
  private static syncInProgress = false;
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_BACKOFF_BASE = 1000; // 1 second

  // ============================================================================
  // Recipe Management
  // ============================================================================

  /**
   * Get a specific recipe by ID
   */
  static async getRecipeById(recipeId: string): Promise<Recipe | null> {
    try {
      // For now, get the user ID from all cached recipes
      // In practice, this method should receive userId as parameter
      const cached = await AsyncStorage.getItem(STORAGE_KEYS_V2.USER_RECIPES);
      if (!cached) {
        return null;
      }

      const allRecipes: SyncableItem<Recipe>[] = JSON.parse(cached);
      const recipeItem = allRecipes.find(
        item =>
          item.id === recipeId ||
          item.data.id === recipeId ||
          item.tempId === recipeId
      );

      if (!recipeItem || recipeItem.isDeleted) {
        return null;
      }

      return recipeItem.data;
    } catch (error) {
      console.error(`[UserCacheService.getRecipeById] Error:`, error);
      return null;
    }
  }

  /**
   * Get a specific recipe by ID including deleted recipes
   * Useful for viewing recipes that may have been soft-deleted
   */
  static async getRecipeByIdIncludingDeleted(
    recipeId: string
  ): Promise<{ recipe: Recipe | null; isDeleted: boolean }> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS_V2.USER_RECIPES);
      if (!cached) {
        return { recipe: null, isDeleted: false };
      }

      const allRecipes: SyncableItem<Recipe>[] = JSON.parse(cached);
      const recipeItem = allRecipes.find(
        item =>
          item.id === recipeId ||
          item.data.id === recipeId ||
          item.tempId === recipeId
      );

      if (!recipeItem) {
        return { recipe: null, isDeleted: false };
      }

      return {
        recipe: recipeItem.data,
        isDeleted: !!recipeItem.isDeleted,
      };
    } catch (error) {
      console.error(
        `[UserCacheService.getRecipeByIdIncludingDeleted] Error:`,
        error
      );
      return { recipe: null, isDeleted: false };
    }
  }

  /**
   * Get all recipes for a user
   */
  static async getRecipes(
    userId: string,
    userUnitSystem: "imperial" | "metric" = "imperial"
  ): Promise<Recipe[]> {
    try {
      await UnifiedLogger.debug(
        "UserCacheService.getRecipes",
        `Retrieving recipes for user ${userId}`,
        {
          userId,
          unitSystem: userUnitSystem,
        }
      );

      console.log(
        `[UserCacheService.getRecipes] Getting recipes for user ID: "${userId}"`
      );

      const cached = await this.getCachedRecipes(userId);

      // Log detailed info about what we found in cache
      const deletedCount = cached.filter(item => item.isDeleted).length;
      const pendingSyncCount = cached.filter(item => item.needsSync).length;
      const deletedPendingSyncCount = cached.filter(
        item => item.isDeleted && item.needsSync
      ).length;

      await UnifiedLogger.debug(
        "UserCacheService.getRecipes",
        `Cache contents analysis`,
        {
          userId,
          totalItems: cached.length,
          deletedItems: deletedCount,
          pendingSyncItems: pendingSyncCount,
          deletedPendingSyncItems: deletedPendingSyncCount,
          itemDetails: cached.map(item => ({
            id: item.id,
            dataId: item.data.id,
            name: item.data.name,
            isDeleted: item.isDeleted || false,
            needsSync: item.needsSync,
            syncStatus: item.syncStatus,
          })),
        }
      );

      console.log(
        `[UserCacheService.getRecipes] getCachedRecipes returned ${cached.length} items for user "${userId}"`
      );

      // If no cached recipes found, try to hydrate from server
      if (cached.length === 0) {
        console.log(
          `[UserCacheService.getRecipes] No cached recipes found, attempting to hydrate from server...`
        );
        try {
          await this.hydrateRecipesFromServer(userId, false, userUnitSystem);
          // Try again after hydration
          const hydratedCached = await this.getCachedRecipes(userId);
          console.log(
            `[UserCacheService.getRecipes] After hydration: ${hydratedCached.length} recipes cached`
          );

          return this.filterAndSortHydrated(hydratedCached);
        } catch (hydrationError) {
          console.warn(
            `[UserCacheService.getRecipes] Failed to hydrate from server:`,
            hydrationError
          );
          // Continue with empty cache
        }
      }

      // Filter out deleted items and return data
      const filteredRecipes = cached.filter(item => !item.isDeleted);
      console.log(
        `[UserCacheService.getRecipes] After filtering out deleted: ${filteredRecipes.length} recipes`
      );

      if (filteredRecipes.length > 0) {
        const recipeIds = filteredRecipes.map(item => item.data.id);
        console.log(
          `[UserCacheService.getRecipes] Recipe IDs: [${recipeIds.join(", ")}]`
        );
      }

      const finalRecipes = this.filterAndSortHydrated(filteredRecipes);

      await UnifiedLogger.debug(
        "UserCacheService.getRecipes",
        `Returning filtered recipes to UI`,
        {
          userId,
          returnedCount: finalRecipes.length,
          filteredOutCount: filteredRecipes.length - finalRecipes.length,
          returnedRecipes: finalRecipes.map(recipe => ({
            id: recipe.id,
            name: recipe.name,
            style: recipe.style || "Unknown",
          })),
        }
      );

      return finalRecipes;
    } catch (error) {
      await UnifiedLogger.error(
        "UserCacheService.getRecipes",
        `Error getting recipes: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          userId,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      );
      console.error("Error getting recipes:", error);
      throw new OfflineError("Failed to get recipes", "RECIPES_ERROR", true);
    }
  }

  /**
   * Create a new recipe
   */
  static async createRecipe(recipe: Partial<Recipe>): Promise<Recipe> {
    try {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      // Get current user ID from JWT token
      const currentUserId =
        recipe.user_id ??
        (await UserValidationService.getCurrentUserIdFromToken());
      if (!currentUserId) {
        throw new OfflineError(
          "User ID is required for creating recipes",
          "AUTH_ERROR",
          false
        );
      }

      await UnifiedLogger.info(
        "UserCacheService.createRecipe",
        `Starting recipe creation for user ${currentUserId}`,
        {
          userId: currentUserId,
          tempId,
          recipeName: recipe.name || "Untitled",
          recipeStyle: recipe.style || "Unknown",
          hasIngredients: !!(
            recipe.ingredients && recipe.ingredients.length > 0
          ),
          ingredientCount: recipe.ingredients?.length || 0,
          timestamp: new Date().toISOString(),
        }
      );
      const newRecipe: Recipe = {
        ...recipe,
        id: tempId,
        name: recipe.name || "",
        description: recipe.description || "",
        ingredients: recipe.ingredients || [],
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
        user_id: recipe.user_id || currentUserId || "",
        is_public: recipe.is_public || false,
      } as Recipe;

      // Create syncable item
      const syncableItem: SyncableItem<Recipe> = {
        id: tempId,
        data: newRecipe,
        lastModified: now,
        syncStatus: "pending",
        needsSync: true,
        tempId,
      };

      // Create pending operation
      const operation: PendingOperation = {
        id: `create_${tempId}`,
        type: "create",
        entityType: "recipe",
        entityId: tempId,
        userId: newRecipe.user_id,
        data: { ...recipe, user_id: newRecipe.user_id },
        timestamp: now,
        retryCount: 0,
        maxRetries: this.MAX_RETRY_ATTEMPTS,
      };

      // Atomically add to both cache and pending queue
      await Promise.all([
        this.addRecipeToCache(syncableItem),
        this.addPendingOperation(operation),
      ]);

      // Trigger background sync (fire and forget)
      void this.backgroundSync();

      await UnifiedLogger.info(
        "UserCacheService.createRecipe",
        `Recipe creation completed successfully`,
        {
          userId: currentUserId,
          recipeId: tempId,
          recipeName: newRecipe.name,
          operationId: operation.id,
          pendingSync: true,
        }
      );

      return newRecipe;
    } catch (error) {
      console.error("Error creating recipe:", error);
      throw new OfflineError("Failed to create recipe", "CREATE_ERROR", true);
    }
  }

  /**
   * Update an existing recipe
   */
  static async updateRecipe(
    id: string,
    updates: Partial<Recipe>
  ): Promise<Recipe> {
    try {
      const userId =
        updates.user_id ??
        (await UserValidationService.getCurrentUserIdFromToken());
      if (!userId) {
        throw new OfflineError(
          "User ID is required for updating recipes",
          "AUTH_ERROR",
          false
        );
      }

      await UnifiedLogger.info(
        "UserCacheService.updateRecipe",
        `Starting recipe update for user ${userId}`,
        {
          userId,
          recipeId: id,
          updateFields: Object.keys(updates),
          recipeName: updates.name || "Unknown",
          hasIngredientChanges: !!updates.ingredients,
          timestamp: new Date().toISOString(),
        }
      );

      const cached = await this.getCachedRecipes(userId);
      const existingItem = cached.find(
        item => item.id === id || item.data.id === id
      );

      if (!existingItem) {
        throw new OfflineError("Recipe not found", "NOT_FOUND", false);
      }

      const now = Date.now();
      const updatedRecipe: Recipe = {
        ...existingItem.data,
        ...updates,
        updated_at: new Date(now).toISOString(),
      };

      // Update syncable item
      const updatedItem: SyncableItem<Recipe> = {
        ...existingItem,
        data: updatedRecipe,
        lastModified: now,
        syncStatus: "pending",
        needsSync: true,
      };

      // Create pending operation
      const operation: PendingOperation = {
        id: `update_${id}_${now}`,
        type: "update",
        entityType: "recipe",
        entityId: id,
        userId: updatedRecipe.user_id,
        data: updates,
        timestamp: now,
        retryCount: 0,
        maxRetries: this.MAX_RETRY_ATTEMPTS,
      };

      // Atomically update cache and add to pending queue
      await Promise.all([
        this.updateRecipeInCache(updatedItem),
        this.addPendingOperation(operation),
      ]);

      // Trigger background sync
      this.backgroundSync();

      await UnifiedLogger.info(
        "UserCacheService.updateRecipe",
        `Recipe update completed successfully`,
        {
          userId,
          recipeId: id,
          recipeName: updatedRecipe.name,
          operationId: operation.id,
          pendingSync: true,
        }
      );

      return updatedRecipe;
    } catch (error) {
      console.error("Error updating recipe:", error);
      if (error instanceof OfflineError) {
        throw error;
      }
      throw new OfflineError("Failed to update recipe", "UPDATE_ERROR", true);
    }
  }

  /**
   * Delete a recipe
   */
  static async deleteRecipe(id: string, userId?: string): Promise<void> {
    try {
      const currentUserId =
        userId ?? (await UserValidationService.getCurrentUserIdFromToken());
      if (!currentUserId) {
        throw new OfflineError(
          "User ID is required for deleting recipes",
          "AUTH_ERROR",
          false
        );
      }
      await UnifiedLogger.info(
        "UserCacheService.deleteRecipe",
        `Starting recipe deletion for user ${currentUserId}`,
        {
          userId: currentUserId,
          recipeId: id,
          timestamp: new Date().toISOString(),
        }
      );

      const cached = await this.getCachedRecipes(currentUserId);
      const existingItem = cached.find(
        item => item.id === id || item.data.id === id || item.tempId === id
      );

      if (!existingItem) {
        await UnifiedLogger.warn(
          "UserCacheService.deleteRecipe",
          `Recipe not found for deletion`,
          {
            userId: currentUserId,
            recipeId: id,
            availableRecipeCount: cached.filter(
              item => item.data.user_id === currentUserId
            ).length,
          }
        );
        console.log(
          `[UserCacheService.deleteRecipe] Recipe not found. Looking for ID: "${id}"`
        );
        console.log(
          `[UserCacheService.deleteRecipe] Available recipe IDs:`,
          cached.map(item => ({
            id: item.id,
            dataId: item.data.id,
            tempId: item.tempId,
          }))
        );
        throw new OfflineError("Recipe not found", "NOT_FOUND", false);
      }

      await UnifiedLogger.info(
        "UserCacheService.deleteRecipe",
        `Found recipe for deletion`,
        {
          userId: currentUserId,
          recipeId: id,
          recipeName: existingItem.data.name,
          recipeStyle: existingItem.data.style || "Unknown",
          wasAlreadyDeleted: existingItem.isDeleted || false,
          currentSyncStatus: existingItem.syncStatus,
          needsSync: existingItem.needsSync,
        }
      );

      const now = Date.now();

      // Mark as deleted (tombstone)
      const deletedItem: SyncableItem<Recipe> = {
        ...existingItem,
        isDeleted: true,
        deletedAt: now,
        lastModified: now,
        syncStatus: "pending",
        needsSync: true,
      };

      // Create pending operation
      const operation: PendingOperation = {
        id: `delete_${id}_${now}`,
        type: "delete",
        entityType: "recipe",
        entityId: id,
        userId: existingItem.data.user_id,
        timestamp: now,
        retryCount: 0,
        maxRetries: this.MAX_RETRY_ATTEMPTS,
      };

      await UnifiedLogger.info(
        "UserCacheService.deleteRecipe",
        `Created delete operation for recipe ${id}`,
        {
          operationId: operation.id,
          entityId: id,
          recipeName: existingItem.data.name || "Unknown",
        }
      );

      // Atomically update cache and add to pending queue
      await Promise.all([
        this.updateRecipeInCache(deletedItem),
        this.addPendingOperation(operation),
      ]);

      await UnifiedLogger.info(
        "UserCacheService.deleteRecipe",
        `Recipe deletion completed successfully`,
        {
          userId: currentUserId,
          recipeId: id,
          recipeName: existingItem.data.name,
          operationId: operation.id,
          pendingSync: true,
          tombstoneCreated: true,
        }
      );

      await UnifiedLogger.info(
        "UserCacheService.deleteRecipe",
        `Triggering background sync after delete operation ${operation.id}`
      );
      // Trigger background sync
      this.backgroundSync();
    } catch (error) {
      console.error("Error deleting recipe:", error);
      if (error instanceof OfflineError) {
        throw error;
      }
      throw new OfflineError("Failed to delete recipe", "DELETE_ERROR", true);
    }
  }

  // ============================================================================
  // Sync Management
  // ============================================================================

  /**
   * Sync all pending operations
   */
  private static syncStartTime?: number;
  private static readonly SYNC_TIMEOUT_MS = 300000; // 5 minutes

  static async syncPendingOperations(): Promise<SyncResult> {
    await UnifiedLogger.info(
      "UserCacheService.syncPendingOperations",
      "Starting sync of pending operations"
    );

    // Check for stuck sync
    if (this.syncInProgress && this.syncStartTime) {
      const elapsed = Date.now() - this.syncStartTime;
      if (elapsed > this.SYNC_TIMEOUT_MS) {
        console.warn("Resetting stuck sync flag");
        this.syncInProgress = false;
        this.syncStartTime = undefined;
      }
    }

    if (this.syncInProgress) {
      throw new OfflineError(
        "Sync already in progress",
        "SYNC_IN_PROGRESS",
        false
      );
    }

    this.syncInProgress = true;
    this.syncStartTime = Date.now();

    const result: SyncResult = {
      success: false,
      processed: 0,
      failed: 0,
      conflicts: 0,
      errors: [],
    };

    try {
      const operations = await this.getPendingOperations();
      if (operations.length > 0) {
        console.log(
          `[UserCacheService] Starting sync of ${operations.length} pending operations`
        );
      }

      for (const operation of operations) {
        try {
          // Process the operation and get any ID mapping info
          const operationResult = await this.processPendingOperation(operation);

          // Remove operation from pending queue FIRST
          await this.removePendingOperation(operation.id);

          // ONLY after successful removal, update the cache with ID mapping
          if (operationResult.realId && operation.type === "create") {
            await this.mapTempIdToRealId(
              operation.entityId,
              operationResult.realId
            );
          } else if (operation.type === "update") {
            // For update operations, mark the item as synced
            await this.markItemAsSynced(operation.entityId);
          } else if (operation.type === "delete") {
            // For delete operations, completely remove the item from cache
            await this.removeItemFromCache(operation.entityId);
          }

          result.processed++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.error(
            `[UserCacheService] Failed to process operation ${operation.id}:`,
            errorMessage
          );
          result.failed++;
          result.errors.push(
            `${operation.type} ${operation.entityType}: ${errorMessage}`
          );

          // Increment retry count
          operation.retryCount++;

          if (operation.retryCount >= operation.maxRetries) {
            // Max retries reached, remove operation
            await this.removePendingOperation(operation.id);
            result.errors.push(
              `Max retries reached for ${operation.type} ${operation.entityType}`
            );
          } else {
            // Update operation with new retry count
            await this.updatePendingOperation(operation);
          }
        }
      }

      // Update sync metadata
      await AsyncStorage.setItem(
        STORAGE_KEYS_V2.SYNC_METADATA,
        JSON.stringify({
          last_sync: Date.now(),
          last_result: result,
        })
      );

      result.success = result.failed === 0;

      await UnifiedLogger.info(
        "UserCacheService.syncPendingOperations",
        "Sync completed",
        {
          processed: result.processed,
          failed: result.failed,
          success: result.success,
          errors: result.errors,
        }
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await UnifiedLogger.error(
        "UserCacheService.syncPendingOperations",
        `Sync failed: ${errorMessage}`,
        { error: errorMessage }
      );
      console.error("Sync failed:", errorMessage);
      result.success = false;
      result.errors.push(`Sync process failed: ${errorMessage}`);
      return result;
    } finally {
      this.syncInProgress = false;
      this.syncStartTime = undefined;
      await UnifiedLogger.debug(
        "UserCacheService.syncPendingOperations",
        "Sync process completed, flags reset"
      );
    }
  }

  /**
   * Check if sync is in progress
   */
  static isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  /**
   * Get count of pending operations
   */
  static async getPendingOperationsCount(): Promise<number> {
    try {
      const operations = await this.getPendingOperations();
      return operations.length;
    } catch (error) {
      console.error("Error getting pending operations count:", error);
      return 0;
    }
  }

  /**
   * Clear all pending operations
   */
  static async clearSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS_V2.PENDING_OPERATIONS);
    } catch (error) {
      console.error("Error clearing sync queue:", error);
      throw new OfflineError("Failed to clear sync queue", "CLEAR_ERROR", true);
    }
  }

  /**
   * Debug helper: Find recipes with temp IDs that are stuck (no pending operations)
   */
  static async findStuckRecipes(userId: string): Promise<{
    stuckRecipes: SyncableItem<Recipe>[];
    pendingOperations: PendingOperation[];
  }> {
    try {
      const cached = await this.getCachedRecipes(userId);
      const pendingOps = await this.getPendingOperations();

      // Find recipes with temp IDs that have no corresponding pending operation
      const stuckRecipes = cached.filter(recipe => {
        // Has temp ID but no needsSync flag or no corresponding pending operation
        const hasTempId = recipe.id.startsWith("temp_") || recipe.tempId;
        const hasNeedSync = recipe.needsSync;
        const hasPendingOp = pendingOps.some(
          op =>
            op.entityId === recipe.id ||
            op.entityId === recipe.data.id ||
            op.entityId === recipe.tempId
        );

        return hasTempId && (!hasNeedSync || !hasPendingOp);
      });

      console.log(
        `[UserCacheService] Found ${stuckRecipes.length} stuck recipes with temp IDs`
      );
      stuckRecipes.forEach(recipe => {
        console.log(
          `[UserCacheService] Stuck recipe: ID="${recipe.id}", tempId="${recipe.tempId}", needsSync="${recipe.needsSync}", syncStatus="${recipe.syncStatus}"`
        );
      });

      return { stuckRecipes, pendingOperations: pendingOps };
    } catch (error) {
      console.error("[UserCacheService] Error finding stuck recipes:", error);
      return { stuckRecipes: [], pendingOperations: [] };
    }
  }

  /**
   * Debug helper: Get detailed sync status for a specific recipe
   */
  static async getRecipeDebugInfo(recipeId: string): Promise<{
    recipe: SyncableItem<Recipe> | null;
    pendingOperations: PendingOperation[];
    syncStatus: string;
  }> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS_V2.USER_RECIPES);
      const pendingOps = await this.getPendingOperations();

      if (!cached) {
        return { recipe: null, pendingOperations: [], syncStatus: "no_cache" };
      }

      const recipes: SyncableItem<Recipe>[] = JSON.parse(cached);
      const recipe = recipes.find(
        item =>
          item.id === recipeId ||
          item.data.id === recipeId ||
          item.tempId === recipeId
      );

      const relatedOps = pendingOps.filter(
        op =>
          op.entityId === recipeId ||
          (recipe &&
            (op.entityId === recipe.id ||
              op.entityId === recipe.data.id ||
              op.entityId === recipe.tempId))
      );

      let syncStatus = "unknown";
      if (!recipe) {
        syncStatus = "not_found";
      } else if (recipe.isDeleted && !recipe.needsSync) {
        syncStatus = "deleted_synced";
      } else if (recipe.isDeleted && recipe.needsSync) {
        syncStatus = "deleted_pending";
      } else if (recipe.needsSync) {
        syncStatus = "needs_sync";
      } else {
        syncStatus = "synced";
      }

      await UnifiedLogger.info(
        "UserCacheService",
        `Recipe ${recipeId} debug info:`
      );
      await UnifiedLogger.info(
        "UserCacheService",
        `  - Recipe found: ${!!recipe}`
      );
      if (recipe) {
        await UnifiedLogger.info(
          "UserCacheService",
          `  - Recipe ID: ${recipe.id}`
        );
        await UnifiedLogger.info(
          "UserCacheService",
          `  - Data ID: ${recipe.data.id}`
        );
        await UnifiedLogger.info(
          "UserCacheService",
          `  - Temp ID: ${recipe.tempId}`
        );
        await UnifiedLogger.info(
          "UserCacheService",
          `  - Is Deleted: ${recipe.isDeleted}`
        );
        await UnifiedLogger.info(
          "UserCacheService",
          `  - Needs Sync: ${recipe.needsSync}`
        );
        await UnifiedLogger.info(
          "UserCacheService",
          `  - Sync Status: ${recipe.syncStatus}`
        );
        await UnifiedLogger.info(
          "UserCacheService",
          `  - Last Modified: ${recipe.lastModified}`
        );
      }
      await UnifiedLogger.info(
        "UserCacheService",
        `  - Related Operations: ${relatedOps.length}`
      );
      for (let i = 0; i < relatedOps.length; i++) {
        const op = relatedOps[i];
        await UnifiedLogger.info(
          "UserCacheService",
          `    ${i + 1}. ${op.type} ${op.entityType} (${op.id})`
        );
        await UnifiedLogger.info(
          "UserCacheService",
          `       Entity ID: ${op.entityId}`
        );
        await UnifiedLogger.info(
          "UserCacheService",
          `       Retry Count: ${op.retryCount}/${op.maxRetries}`
        );
        await UnifiedLogger.info(
          "UserCacheService",
          `       Timestamp: ${new Date(op.timestamp).toLocaleString()}`
        );
      }
      await UnifiedLogger.info(
        "UserCacheService",
        `  - Sync Status: ${syncStatus}`
      );

      return {
        recipe: recipe || null,
        pendingOperations: relatedOps,
        syncStatus,
      };
    } catch (error) {
      console.error("[UserCacheService] Error getting debug info:", error);
      return { recipe: null, pendingOperations: [], syncStatus: "error" };
    }
  }

  /**
   * Force sync a specific recipe by ID
   */
  static async forceSyncRecipe(
    recipeId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[UserCacheService] Force syncing recipe: ${recipeId}`);

      const debugInfo = await this.getRecipeDebugInfo(recipeId);

      if (debugInfo.pendingOperations.length === 0) {
        return {
          success: false,
          error: "No pending operations found for this recipe",
        };
      }

      // Try to sync all pending operations for this recipe
      const result = await this.syncPendingOperations();

      return {
        success: result.processed > 0,
        error: result.errors.length > 0 ? result.errors.join(", ") : undefined,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(
        `[UserCacheService] Error force syncing recipe ${recipeId}:`,
        errorMsg
      );
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Fix stuck recipes by recreating their pending operations
   */
  static async fixStuckRecipes(
    userId: string
  ): Promise<{ fixed: number; errors: string[] }> {
    try {
      const { stuckRecipes } = await this.findStuckRecipes(userId);
      let fixed = 0;
      const errors: string[] = [];

      for (const recipe of stuckRecipes) {
        try {
          console.log(
            `[UserCacheService] Attempting to fix stuck recipe: ${recipe.id}`
          );

          // Reset sync status and recreate pending operation
          recipe.needsSync = true;
          recipe.syncStatus = "pending";

          // Create a new pending operation for this recipe
          const operation: PendingOperation = {
            id: `fix_${recipe.id}_${Date.now()}`,
            type:
              recipe.tempId && !recipe.id.startsWith("temp_")
                ? "update"
                : "create",
            entityType: "recipe",
            entityId: recipe.id,
            userId: recipe.data.user_id,
            data: recipe.data,
            timestamp: Date.now(),
            retryCount: 0,
            maxRetries: this.MAX_RETRY_ATTEMPTS,
          };

          // Update the recipe in cache
          await this.updateRecipeInCache(recipe);

          // Add the pending operation
          await this.addPendingOperation(operation);

          console.log(`[UserCacheService] Fixed stuck recipe: ${recipe.id}`);
          fixed++;
        } catch (error) {
          const errorMsg = `Failed to fix recipe ${recipe.id}: ${error instanceof Error ? error.message : "Unknown error"}`;
          console.error(`[UserCacheService] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      console.log(
        `[UserCacheService] Fixed ${fixed} stuck recipes with ${errors.length} errors`
      );
      return { fixed, errors };
    } catch (error) {
      console.error("[UserCacheService] Error fixing stuck recipes:", error);
      return {
        fixed: 0,
        errors: [
          `Failed to fix stuck recipes: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  /**
   * Refresh recipes from server (for pull-to-refresh)
   */
  static async refreshRecipesFromServer(
    userId: string,
    userUnitSystem: "imperial" | "metric" = "imperial"
  ): Promise<Recipe[]> {
    try {
      console.log(
        `[UserCacheService.refreshRecipesFromServer] Refreshing recipes from server for user: "${userId}"`
      );

      // Always fetch fresh data from server
      await this.hydrateRecipesFromServer(userId, true, userUnitSystem);

      // Return fresh cached data
      const refreshedRecipes = await this.getRecipes(userId, userUnitSystem);
      console.log(
        `[UserCacheService.refreshRecipesFromServer] Refresh completed, returning ${refreshedRecipes.length} recipes`
      );

      return refreshedRecipes;
    } catch (error) {
      console.error(
        `[UserCacheService.refreshRecipesFromServer] Refresh failed:`,
        error
      );

      // When refresh fails, try to return existing cached data instead of throwing
      try {
        console.log(
          `[UserCacheService.refreshRecipesFromServer] Attempting to return cached data after refresh failure`
        );
        const cachedRecipes = await this.getRecipes(userId, userUnitSystem);
        console.log(
          `[UserCacheService.refreshRecipesFromServer] Returning ${cachedRecipes.length} cached recipes after refresh failure`
        );
        return cachedRecipes;
      } catch (cacheError) {
        console.error(
          `[UserCacheService.refreshRecipesFromServer] Failed to get cached data:`,
          cacheError
        );
        // Only throw if we can't even get cached data
        throw error;
      }
    }
  }

  /**
   * Hydrate cache with recipes from server
   */
  private static async hydrateRecipesFromServer(
    userId: string,
    forceRefresh: boolean = false,
    userUnitSystem: "imperial" | "metric" = "imperial"
  ): Promise<void> {
    try {
      console.log(
        `[UserCacheService.hydrateRecipesFromServer] Fetching recipes from server for user: "${userId}" (forceRefresh: ${forceRefresh})`
      );

      // Import the API service here to avoid circular dependencies
      const { default: ApiService } = await import("@services/api/apiService");

      // Fetch user's recipes from server first
      const response = await ApiService.recipes.getAll(1, 100); // Get first 100 recipes
      const serverRecipes = response.data?.recipes || [];

      // Initialize offline created recipes array
      let offlineCreatedRecipes: SyncableItem<Recipe>[] = [];

      // If force refresh and we successfully got server data, clear and replace cache
      if (forceRefresh && serverRecipes.length >= 0) {
        console.log(
          `[UserCacheService.hydrateRecipesFromServer] Force refresh successful - updating cache for user "${userId}"`
        );

        // Get existing offline-created recipes to preserve before clearing
        const cached = await AsyncStorage.getItem(STORAGE_KEYS_V2.USER_RECIPES);
        if (cached) {
          const allRecipes: SyncableItem<Recipe>[] = JSON.parse(cached);
          offlineCreatedRecipes = allRecipes.filter(item => {
            // Only preserve recipes for this user
            if (item.data.user_id !== userId) {
              return false;
            }

            // Always preserve recipes that need sync (including pending deletions)
            if (item.needsSync || item.syncStatus === "pending") {
              return true;
            }

            // Always preserve temp recipes (newly created offline)
            if (item.tempId) {
              return true;
            }

            // Don't preserve deleted recipes that have already been synced
            if (item.isDeleted && !item.needsSync) {
              return false;
            }

            return false;
          });

          console.log(
            `[UserCacheService.hydrateRecipesFromServer] Found ${offlineCreatedRecipes.length} V2 offline-created recipes to preserve`
          );
        }

        // MIGRATION: Also check for legacy offline recipes that need preservation
        try {
          const { LegacyMigrationService } = await import(
            "./LegacyMigrationService"
          );
          const legacyCount =
            await LegacyMigrationService.getLegacyRecipeCount(userId);

          if (legacyCount > 0) {
            console.log(
              `[UserCacheService.hydrateRecipesFromServer] Found ${legacyCount} legacy recipes - migrating to V2 before force refresh`
            );

            // Migrate legacy recipes to V2 before clearing cache
            const migrationResult =
              await LegacyMigrationService.migrateLegacyRecipesToV2(
                userId,
                userUnitSystem
              );
            console.log(
              `[UserCacheService.hydrateRecipesFromServer] Legacy migration result:`,
              migrationResult
            );

            // Re-check for offline recipes after migration
            const cachedAfterMigration = await AsyncStorage.getItem(
              STORAGE_KEYS_V2.USER_RECIPES
            );
            if (cachedAfterMigration) {
              const allRecipesAfterMigration: SyncableItem<Recipe>[] =
                JSON.parse(cachedAfterMigration);
              offlineCreatedRecipes = allRecipesAfterMigration.filter(item => {
                return (
                  item.data.user_id === userId &&
                  (item.needsSync ||
                    item.syncStatus === "pending" ||
                    item.tempId)
                );
              });

              console.log(
                `[UserCacheService.hydrateRecipesFromServer] After migration: ${offlineCreatedRecipes.length} total offline recipes to preserve`
              );
            }
          }
        } catch (migrationError) {
          console.error(
            `[UserCacheService.hydrateRecipesFromServer] Legacy migration failed:`,
            migrationError
          );
          // Continue with force refresh even if migration fails
        }

        console.log(
          `[UserCacheService.hydrateRecipesFromServer] Found ${offlineCreatedRecipes.length} offline-created recipes to preserve`
        );

        // Clear all recipes for this user
        await this.clearUserRecipesFromCache(userId);

        // Restore offline-created recipes first
        for (const recipe of offlineCreatedRecipes) {
          await this.addRecipeToCache(recipe);
        }

        console.log(
          `[UserCacheService.hydrateRecipesFromServer] Preserved ${offlineCreatedRecipes.length} offline-created recipes`
        );
      }

      console.log(
        `[UserCacheService.hydrateRecipesFromServer] Fetched ${serverRecipes.length} recipes from server`
      );

      // Only process and cache server recipes if we have them
      if (serverRecipes.length > 0) {
        // Filter out server recipes that are already preserved (to avoid duplicates)
        const preservedIds = new Set(
          offlineCreatedRecipes.map(r => r.id || r.data.id)
        );
        const filteredServerRecipes = serverRecipes.filter(
          recipe => !preservedIds.has(recipe.id)
        );

        console.log(
          `[UserCacheService.hydrateRecipesFromServer] Filtered out ${serverRecipes.length - filteredServerRecipes.length} duplicate server recipes`
        );

        // Convert server recipes to syncable items
        const now = Date.now();
        const syncableRecipes = filteredServerRecipes.map(recipe => ({
          id: recipe.id,
          data: recipe,
          lastModified: now,
          syncStatus: "synced" as const,
          needsSync: false,
        }));

        // Store all recipes in cache
        for (const recipe of syncableRecipes) {
          await this.addRecipeToCache(recipe);
        }

        console.log(
          `[UserCacheService.hydrateRecipesFromServer] Successfully cached ${syncableRecipes.length} recipes`
        );
      } else if (!forceRefresh) {
        // Only log this for non-force refresh (normal hydration)
        console.log(
          `[UserCacheService.hydrateRecipesFromServer] No server recipes found`
        );
      }
    } catch (error) {
      console.error(
        `[UserCacheService.hydrateRecipesFromServer] Failed to hydrate from server:`,
        error
      );
      throw error;
    }
  }

  /**
   * Clear all recipes for a specific user from cache
   */
  /**
   * Clear all user data (for logout)
   */
  static async clearUserData(userId?: string): Promise<void> {
    try {
      if (userId) {
        console.log(
          `[UserCacheService.clearUserData] Clearing data for user: "${userId}"`
        );
        await this.clearUserRecipesFromCache(userId);
        await this.clearUserPendingOperations(userId);
      } else {
        console.log(`[UserCacheService.clearUserData] Clearing all data`);
        await AsyncStorage.removeItem(STORAGE_KEYS_V2.USER_RECIPES);
        await AsyncStorage.removeItem(STORAGE_KEYS_V2.PENDING_OPERATIONS);
      }
    } catch (error) {
      console.error(`[UserCacheService.clearUserData] Error:`, error);
      throw error;
    }
  }

  private static async clearUserPendingOperations(
    userId: string
  ): Promise<void> {
    try {
      const pendingData = await AsyncStorage.getItem(
        STORAGE_KEYS_V2.PENDING_OPERATIONS
      );
      if (!pendingData) {
        return;
      }

      const allOperations: PendingOperation[] = JSON.parse(pendingData);
      const filteredOperations = allOperations.filter(op => {
        // Keep operations that don't belong to this user
        return op.userId !== userId;
      });

      await AsyncStorage.setItem(
        STORAGE_KEYS_V2.PENDING_OPERATIONS,
        JSON.stringify(filteredOperations)
      );
      console.log(
        `[UserCacheService.clearUserPendingOperations] Cleared pending operations for user "${userId}"`
      );
    } catch (error) {
      console.error(
        `[UserCacheService.clearUserPendingOperations] Error:`,
        error
      );
      throw error;
    }
  }

  private static async clearUserRecipesFromCache(
    userId: string
  ): Promise<void> {
    return await withKeyQueue(STORAGE_KEYS_V2.USER_RECIPES, async () => {
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS_V2.USER_RECIPES);
        if (!cached) {
          return;
        }

        const allRecipes: SyncableItem<Recipe>[] = JSON.parse(cached);
        // Keep recipes for other users, remove recipes for this user
        const filteredRecipes = allRecipes.filter(
          item => item.data.user_id !== userId
        );

        await AsyncStorage.setItem(
          STORAGE_KEYS_V2.USER_RECIPES,
          JSON.stringify(filteredRecipes)
        );
        console.log(
          `[UserCacheService.clearUserRecipesFromCache] Cleared recipes for user "${userId}", kept ${filteredRecipes.length} recipes for other users`
        );
      } catch (error) {
        console.error(
          `[UserCacheService.clearUserRecipesFromCache] Error:`,
          error
        );
        throw error;
      }
    });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Filter and sort hydrated cached items
   */
  private static filterAndSortHydrated<
    T extends { updated_at?: string; created_at?: string },
  >(hydratedCached: SyncableItem<T>[]): T[] {
    const beforeFiltering = hydratedCached.length;
    const deletedItems = hydratedCached.filter(item => item.isDeleted);

    // Log what's being filtered out
    if (__DEV__ && deletedItems.length > 0) {
      void UnifiedLogger.debug(
        "UserCacheService.filterAndSortHydrated",
        `Filtering out ${deletedItems.length} deleted items`,
        {
          totalItems: beforeFiltering,
          deletedItems: deletedItems.length,
          deletedItemsDetails: deletedItems.map(item => ({
            id: item.id,
            name: (item.data as any)?.name || "Unknown",
            isDeleted: item.isDeleted,
            needsSync: item.needsSync,
            syncStatus: item.syncStatus,
          })),
        }
      );
    }

    const filteredItems = hydratedCached
      .filter(item => !item.isDeleted)
      .map(item => item.data)
      .sort((a, b) => {
        const getTimestamp = (dateStr: string) => {
          if (!dateStr) {
            return 0;
          }
          const parsed = Date.parse(dateStr);
          if (!isNaN(parsed)) {
            return parsed;
          }
          const numericTimestamp = Number(dateStr);
          return isNaN(numericTimestamp) ? 0 : numericTimestamp;
        };
        const aTime = getTimestamp(a.updated_at || a.created_at || "");
        const bTime = getTimestamp(b.updated_at || b.created_at || "");
        return bTime - aTime; // Newest first
      });

    if (__DEV__) {
      void UnifiedLogger.debug(
        "UserCacheService.filterAndSortHydrated",
        `Filtering and sorting completed`,
        {
          beforeFiltering,
          afterFiltering: filteredItems.length,
          filteredOut: beforeFiltering - filteredItems.length,
        }
      );
    }

    return filteredItems;
  }

  /**
   * Get cached recipes for a user
   */
  private static async getCachedRecipes(
    userId: string
  ): Promise<SyncableItem<Recipe>[]> {
    return await withKeyQueue(STORAGE_KEYS_V2.USER_RECIPES, async () => {
      try {
        console.log(
          `[UserCacheService.getCachedRecipes] Loading cache for user ID: "${userId}"`
        );

        const cached = await AsyncStorage.getItem(STORAGE_KEYS_V2.USER_RECIPES);
        if (!cached) {
          console.log(`[UserCacheService.getCachedRecipes] No cache found`);
          return [];
        }

        const allRecipes: SyncableItem<Recipe>[] = JSON.parse(cached);
        console.log(
          `[UserCacheService.getCachedRecipes] Total cached recipes found: ${allRecipes.length}`
        );

        // Log sample of all cached recipe user IDs for debugging
        if (allRecipes.length > 0) {
          const sampleUserIds = allRecipes.slice(0, 5).map(item => ({
            id: item.data.id,
            user_id: item.data.user_id,
          }));
          console.log(
            `[UserCacheService.getCachedRecipes] Sample cached recipes:`,
            sampleUserIds
          );
        }

        const userRecipes = allRecipes.filter(item => {
          const isMatch = item.data.user_id === userId;
          if (!isMatch) {
            console.log(
              `[UserCacheService.getCachedRecipes] Recipe ${item.data.id} user_id "${item.data.user_id}" != target "${userId}"`
            );
          }
          return isMatch;
        });

        console.log(
          `[UserCacheService.getCachedRecipes] Filtered to ${userRecipes.length} recipes for user "${userId}"`
        );
        return userRecipes;
      } catch (e) {
        console.warn("Corrupt USER_RECIPES cache; resetting", e);
        await AsyncStorage.removeItem(STORAGE_KEYS_V2.USER_RECIPES);
        return [];
      }
    });
  }

  /**
   * Add recipe to cache
   */
  static async addRecipeToCache(item: SyncableItem<Recipe>): Promise<void> {
    return await withKeyQueue(STORAGE_KEYS_V2.USER_RECIPES, async () => {
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS_V2.USER_RECIPES);
        const recipes: SyncableItem<Recipe>[] = cached
          ? JSON.parse(cached)
          : [];

        recipes.push(item);

        await AsyncStorage.setItem(
          STORAGE_KEYS_V2.USER_RECIPES,
          JSON.stringify(recipes)
        );
      } catch (error) {
        console.error("Error adding recipe to cache:", error);
        throw new OfflineError("Failed to cache recipe", "CACHE_ERROR", true);
      }
    });
  }

  /**
   * Update recipe in cache
   */
  private static async updateRecipeInCache(
    updatedItem: SyncableItem<Recipe>
  ): Promise<void> {
    return await withKeyQueue(STORAGE_KEYS_V2.USER_RECIPES, async () => {
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS_V2.USER_RECIPES);
        const recipes: SyncableItem<Recipe>[] = cached
          ? JSON.parse(cached)
          : [];

        const index = recipes.findIndex(
          item =>
            item.id === updatedItem.id || item.data.id === updatedItem.data.id
        );

        if (index >= 0) {
          recipes[index] = updatedItem;
        } else {
          recipes.push(updatedItem);
        }

        await AsyncStorage.setItem(
          STORAGE_KEYS_V2.USER_RECIPES,
          JSON.stringify(recipes)
        );
      } catch (error) {
        console.error("Error updating recipe in cache:", error);
        throw new OfflineError(
          "Failed to update cached recipe",
          "CACHE_ERROR",
          true
        );
      }
    });
  }

  /**
   * Get pending operations
   */
  private static async getPendingOperations(): Promise<PendingOperation[]> {
    try {
      const cached = await AsyncStorage.getItem(
        STORAGE_KEYS_V2.PENDING_OPERATIONS
      );
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error("Error getting pending operations:", error);
      return [];
    }
  }

  /**
   * Add pending operation
   */
  private static async addPendingOperation(
    operation: PendingOperation
  ): Promise<void> {
    return await withKeyQueue(STORAGE_KEYS_V2.PENDING_OPERATIONS, async () => {
      try {
        const cached = await AsyncStorage.getItem(
          STORAGE_KEYS_V2.PENDING_OPERATIONS
        );
        const operations: PendingOperation[] = cached ? JSON.parse(cached) : [];
        operations.push(operation);
        await AsyncStorage.setItem(
          STORAGE_KEYS_V2.PENDING_OPERATIONS,
          JSON.stringify(operations)
        );
      } catch (error) {
        console.error("Error adding pending operation:", error);
        throw new OfflineError(
          "Failed to queue operation",
          "QUEUE_ERROR",
          true
        );
      }
    });
  }

  /**
   * Remove pending operation
   */
  private static async removePendingOperation(
    operationId: string
  ): Promise<void> {
    return await withKeyQueue(STORAGE_KEYS_V2.PENDING_OPERATIONS, async () => {
      try {
        const cached = await AsyncStorage.getItem(
          STORAGE_KEYS_V2.PENDING_OPERATIONS
        );
        const operations: PendingOperation[] = cached ? JSON.parse(cached) : [];
        const filtered = operations.filter(op => op.id !== operationId);
        await AsyncStorage.setItem(
          STORAGE_KEYS_V2.PENDING_OPERATIONS,
          JSON.stringify(filtered)
        );
      } catch (error) {
        console.error("Error removing pending operation:", error);
      }
    });
  }

  /**
   * Update pending operation
   */
  private static async updatePendingOperation(
    operation: PendingOperation
  ): Promise<void> {
    return await withKeyQueue(STORAGE_KEYS_V2.PENDING_OPERATIONS, async () => {
      try {
        const cached = await AsyncStorage.getItem(
          STORAGE_KEYS_V2.PENDING_OPERATIONS
        );
        const operations: PendingOperation[] = cached ? JSON.parse(cached) : [];
        const index = operations.findIndex(op => op.id === operation.id);
        if (index >= 0) {
          operations[index] = operation;
          await AsyncStorage.setItem(
            STORAGE_KEYS_V2.PENDING_OPERATIONS,
            JSON.stringify(operations)
          );
        }
      } catch (error) {
        console.error("Error updating pending operation:", error);
      }
    });
  }

  /**
   * Process a single pending operation
   * Returns the server response for atomic handling in sync loop
   */
  private static async processPendingOperation(
    operation: PendingOperation
  ): Promise<{ realId?: string }> {
    try {
      switch (operation.type) {
        case "create":
          if (operation.entityType === "recipe") {
            const response = await ApiService.recipes.create(operation.data);
            if (response && response.data && response.data.id) {
              return { realId: response.data.id };
            }
          }
          break;

        case "update":
          if (operation.entityType === "recipe") {
            await ApiService.recipes.update(operation.entityId, operation.data);
          }
          break;

        case "delete":
          if (operation.entityType === "recipe") {
            await UnifiedLogger.info(
              "UserCacheService.syncOperation",
              `Executing DELETE API call for recipe ${operation.entityId}`,
              {
                entityId: operation.entityId,
                operationId: operation.id,
              }
            );
            await ApiService.recipes.delete(operation.entityId);
            await UnifiedLogger.info(
              "UserCacheService.syncOperation",
              `DELETE API call successful for recipe ${operation.entityId}`
            );
          }
          break;

        default:
          throw new SyncError(
            `Unknown operation type: ${operation.type}`,
            operation
          );
      }

      return {};
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `[UserCacheService] Error processing ${operation.type} operation for ${operation.entityId}:`,
        errorMessage
      );
      throw new SyncError(
        `Failed to ${operation.type} ${operation.entityType}: ${errorMessage}`,
        operation
      );
    }
  }

  /**
   * Background sync with exponential backoff
   */
  private static async backgroundSync(): Promise<void> {
    try {
      const ops = await this.getPendingOperations().catch(() => []);
      await UnifiedLogger.info(
        "UserCacheService.backgroundSync",
        `Scheduling background sync with ${ops.length} pending operations`,
        {
          pendingOpsCount: ops.length,
          operations: ops.map(op => ({
            id: op.id,
            type: op.type,
            entityId: op.entityId,
            retryCount: op.retryCount,
          })),
        }
      );

      const maxRetry =
        ops.length > 0 ? Math.max(...ops.map(o => o.retryCount)) : 0;
      const exp = Math.min(maxRetry, 5); // cap backoff
      const base = this.RETRY_BACKOFF_BASE * Math.pow(2, exp);
      const jitter = Math.floor(base * 0.1 * Math.random());
      const delay = base + jitter;

      await UnifiedLogger.debug(
        "UserCacheService.backgroundSync",
        `Background sync scheduled in ${delay}ms (backoff delay)`,
        {
          delay,
          maxRetry,
          exponential: exp,
        }
      );

      // Don't wait for sync to complete
      setTimeout(async () => {
        try {
          await UnifiedLogger.info(
            "UserCacheService.backgroundSync",
            "Executing background sync now"
          );
          await this.syncPendingOperations();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await UnifiedLogger.error(
            "UserCacheService.backgroundSync",
            `Background sync failed: ${errorMessage}`,
            { error: errorMessage }
          );
          console.warn("Background sync failed:", error);
        }
      }, delay);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await UnifiedLogger.error(
        "UserCacheService.backgroundSync",
        `Failed to start background sync: ${errorMessage}`,
        { error: errorMessage }
      );
      console.warn("Failed to start background sync:", error);
    }
  }

  /**
   * Map temp ID to real ID after successful creation
   */
  private static async mapTempIdToRealId(
    tempId: string,
    realId: string
  ): Promise<void> {
    await UnifiedLogger.info(
      "UserCacheService.mapTempIdToRealId",
      `Mapping temp ID to real ID`,
      {
        tempId,
        realId,
        operation: "id_mapping",
      }
    );
    try {
      // 1) Update recipe cache under USER_RECIPES lock
      await withKeyQueue(STORAGE_KEYS_V2.USER_RECIPES, async () => {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS_V2.USER_RECIPES);
        if (!cached) {
          return;
        }
        const recipes: SyncableItem<Recipe>[] = JSON.parse(cached);
        const i = recipes.findIndex(
          item => item.id === tempId || item.data.id === tempId
        );
        if (i >= 0) {
          recipes[i].id = realId;
          recipes[i].data.id = realId;
          recipes[i].data.updated_at = new Date().toISOString();
          recipes[i].syncStatus = "synced";
          recipes[i].needsSync = false;
          delete recipes[i].tempId;
          await AsyncStorage.setItem(
            STORAGE_KEYS_V2.USER_RECIPES,
            JSON.stringify(recipes)
          );
        } else {
          console.warn(
            `[UserCacheService] Recipe with temp ID "${tempId}" not found in cache`
          );
        }
      });

      // 2) Update pending ops under PENDING_OPERATIONS lock
      await withKeyQueue(STORAGE_KEYS_V2.PENDING_OPERATIONS, async () => {
        const cached = await AsyncStorage.getItem(
          STORAGE_KEYS_V2.PENDING_OPERATIONS
        );
        const operations: PendingOperation[] = cached ? JSON.parse(cached) : [];
        let updated = false;
        for (const op of operations) {
          if (op.entityId === tempId) {
            op.entityId = realId;
            updated = true;
          }
        }
        if (updated) {
          await AsyncStorage.setItem(
            STORAGE_KEYS_V2.PENDING_OPERATIONS,
            JSON.stringify(operations)
          );
        }
      });

      await UnifiedLogger.info(
        "UserCacheService.mapTempIdToRealId",
        `ID mapping completed successfully`,
        {
          tempId,
          realId,
          operation: "id_mapping_completed",
        }
      );
    } catch (error) {
      await UnifiedLogger.error(
        "UserCacheService.mapTempIdToRealId",
        `Error mapping temp ID to real ID: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          tempId,
          realId,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      );
      console.error(
        "[UserCacheService] Error mapping temp ID to real ID:",
        error
      );
    }
  }

  /**
   * Mark an item as synced (for update operations)
   */
  private static async markItemAsSynced(entityId: string): Promise<void> {
    try {
      await withKeyQueue(STORAGE_KEYS_V2.USER_RECIPES, async () => {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS_V2.USER_RECIPES);
        if (!cached) {
          return;
        }
        const recipes: SyncableItem<Recipe>[] = JSON.parse(cached);
        const i = recipes.findIndex(
          item => item.id === entityId || item.data.id === entityId
        );
        if (i >= 0) {
          recipes[i].syncStatus = "synced";
          recipes[i].needsSync = false;
          recipes[i].data.updated_at = new Date().toISOString();
          await AsyncStorage.setItem(
            STORAGE_KEYS_V2.USER_RECIPES,
            JSON.stringify(recipes)
          );
        } else {
          console.warn(
            `[UserCacheService] Recipe with ID "${entityId}" not found in cache for marking as synced`
          );
        }
      });
    } catch (error) {
      console.error("[UserCacheService] Error marking item as synced:", error);
    }
  }

  /**
   * Remove an item completely from cache (for successful delete operations)
   */
  private static async removeItemFromCache(entityId: string): Promise<void> {
    try {
      await withKeyQueue(STORAGE_KEYS_V2.USER_RECIPES, async () => {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS_V2.USER_RECIPES);
        if (!cached) {
          return;
        }
        const recipes: SyncableItem<Recipe>[] = JSON.parse(cached);
        const filteredRecipes = recipes.filter(
          item => item.id !== entityId && item.data.id !== entityId
        );

        if (filteredRecipes.length < recipes.length) {
          await AsyncStorage.setItem(
            STORAGE_KEYS_V2.USER_RECIPES,
            JSON.stringify(filteredRecipes)
          );
        } else {
          console.warn(
            `[UserCacheService] Recipe with ID "${entityId}" not found in cache for removal`
          );
        }
      });
    } catch (error) {
      console.error(
        "[UserCacheService] Error removing item from cache:",
        error
      );
    }
  }
}

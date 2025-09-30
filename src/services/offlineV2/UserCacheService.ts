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
import { UserValidationService } from "@utils/userValidation";
import UnifiedLogger from "@services/logger/UnifiedLogger";
import { isTempId } from "@utils/recipeUtils";
import {
  SyncableItem,
  PendingOperation,
  SyncResult,
  OfflineError,
  SyncError,
  STORAGE_KEYS_V2,
  Recipe,
  BrewSession,
} from "@src/types";

// Simple per-key queue (no external deps) with race condition protection
const keyQueues = new Map<string, Promise<unknown>>();
const queueDebugCounters = new Map<string, number>();

async function withKeyQueue<T>(key: string, fn: () => Promise<T>): Promise<T> {
  // In test environment, bypass the queue to avoid hanging
  if (process.env.NODE_ENV === "test" || (global as any).__JEST_ENVIRONMENT__) {
    return await fn();
  }

  // Debug counter to track potential infinite loops
  const currentCount = (queueDebugCounters.get(key) || 0) + 1;
  queueDebugCounters.set(key, currentCount);

  // Log warning if too many concurrent calls for the same key
  if (currentCount > 10) {
    console.warn(
      `[withKeyQueue] High concurrent call count for key "${key}": ${currentCount} calls`
    );
  }

  // Break infinite loops by limiting max concurrent calls per key
  if (currentCount > 50) {
    queueDebugCounters.set(key, 0); // Reset counter
    console.error(
      `[withKeyQueue] Breaking potential infinite loop for key "${key}" after ${currentCount} calls`
    );
    // Execute directly to break the loop
    return await fn();
  }

  try {
    const prev = keyQueues.get(key) ?? Promise.resolve();
    const next = prev
      .catch(() => undefined) // keep the chain alive after errors
      .then(fn);

    keyQueues.set(
      key,
      next.finally(() => {
        // Decrement counter when this call completes
        const newCount = Math.max(0, (queueDebugCounters.get(key) || 1) - 1);
        queueDebugCounters.set(key, newCount);

        // Clean up queue if this was the last operation
        if (keyQueues.get(key) === next) {
          keyQueues.delete(key);
        }
      })
    );

    return await next;
  } catch (error) {
    // Reset counter on error to prevent stuck state
    queueDebugCounters.set(
      key,
      Math.max(0, (queueDebugCounters.get(key) || 1) - 1)
    );
    throw error;
  }
}

export class UserCacheService {
  private static syncInProgress = false;
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_BACKOFF_BASE = 1000; // 1 second

  // ============================================================================
  // Recipe Management
  // ============================================================================

  /**
   * Get a specific recipe by ID with enforced user scoping
   */
  static async getRecipeById(
    recipeId: string,
    userId?: string
  ): Promise<Recipe | null> {
    try {
      // Require userId for security - prevent cross-user data access
      if (!userId) {
        console.warn(
          `[UserCacheService.getRecipeById] User ID is required for security`
        );
        return null;
      }

      // Use the existing getCachedRecipes method which already filters by user
      const userRecipes = await this.getCachedRecipes(userId);

      // Find the recipe by matching ID and confirm user ownership
      const recipeItem = userRecipes.find(
        item =>
          (item.id === recipeId ||
            item.data.id === recipeId ||
            item.tempId === recipeId) &&
          item.data.user_id === userId &&
          !item.isDeleted
      );

      if (!recipeItem) {
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
    recipeId: string,
    userId: string
  ): Promise<{ recipe: Recipe | null; isDeleted: boolean }> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS_V2.USER_RECIPES);
      if (!cached) {
        return { recipe: null, isDeleted: false };
      }

      const allRecipes: SyncableItem<Recipe>[] = JSON.parse(cached);
      const recipeItem = allRecipes.find(
        item =>
          (item.id === recipeId ||
            item.data.id === recipeId ||
            item.tempId === recipeId) &&
          (!userId || item.data.user_id === userId)
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

      // Sanitize recipe data for API consumption
      const sanitizedRecipeData = this.sanitizeRecipeUpdatesForAPI({
        ...recipe,
        user_id: newRecipe.user_id,
      });

      // Create pending operation
      const operation: PendingOperation = {
        id: `create_${tempId}`,
        type: "create",
        entityType: "recipe",
        entityId: tempId,
        userId: newRecipe.user_id,
        data: sanitizedRecipeData,
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

      // Sanitize updates for API consumption
      const sanitizedUpdates = this.sanitizeRecipeUpdatesForAPI(updates);

      // Create pending operation
      const operation: PendingOperation = {
        id: `update_${id}_${now}`,
        type: "update",
        entityType: "recipe",
        entityId: id,
        userId: updatedRecipe.user_id,
        data: sanitizedUpdates,
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

      // Check if there's a pending CREATE operation for this recipe
      const pendingOps = await this.getPendingOperations();
      const existingCreateOp = pendingOps.find(
        op =>
          op.type === "create" &&
          op.entityType === "recipe" &&
          op.entityId === id
      );

      if (existingCreateOp) {
        // Recipe was created offline and is being deleted offline - cancel both operations
        await UnifiedLogger.info(
          "UserCacheService.deleteRecipe",
          `Canceling offline create+delete operations for recipe ${id}`,
          {
            createOperationId: existingCreateOp.id,
            recipeId: id,
            recipeName: existingItem.data.name,
            cancelBothOperations: true,
          }
        );

        // Remove the create operation and the recipe from cache entirely
        await Promise.all([
          this.removePendingOperation(existingCreateOp.id),
          this.removeItemFromCache(id),
        ]);

        await UnifiedLogger.info(
          "UserCacheService.deleteRecipe",
          `Successfully canceled offline operations for recipe ${id}`,
          {
            canceledCreateOp: existingCreateOp.id,
            removedFromCache: true,
            noSyncRequired: true,
          }
        );

        return; // Exit early - no sync needed
      }

      // Recipe exists on server - proceed with normal deletion (tombstone + delete operation)
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
        `Created delete operation for synced recipe ${id}`,
        {
          operationId: operation.id,
          entityId: id,
          recipeName: existingItem.data.name || "Unknown",
          requiresServerSync: true,
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

  /**
   * Clone a recipe with offline support
   */
  static async cloneRecipe(recipeId: string, userId?: string): Promise<Recipe> {
    try {
      const currentUserId =
        userId ?? (await UserValidationService.getCurrentUserIdFromToken());
      if (!currentUserId) {
        throw new OfflineError(
          "User ID is required for cloning recipes",
          "AUTH_ERROR",
          false
        );
      }

      await UnifiedLogger.info(
        "UserCacheService.cloneRecipe",
        `Starting recipe clone for user ${currentUserId}`,
        {
          userId: currentUserId,
          recipeId,
          timestamp: new Date().toISOString(),
        }
      );

      // Get the recipe to clone
      const cached = await this.getCachedRecipes(currentUserId);
      const recipeToClone = cached.find(
        item => item.id === recipeId || item.data.id === recipeId
      );

      if (!recipeToClone) {
        throw new OfflineError("Recipe not found", "NOT_FOUND", false);
      }

      // Create cloned recipe data
      const originalRecipe = recipeToClone.data;
      const now = Date.now();
      const tempId = `temp_${now}_${Math.random().toString(36).substr(2, 9)}`;

      const clonedRecipeData: Recipe = {
        ...originalRecipe,
        id: tempId,
        name: `${originalRecipe.name} (Copy)`,
        user_id: currentUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: false, // Cloned recipes are always private initially
        is_owner: true,
        username: undefined,
        original_author:
          originalRecipe.username || originalRecipe.original_author,
        version: 1,
      };

      // Create the cloned recipe using the existing create method
      const clonedRecipe = await this.createRecipe(clonedRecipeData);

      await UnifiedLogger.info(
        "UserCacheService.cloneRecipe",
        `Recipe cloned successfully`,
        {
          userId: currentUserId,
          originalRecipeId: recipeId,
          clonedRecipeId: clonedRecipe.id,
          clonedRecipeName: clonedRecipe.name,
        }
      );

      return clonedRecipe;
    } catch (error) {
      console.error("Error cloning recipe:", error);
      if (error instanceof OfflineError) {
        throw error;
      }
      throw new OfflineError(
        `Failed to clone recipe: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "CLONE_ERROR",
        true
      );
    }
  }

  // ============================================================================
  // Brew Session Management
  // ============================================================================

  /**
   * Get a specific brew session by ID with enforced user scoping
   */
  static async getBrewSessionById(
    sessionId: string,
    userId?: string
  ): Promise<BrewSession | null> {
    try {
      // Require userId for security - prevent cross-user data access
      if (!userId) {
        console.warn(
          `[UserCacheService.getBrewSessionById] User ID is required for security`
        );
        return null;
      }

      // Use the existing getCachedBrewSessions method which already filters by user
      const userSessions = await this.getCachedBrewSessions(userId);

      // Find the session by matching ID and confirm user ownership
      const sessionItem = userSessions.find(
        item =>
          (item.id === sessionId ||
            item.data.id === sessionId ||
            item.tempId === sessionId) &&
          item.data.user_id === userId &&
          !item.isDeleted
      );

      if (!sessionItem) {
        return null;
      }

      return sessionItem.data;
    } catch (error) {
      console.error(`[UserCacheService.getBrewSessionById] Error:`, error);
      return null;
    }
  }

  /**
   * Get all brew sessions for a user
   */
  static async getBrewSessions(
    userId: string,
    userUnitSystem: "imperial" | "metric" = "imperial"
  ): Promise<BrewSession[]> {
    try {
      await UnifiedLogger.debug(
        "UserCacheService.getBrewSessions",
        `Retrieving brew sessions for user ${userId}`,
        {
          userId,
          unitSystem: userUnitSystem,
        }
      );

      console.log(
        `[UserCacheService.getBrewSessions] Getting brew sessions for user ID: "${userId}"`
      );

      const cached = await this.getCachedBrewSessions(userId);

      // Log detailed info about what we found in cache
      const deletedCount = cached.filter(item => item.isDeleted).length;
      const pendingSyncCount = cached.filter(item => item.needsSync).length;
      const deletedPendingSyncCount = cached.filter(
        item => item.isDeleted && item.needsSync
      ).length;

      await UnifiedLogger.debug(
        "UserCacheService.getBrewSessions",
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
        `[UserCacheService.getBrewSessions] getCachedBrewSessions returned ${cached.length} items for user "${userId}"`
      );

      // If no cached sessions found, try to hydrate from server
      if (cached.length === 0) {
        console.log(
          `[UserCacheService.getBrewSessions] No cached sessions found, attempting to hydrate from server...`
        );
        try {
          await this.hydrateBrewSessionsFromServer(
            userId,
            false,
            userUnitSystem
          );
          // Try again after hydration
          const hydratedCached = await this.getCachedBrewSessions(userId);
          console.log(
            `[UserCacheService.getBrewSessions] After hydration: ${hydratedCached.length} sessions cached`
          );

          return this.filterAndSortHydrated(hydratedCached);
        } catch (hydrationError) {
          console.warn(
            `[UserCacheService.getBrewSessions] Failed to hydrate from server:`,
            hydrationError
          );
          // Continue with empty cache
        }
      }

      // Filter out deleted items and return data
      const filteredSessions = cached.filter(item => !item.isDeleted);
      console.log(
        `[UserCacheService.getBrewSessions] After filtering out deleted: ${filteredSessions.length} sessions`
      );

      if (filteredSessions.length > 0) {
        const sessionIds = filteredSessions.map(item => item.data.id);
        console.log(
          `[UserCacheService.getBrewSessions] Session IDs: [${sessionIds.join(", ")}]`
        );
      }

      const finalSessions = this.filterAndSortHydrated(filteredSessions);

      await UnifiedLogger.debug(
        "UserCacheService.getBrewSessions",
        `Returning filtered sessions to UI`,
        {
          userId,
          returnedCount: finalSessions.length,
          filteredOutCount: filteredSessions.length - finalSessions.length,
          returnedSessions: finalSessions.map(session => ({
            id: session.id,
            name: session.name,
            status: session.status || "Unknown",
          })),
        }
      );

      return finalSessions;
    } catch (error) {
      await UnifiedLogger.error(
        "UserCacheService.getBrewSessions",
        `Error getting brew sessions: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          userId,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      );
      console.error("Error getting brew sessions:", error);
      throw new OfflineError(
        "Failed to get brew sessions",
        "SESSIONS_ERROR",
        true
      );
    }
  }

  /**
   * Create a new brew session
   */
  static async createBrewSession(
    session: Partial<BrewSession>
  ): Promise<BrewSession> {
    try {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      // Get current user ID from JWT token
      const currentUserId =
        session.user_id ??
        (await UserValidationService.getCurrentUserIdFromToken());
      if (!currentUserId) {
        throw new OfflineError(
          "User ID is required for creating brew sessions",
          "AUTH_ERROR",
          false
        );
      }

      await UnifiedLogger.info(
        "UserCacheService.createBrewSession",
        `Starting brew session creation for user ${currentUserId}`,
        {
          userId: currentUserId,
          tempId,
          sessionName: session.name || "Untitled",
          sessionStatus: session.status || "planned",
          recipeId: session.recipe_id || "Unknown",
          timestamp: new Date().toISOString(),
        }
      );

      const newSession: BrewSession = {
        ...session,
        id: tempId,
        name: session.name || "",
        recipe_id: session.recipe_id || "",
        status: session.status || "planned",
        batch_size: session.batch_size || 5.0,
        batch_size_unit: session.batch_size_unit || "gal",
        brew_date: session.brew_date || new Date().toISOString().split("T")[0],
        notes: session.notes || "",
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
        user_id: currentUserId,
        fermentation_entries: session.fermentation_entries || [],
        // Initialize optional fields
        temperature_unit: session.temperature_unit || "F",
      } as BrewSession;

      // Create syncable item
      const syncableItem: SyncableItem<BrewSession> = {
        id: tempId,
        data: newSession,
        lastModified: now,
        syncStatus: "pending",
        needsSync: true,
        tempId,
      };

      // Sanitize session data for API consumption
      const sanitizedSessionData = this.sanitizeBrewSessionUpdatesForAPI({
        ...session,
        user_id: newSession.user_id,
      });

      // Create pending operation
      const operation: PendingOperation = {
        id: `create_${tempId}`,
        type: "create",
        entityType: "brew_session",
        entityId: tempId,
        userId: newSession.user_id,
        data: sanitizedSessionData,
        timestamp: now,
        retryCount: 0,
        maxRetries: this.MAX_RETRY_ATTEMPTS,
      };

      // Atomically add to both cache and pending queue
      await Promise.all([
        this.addBrewSessionToCache(syncableItem),
        this.addPendingOperation(operation),
      ]);

      // Trigger background sync (fire and forget)
      void this.backgroundSync();

      await UnifiedLogger.info(
        "UserCacheService.createBrewSession",
        `Brew session creation completed successfully`,
        {
          userId: currentUserId,
          sessionId: tempId,
          sessionName: newSession.name,
          operationId: operation.id,
          pendingSync: true,
        }
      );

      return newSession;
    } catch (error) {
      console.error("Error creating brew session:", error);
      throw new OfflineError(
        "Failed to create brew session",
        "CREATE_ERROR",
        true
      );
    }
  }

  /**
   * Update an existing brew session
   */
  static async updateBrewSession(
    id: string,
    updates: Partial<BrewSession>
  ): Promise<BrewSession> {
    try {
      const userId =
        updates.user_id ??
        (await UserValidationService.getCurrentUserIdFromToken());
      if (!userId) {
        throw new OfflineError(
          "User ID is required for updating brew sessions",
          "AUTH_ERROR",
          false
        );
      }

      await UnifiedLogger.info(
        "UserCacheService.updateBrewSession",
        `Starting brew session update for user ${userId}`,
        {
          userId,
          sessionId: id,
          updateFields: Object.keys(updates),
          sessionName: updates.name || "Unknown",
          hasStatusChange: !!updates.status,
          timestamp: new Date().toISOString(),
        }
      );

      const cached = await this.getCachedBrewSessions(userId);
      const existingItem = cached.find(
        item => item.id === id || item.data.id === id
      );

      if (!existingItem) {
        throw new OfflineError("Brew session not found", "NOT_FOUND", false);
      }

      const now = Date.now();
      const updatedSession: BrewSession = {
        ...existingItem.data,
        ...updates,
        updated_at: new Date(now).toISOString(),
      };

      // Update syncable item
      const updatedItem: SyncableItem<BrewSession> = {
        ...existingItem,
        data: updatedSession,
        lastModified: now,
        syncStatus: "pending",
        needsSync: true,
      };

      // Sanitize updates for API consumption
      const sanitizedUpdates = this.sanitizeBrewSessionUpdatesForAPI(updates);

      // Create pending operation
      const operation: PendingOperation = {
        id: `update_${id}_${now}`,
        type: "update",
        entityType: "brew_session",
        entityId: id,
        userId: updatedSession.user_id,
        data: sanitizedUpdates,
        timestamp: now,
        retryCount: 0,
        maxRetries: this.MAX_RETRY_ATTEMPTS,
      };

      // Atomically update cache and add to pending queue
      await Promise.all([
        this.updateBrewSessionInCache(updatedItem),
        this.addPendingOperation(operation),
      ]);

      // Trigger background sync
      this.backgroundSync();

      await UnifiedLogger.info(
        "UserCacheService.updateBrewSession",
        `Brew session update completed successfully`,
        {
          userId,
          sessionId: id,
          sessionName: updatedSession.name,
          operationId: operation.id,
          pendingSync: true,
        }
      );

      return updatedSession;
    } catch (error) {
      console.error("Error updating brew session:", error);
      if (error instanceof OfflineError) {
        throw error;
      }
      throw new OfflineError(
        "Failed to update brew session",
        "UPDATE_ERROR",
        true
      );
    }
  }

  /**
   * Delete a brew session (tombstone pattern - same as recipes)
   */
  static async deleteBrewSession(id: string, userId?: string): Promise<void> {
    try {
      const currentUserId =
        userId ?? (await UserValidationService.getCurrentUserIdFromToken());
      if (!currentUserId) {
        throw new OfflineError(
          "User ID is required for deleting brew sessions",
          "AUTH_ERROR",
          false
        );
      }

      await UnifiedLogger.info(
        "UserCacheService.deleteBrewSession",
        `Starting brew session deletion for user ${currentUserId}`,
        {
          userId: currentUserId,
          sessionId: id,
          timestamp: new Date().toISOString(),
        }
      );

      const cached = await this.getCachedBrewSessions(currentUserId);
      const existingItem = cached.find(
        item => item.id === id || item.data.id === id || item.tempId === id
      );

      if (!existingItem) {
        await UnifiedLogger.warn(
          "UserCacheService.deleteBrewSession",
          `Brew session not found for deletion`,
          {
            userId: currentUserId,
            sessionId: id,
            availableSessionCount: cached.filter(
              item => item.data.user_id === currentUserId
            ).length,
          }
        );
        throw new OfflineError("Brew session not found", "NOT_FOUND", false);
      }

      await UnifiedLogger.info(
        "UserCacheService.deleteBrewSession",
        `Found session for deletion`,
        {
          userId: currentUserId,
          sessionId: id,
          sessionName: existingItem.data.name,
          sessionStatus: existingItem.data.status || "Unknown",
          wasAlreadyDeleted: existingItem.isDeleted || false,
          currentSyncStatus: existingItem.syncStatus,
          needsSync: existingItem.needsSync,
        }
      );

      const now = Date.now();

      // Check if there's a pending CREATE operation for this session
      const pendingOps = await this.getPendingOperations();
      const existingCreateOp = pendingOps.find(
        op =>
          op.type === "create" &&
          op.entityType === "brew_session" &&
          op.entityId === id
      );

      if (existingCreateOp) {
        // Session was created offline and is being deleted offline - cancel both operations
        await UnifiedLogger.info(
          "UserCacheService.deleteBrewSession",
          `Canceling offline create+delete operations for session ${id}`,
          {
            createOperationId: existingCreateOp.id,
            sessionId: id,
            sessionName: existingItem.data.name,
            cancelBothOperations: true,
          }
        );

        // Remove the create operation and the session from cache entirely
        await Promise.all([
          this.removePendingOperation(existingCreateOp.id),
          this.removeBrewSessionFromCache(id),
        ]);

        await UnifiedLogger.info(
          "UserCacheService.deleteBrewSession",
          `Successfully canceled offline operations for session ${id}`,
          {
            canceledCreateOp: existingCreateOp.id,
            removedFromCache: true,
            noSyncRequired: true,
          }
        );

        return; // Exit early - no sync needed
      }

      // Session exists on server - proceed with normal deletion (tombstone + delete operation)
      // Mark as deleted (tombstone)
      const deletedItem: SyncableItem<BrewSession> = {
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
        entityType: "brew_session",
        entityId: id,
        userId: existingItem.data.user_id,
        timestamp: now,
        retryCount: 0,
        maxRetries: this.MAX_RETRY_ATTEMPTS,
      };

      await UnifiedLogger.info(
        "UserCacheService.deleteBrewSession",
        `Created delete operation for synced session ${id}`,
        {
          operationId: operation.id,
          entityId: id,
          sessionName: existingItem.data.name || "Unknown",
          requiresServerSync: true,
        }
      );

      // Atomically update cache and add to pending queue
      await Promise.all([
        this.updateBrewSessionInCache(deletedItem),
        this.addPendingOperation(operation),
      ]);

      await UnifiedLogger.info(
        "UserCacheService.deleteBrewSession",
        `Brew session deletion completed successfully`,
        {
          userId: currentUserId,
          sessionId: id,
          sessionName: existingItem.data.name,
          operationId: operation.id,
          pendingSync: true,
          tombstoneCreated: true,
        }
      );

      // Trigger background sync
      this.backgroundSync();
    } catch (error) {
      console.error("Error deleting brew session:", error);
      if (error instanceof OfflineError) {
        throw error;
      }
      throw new OfflineError(
        "Failed to delete brew session",
        "DELETE_ERROR",
        true
      );
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
      let operations = await this.getPendingOperations();
      if (operations.length > 0) {
        console.log(
          `[UserCacheService] Starting sync of ${operations.length} pending operations`
        );
      }

      // Process operations one at a time, reloading after each to catch any updates
      while (operations.length > 0) {
        const operation = operations[0]; // Always process the first operation
        try {
          // Process the operation and get any ID mapping info
          const operationResult = await this.processPendingOperation(operation);

          // Remove operation from pending queue FIRST
          await this.removePendingOperation(operation.id);

          // ONLY after successful removal, update the cache with ID mapping
          if (operationResult.realId && operation.type === "create") {
            result.processed++; // Increment BEFORE continuing to count this operation
            await this.mapTempIdToRealId(
              operation.entityId,
              operationResult.realId
            );
            // CRITICAL: Reload operations after ID mapping to get updated recipe_id references
            // This ensures subsequent operations (like brew sessions) use the new real IDs
            operations = await this.getPendingOperations();
            await UnifiedLogger.debug(
              "UserCacheService.syncPendingOperations",
              `Reloaded pending operations after ID mapping`,
              {
                remainingOperations: operations.length,
              }
            );
            continue; // Skip to next iteration with fresh operations list
          } else if (operation.type === "update") {
            // For update operations, mark the item as synced
            await this.markItemAsSynced(operation.entityId);
          } else if (operation.type === "delete") {
            // For delete operations, completely remove the item from cache
            await this.removeItemFromCache(operation.entityId);
          }

          result.processed++;
          // Reload operations list after successful processing
          operations = await this.getPendingOperations();
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

          // Check if this is an offline/network error - these shouldn't count as retries
          const isOfflineError =
            errorMessage.includes("Simulated offline mode") ||
            errorMessage.includes("Network request failed") ||
            errorMessage.includes("offline") ||
            errorMessage.includes("ECONNREFUSED");

          if (isOfflineError) {
            // Offline error - don't increment retry count, just stop syncing
            // We'll try again next time (when network is back or next background sync)
            await UnifiedLogger.debug(
              "UserCacheService.syncPendingOperations",
              `Stopping sync due to offline error - will retry later`,
              {
                operationId: operation.id,
                operationType: operation.type,
                entityType: operation.entityType,
                error: errorMessage,
                remainingOperations: operations.length,
              }
            );
            // Break out of the while loop - don't keep retrying offline operations
            break;
          } else {
            // Real error - increment retry count
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

          // Reload operations list after error handling
          operations = await this.getPendingOperations();
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
        const hasTempId = isTempId(recipe.id);
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
            type: "create",
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
        await this.clearUserBrewSessionsFromCache(userId);
        await this.clearUserPendingOperations(userId);
      } else {
        console.log(`[UserCacheService.clearUserData] Clearing all data`);
        await AsyncStorage.removeItem(STORAGE_KEYS_V2.USER_RECIPES);
        await AsyncStorage.removeItem(STORAGE_KEYS_V2.PENDING_OPERATIONS);
        await AsyncStorage.removeItem(STORAGE_KEYS_V2.USER_BREW_SESSIONS);
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
        // Keep only operations that clearly belong to other users.
        // Legacy ops had no userId; treat them as current user's data and remove.
        return op.userId && op.userId !== userId;
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
   * Get cached brew sessions for a user
   */
  private static async getCachedBrewSessions(
    userId: string
  ): Promise<SyncableItem<BrewSession>[]> {
    return await withKeyQueue(STORAGE_KEYS_V2.USER_BREW_SESSIONS, async () => {
      try {
        // Add stack trace in dev mode to track what's calling this
        if (__DEV__) {
          const stack = new Error().stack;
          const caller = stack?.split("\n")[3]?.trim() || "unknown";
          console.log(`[getCachedBrewSessions] Called by: ${caller}`);
        }

        await UnifiedLogger.debug(
          "UserCacheService.getCachedBrewSessions",
          `Loading cache for user ID: "${userId}"`
        );

        const cached = await AsyncStorage.getItem(
          STORAGE_KEYS_V2.USER_BREW_SESSIONS
        );
        if (!cached) {
          await UnifiedLogger.debug(
            "UserCacheService.getCachedBrewSessions",
            "No cache found"
          );
          return [];
        }

        const allSessions: SyncableItem<BrewSession>[] = JSON.parse(cached);
        await UnifiedLogger.debug(
          "UserCacheService.getCachedBrewSessions",
          `Total cached sessions found: ${allSessions.length}`
        );

        // Log sample of all cached session user IDs for debugging
        if (allSessions.length > 0) {
          const sampleUserIds = allSessions.slice(0, 5).map(item => ({
            id: item.data.id,
            user_id: item.data.user_id,
          }));
          await UnifiedLogger.debug(
            "UserCacheService.getCachedBrewSessions",
            "Sample cached sessions",
            { sampleUserIds }
          );
        }

        const userSessions = allSessions.filter(item => {
          const isMatch = item.data.user_id === userId;
          if (!isMatch) {
            console.log(
              `[UserCacheService.getCachedBrewSessions] Session ${item.data.id} user_id "${item.data.user_id}" != target "${userId}"`
            );
          }
          return isMatch;
        });

        await UnifiedLogger.debug(
          "UserCacheService.getCachedBrewSessions",
          `Filtered to ${userSessions.length} sessions for user "${userId}"`
        );
        return userSessions;
      } catch (e) {
        await UnifiedLogger.error(
          "UserCacheService.getCachedBrewSessions",
          "Corrupt USER_BREW_SESSIONS cache; resetting",
          { error: e }
        );
        await AsyncStorage.removeItem(STORAGE_KEYS_V2.USER_BREW_SESSIONS);
        return [];
      }
    });
  }

  /**
   * Add brew session to cache
   */
  static async addBrewSessionToCache(
    item: SyncableItem<BrewSession>
  ): Promise<void> {
    return await withKeyQueue(STORAGE_KEYS_V2.USER_BREW_SESSIONS, async () => {
      try {
        await UnifiedLogger.debug(
          "UserCacheService.addBrewSessionToCache",
          `Adding session to cache`,
          {
            sessionId: item.id,
            sessionName: item.data.name,
            userId: item.data.user_id,
            syncStatus: item.syncStatus,
          }
        );

        const cached = await AsyncStorage.getItem(
          STORAGE_KEYS_V2.USER_BREW_SESSIONS
        );
        const sessions: SyncableItem<BrewSession>[] = cached
          ? JSON.parse(cached)
          : [];

        sessions.push(item);

        await AsyncStorage.setItem(
          STORAGE_KEYS_V2.USER_BREW_SESSIONS,
          JSON.stringify(sessions)
        );

        await UnifiedLogger.debug(
          "UserCacheService.addBrewSessionToCache",
          `Successfully added session to cache`,
          { totalSessions: sessions.length }
        );
      } catch (error) {
        await UnifiedLogger.error(
          "UserCacheService.addBrewSessionToCache",
          "Error adding brew session to cache",
          { error: error instanceof Error ? error.message : "Unknown error" }
        );
        throw new OfflineError(
          "Failed to cache brew session",
          "CACHE_ERROR",
          true
        );
      }
    });
  }

  /**
   * Update brew session in cache
   */
  private static async updateBrewSessionInCache(
    updatedItem: SyncableItem<BrewSession>
  ): Promise<void> {
    return await withKeyQueue(STORAGE_KEYS_V2.USER_BREW_SESSIONS, async () => {
      try {
        await UnifiedLogger.debug(
          "UserCacheService.updateBrewSessionInCache",
          `Updating session in cache`,
          {
            sessionId: updatedItem.id,
            sessionName: updatedItem.data.name,
            syncStatus: updatedItem.syncStatus,
            needsSync: updatedItem.needsSync,
          }
        );

        const cached = await AsyncStorage.getItem(
          STORAGE_KEYS_V2.USER_BREW_SESSIONS
        );
        const sessions: SyncableItem<BrewSession>[] = cached
          ? JSON.parse(cached)
          : [];

        const index = sessions.findIndex(
          item =>
            item.id === updatedItem.id || item.data.id === updatedItem.data.id
        );

        if (index >= 0) {
          sessions[index] = updatedItem;
          await UnifiedLogger.debug(
            "UserCacheService.updateBrewSessionInCache",
            `Updated existing session at index ${index}`
          );
        } else {
          sessions.push(updatedItem);
          await UnifiedLogger.debug(
            "UserCacheService.updateBrewSessionInCache",
            `Added new session to cache`
          );
        }

        await AsyncStorage.setItem(
          STORAGE_KEYS_V2.USER_BREW_SESSIONS,
          JSON.stringify(sessions)
        );
      } catch (error) {
        await UnifiedLogger.error(
          "UserCacheService.updateBrewSessionInCache",
          "Error updating brew session in cache",
          { error: error instanceof Error ? error.message : "Unknown error" }
        );
        throw new OfflineError(
          "Failed to update cached brew session",
          "CACHE_ERROR",
          true
        );
      }
    });
  }

  /**
   * Remove brew session from cache completely (for offline create+delete cancellation)
   */
  private static async removeBrewSessionFromCache(
    entityId: string
  ): Promise<void> {
    return await withKeyQueue(STORAGE_KEYS_V2.USER_BREW_SESSIONS, async () => {
      try {
        await UnifiedLogger.debug(
          "UserCacheService.removeBrewSessionFromCache",
          `Removing session from cache`,
          { entityId }
        );

        const cached = await AsyncStorage.getItem(
          STORAGE_KEYS_V2.USER_BREW_SESSIONS
        );
        if (!cached) {
          return;
        }
        const sessions: SyncableItem<BrewSession>[] = JSON.parse(cached);
        const filteredSessions = sessions.filter(
          item => item.id !== entityId && item.data.id !== entityId
        );

        if (filteredSessions.length < sessions.length) {
          await AsyncStorage.setItem(
            STORAGE_KEYS_V2.USER_BREW_SESSIONS,
            JSON.stringify(filteredSessions)
          );
          await UnifiedLogger.debug(
            "UserCacheService.removeBrewSessionFromCache",
            `Successfully removed session from cache`,
            { removedCount: sessions.length - filteredSessions.length }
          );
        } else {
          await UnifiedLogger.warn(
            "UserCacheService.removeBrewSessionFromCache",
            `Session with ID "${entityId}" not found in cache for removal`
          );
        }
      } catch (error) {
        await UnifiedLogger.error(
          "UserCacheService.removeBrewSessionFromCache",
          "Error removing brew session from cache",
          {
            error: error instanceof Error ? error.message : "Unknown error",
            entityId,
          }
        );
      }
    });
  }

  /**
   * Clear all brew sessions for a specific user from cache
   */
  private static async clearUserBrewSessionsFromCache(
    userId: string
  ): Promise<void> {
    return await withKeyQueue(STORAGE_KEYS_V2.USER_BREW_SESSIONS, async () => {
      try {
        const cached = await AsyncStorage.getItem(
          STORAGE_KEYS_V2.USER_BREW_SESSIONS
        );
        if (!cached) {
          return;
        }

        const allSessions: SyncableItem<BrewSession>[] = JSON.parse(cached);
        // Keep sessions for other users, remove sessions for this user
        const filteredSessions = allSessions.filter(
          item => item.data.user_id !== userId
        );

        await AsyncStorage.setItem(
          STORAGE_KEYS_V2.USER_BREW_SESSIONS,
          JSON.stringify(filteredSessions)
        );
        await UnifiedLogger.debug(
          "UserCacheService.clearUserBrewSessionsFromCache",
          `Cleared sessions for user "${userId}", kept ${filteredSessions.length} sessions for other users`
        );
      } catch (error) {
        await UnifiedLogger.error(
          "UserCacheService.clearUserBrewSessionsFromCache",
          `Error clearing sessions for user: ${error instanceof Error ? error.message : "Unknown error"}`,
          {
            userId,
            error: error instanceof Error ? error.message : "Unknown error",
          }
        );
        throw error;
      }
    });
  }

  /**
   * Hydrate cache with brew sessions from server
   */
  private static async hydrateBrewSessionsFromServer(
    userId: string,
    forceRefresh: boolean = false,
    _userUnitSystem: "imperial" | "metric" = "imperial"
  ): Promise<void> {
    try {
      await UnifiedLogger.debug(
        "UserCacheService.hydrateBrewSessionsFromServer",
        `Fetching sessions from server for user: "${userId}" (forceRefresh: ${forceRefresh})`
      );

      // Import the API service here to avoid circular dependencies
      const { default: ApiService } = await import("@services/api/apiService");

      // Fetch user's brew sessions from server
      const response = await ApiService.brewSessions.getAll(1, 100); // Get first 100 sessions
      const serverSessions = response.data?.brew_sessions || [];

      // Initialize offline created sessions array
      let offlineCreatedSessions: SyncableItem<BrewSession>[] = [];

      // If force refresh and we successfully got server data, clear and replace cache
      if (forceRefresh && serverSessions.length >= 0) {
        await UnifiedLogger.debug(
          "UserCacheService.hydrateBrewSessionsFromServer",
          `Force refresh successful - updating cache for user "${userId}"`
        );

        // Get existing offline-created sessions to preserve before clearing
        const cached = await AsyncStorage.getItem(
          STORAGE_KEYS_V2.USER_BREW_SESSIONS
        );
        if (cached) {
          const allSessions: SyncableItem<BrewSession>[] = JSON.parse(cached);
          offlineCreatedSessions = allSessions.filter(item => {
            // Only preserve sessions for this user
            if (item.data.user_id !== userId) {
              return false;
            }

            // Always preserve sessions that need sync (including pending deletions)
            if (item.needsSync || item.syncStatus === "pending") {
              return true;
            }

            // Always preserve temp sessions (newly created offline)
            if (item.tempId) {
              return true;
            }

            // Don't preserve deleted sessions that have already been synced
            if (item.isDeleted && !item.needsSync) {
              return false;
            }

            return false;
          });

          await UnifiedLogger.debug(
            "UserCacheService.hydrateBrewSessionsFromServer",
            `Found ${offlineCreatedSessions.length} V2 offline-created sessions to preserve`
          );
        }

        // Clear all sessions for this user
        await this.clearUserBrewSessionsFromCache(userId);

        // Restore offline-created sessions first
        for (const session of offlineCreatedSessions) {
          await this.addBrewSessionToCache(session);
        }

        await UnifiedLogger.debug(
          "UserCacheService.hydrateBrewSessionsFromServer",
          `Preserved ${offlineCreatedSessions.length} offline-created sessions`
        );
      }

      await UnifiedLogger.debug(
        "UserCacheService.hydrateBrewSessionsFromServer",
        `Fetched ${serverSessions.length} sessions from server`
      );

      // Only process and cache server sessions if we have them
      if (serverSessions.length > 0) {
        // Filter out server sessions that are already preserved (to avoid duplicates)
        const preservedIds = new Set(
          offlineCreatedSessions.map(s => s.id || s.data.id)
        );
        const filteredServerSessions = serverSessions.filter(
          session => !preservedIds.has(session.id)
        );

        await UnifiedLogger.debug(
          "UserCacheService.hydrateBrewSessionsFromServer",
          `Filtered out ${serverSessions.length - filteredServerSessions.length} duplicate server sessions`
        );

        // Convert server sessions to syncable items
        const now = Date.now();
        const syncableSessions = filteredServerSessions.map(session => ({
          id: session.id,
          data: session,
          lastModified: now,
          syncStatus: "synced" as const,
          needsSync: false,
        }));

        // Store all sessions in cache
        for (const session of syncableSessions) {
          await this.addBrewSessionToCache(session);
        }

        await UnifiedLogger.debug(
          "UserCacheService.hydrateBrewSessionsFromServer",
          `Successfully cached ${syncableSessions.length} sessions`
        );
      } else if (!forceRefresh) {
        // Only log this for non-force refresh (normal hydration)
        await UnifiedLogger.debug(
          "UserCacheService.hydrateBrewSessionsFromServer",
          `No server sessions found`
        );
      }
    } catch (error) {
      await UnifiedLogger.error(
        "UserCacheService.hydrateBrewSessionsFromServer",
        `Failed to hydrate from server: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          userId,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      );
      throw error;
    }
  }

  /**
   * Refresh brew sessions from server (for pull-to-refresh functionality)
   */
  static async refreshBrewSessionsFromServer(
    userId: string,
    userUnitSystem: "imperial" | "metric" = "imperial"
  ): Promise<BrewSession[]> {
    try {
      await UnifiedLogger.info(
        "UserCacheService.refreshBrewSessionsFromServer",
        `Force refreshing sessions from server for user: "${userId}"`
      );

      await this.hydrateBrewSessionsFromServer(userId, true, userUnitSystem);

      // Return the updated sessions
      const refreshedSessions = await this.getBrewSessions(
        userId,
        userUnitSystem
      );

      await UnifiedLogger.info(
        "UserCacheService.refreshBrewSessionsFromServer",
        `Refresh completed, returning ${refreshedSessions.length} sessions`
      );

      return refreshedSessions;
    } catch (error) {
      await UnifiedLogger.error(
        "UserCacheService.refreshBrewSessionsFromServer",
        `Failed to refresh sessions from server: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          userId,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      );
      throw error;
    }
  }

  /**
   * Sanitize brew session update data for API consumption
   * Ensures all fields are properly formatted and valid for backend validation
   */
  private static sanitizeBrewSessionUpdatesForAPI(
    updates: Partial<BrewSession>
  ): Partial<BrewSession> {
    const sanitized = { ...updates };

    // Debug logging to understand the data being sanitized
    if (__DEV__) {
      UnifiedLogger.debug(
        "UserCacheService.sanitizeBrewSessionUpdatesForAPI",
        "Sanitizing brew session data for API",
        {
          originalFields: Object.keys(updates),
          hasFermentationEntries: !!(
            sanitized.fermentation_entries &&
            sanitized.fermentation_entries.length > 0
          ),
          fermentationEntryCount: sanitized.fermentation_entries?.length || 0,
        }
      );
    }

    // Remove fields that shouldn't be updated via API
    delete sanitized.id;
    delete sanitized.created_at;
    delete sanitized.user_id;

    // Sanitize numeric fields
    if (sanitized.batch_size !== undefined && sanitized.batch_size !== null) {
      sanitized.batch_size = Number(sanitized.batch_size) || 0;
    }
    if (sanitized.actual_og !== undefined && sanitized.actual_og !== null) {
      sanitized.actual_og = Number(sanitized.actual_og) || undefined;
    }
    if (sanitized.actual_fg !== undefined && sanitized.actual_fg !== null) {
      sanitized.actual_fg = Number(sanitized.actual_fg) || undefined;
    }
    if (sanitized.actual_abv !== undefined && sanitized.actual_abv !== null) {
      sanitized.actual_abv = Number(sanitized.actual_abv) || undefined;
    }
    if (sanitized.mash_temp !== undefined && sanitized.mash_temp !== null) {
      sanitized.mash_temp = Number(sanitized.mash_temp) || undefined;
    }
    if (
      sanitized.actual_efficiency !== undefined &&
      sanitized.actual_efficiency !== null
    ) {
      sanitized.actual_efficiency =
        Number(sanitized.actual_efficiency) || undefined;
    }
    if (
      sanitized.batch_rating !== undefined &&
      sanitized.batch_rating !== null
    ) {
      sanitized.batch_rating =
        Math.floor(Number(sanitized.batch_rating)) || undefined;
    }

    // Debug logging for sanitized result
    if (__DEV__) {
      UnifiedLogger.debug(
        "UserCacheService.sanitizeBrewSessionUpdatesForAPI",
        "Sanitization completed",
        {
          sanitizedFields: Object.keys(sanitized),
          removedFields: Object.keys(updates).filter(
            key => !(key in sanitized)
          ),
        }
      );
    }

    return sanitized;
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
      const { default: ApiService } = await import("@services/api/apiService");

      switch (operation.type) {
        case "create":
          if (operation.entityType === "recipe") {
            const response = await ApiService.recipes.create(operation.data);
            if (response && response.data && response.data.id) {
              return { realId: response.data.id };
            }
          } else if (operation.entityType === "brew_session") {
            await UnifiedLogger.info(
              "UserCacheService.processPendingOperation",
              `Executing CREATE API call for brew session`,
              {
                entityId: operation.entityId,
                operationId: operation.id,
                sessionName: operation.data?.name || "Unknown",
                brewSessionData: operation.data, // Log the actual data being sent
              }
            );
            const response = await ApiService.brewSessions.create(
              operation.data
            );
            if (response && response.data && response.data.id) {
              await UnifiedLogger.info(
                "UserCacheService.processPendingOperation",
                `CREATE API call successful for brew session`,
                {
                  entityId: operation.entityId,
                  realId: response.data.id,
                }
              );
              return { realId: response.data.id };
            }
          }
          break;

        case "update":
          if (operation.entityType === "recipe") {
            // Check if this is a temp ID - if so, treat as CREATE instead of UPDATE
            const isTempId = operation.entityId.startsWith("temp_");

            if (isTempId) {
              // Convert UPDATE with temp ID to CREATE operation
              if (__DEV__) {
                console.log(
                  `[UserCacheService.syncOperation] Converting UPDATE with temp ID ${operation.entityId} to CREATE operation:`,
                  JSON.stringify(operation.data, null, 2)
                );
              }
              const response = await ApiService.recipes.create(operation.data);
              if (response && response.data && response.data.id) {
                return { realId: response.data.id };
              }
            } else {
              // Normal UPDATE operation for real MongoDB IDs
              if (__DEV__) {
                console.log(
                  `[UserCacheService.syncOperation] Sending UPDATE data to API for recipe ${operation.entityId}:`,
                  JSON.stringify(operation.data, null, 2)
                );
              }
              await ApiService.recipes.update(
                operation.entityId,
                operation.data
              );
            }
          } else if (operation.entityType === "brew_session") {
            // Check if this is a temp ID - if so, treat as CREATE instead of UPDATE
            const isTempId = operation.entityId.startsWith("temp_");

            if (isTempId) {
              // Convert UPDATE with temp ID to CREATE operation
              await UnifiedLogger.info(
                "UserCacheService.processPendingOperation",
                `Converting UPDATE with temp ID ${operation.entityId} to CREATE operation for brew session`,
                {
                  entityId: operation.entityId,
                  sessionName: operation.data?.name || "Unknown",
                }
              );
              const response = await ApiService.brewSessions.create(
                operation.data
              );
              if (response && response.data && response.data.id) {
                return { realId: response.data.id };
              }
            } else {
              // Normal UPDATE operation for real MongoDB IDs
              await UnifiedLogger.info(
                "UserCacheService.processPendingOperation",
                `Executing UPDATE API call for brew session ${operation.entityId}`,
                {
                  entityId: operation.entityId,
                  updateFields: Object.keys(operation.data || {}),
                  sessionName: operation.data?.name || "Unknown",
                }
              );
              await ApiService.brewSessions.update(
                operation.entityId,
                operation.data
              );
              await UnifiedLogger.info(
                "UserCacheService.processPendingOperation",
                `UPDATE API call successful for brew session ${operation.entityId}`
              );
            }
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
          } else if (operation.entityType === "brew_session") {
            await UnifiedLogger.info(
              "UserCacheService.processPendingOperation",
              `Executing DELETE API call for brew session ${operation.entityId}`,
              {
                entityId: operation.entityId,
                operationId: operation.id,
              }
            );
            await ApiService.brewSessions.delete(operation.entityId);
            await UnifiedLogger.info(
              "UserCacheService.processPendingOperation",
              `DELETE API call successful for brew session ${operation.entityId}`
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
          // Keep tempId for navigation compatibility - don't delete it
          // This allows recipes to still be found by their original temp ID
          // even after they've been synced and assigned a real ID
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

      // 1b) Update brew session cache under USER_BREW_SESSIONS lock
      await withKeyQueue(STORAGE_KEYS_V2.USER_BREW_SESSIONS, async () => {
        const cached = await AsyncStorage.getItem(
          STORAGE_KEYS_V2.USER_BREW_SESSIONS
        );
        if (!cached) {
          return;
        }
        const sessions: SyncableItem<BrewSession>[] = JSON.parse(cached);
        const i = sessions.findIndex(
          item => item.id === tempId || item.data.id === tempId
        );
        if (i >= 0) {
          sessions[i].id = realId;
          sessions[i].data.id = realId;
          sessions[i].data.updated_at = new Date().toISOString();
          sessions[i].syncStatus = "synced";
          sessions[i].needsSync = false;
          // Keep tempId for navigation compatibility - don't delete it
          // This allows sessions to still be found by their original temp ID
          // even after they've been synced and assigned a real ID
          await AsyncStorage.setItem(
            STORAGE_KEYS_V2.USER_BREW_SESSIONS,
            JSON.stringify(sessions)
          );
          await UnifiedLogger.debug(
            "UserCacheService.mapTempIdToRealId",
            `Mapped brew session temp ID to real ID`,
            {
              tempId,
              realId,
              sessionName: sessions[i].data.name,
            }
          );
        } else {
          console.warn(
            `[UserCacheService] Brew session with temp ID "${tempId}" not found in cache`
          );
        }
      });

      // 1c) Update recipe_id references in brew sessions that reference the mapped recipe
      await withKeyQueue(STORAGE_KEYS_V2.USER_BREW_SESSIONS, async () => {
        const cached = await AsyncStorage.getItem(
          STORAGE_KEYS_V2.USER_BREW_SESSIONS
        );
        if (!cached) {
          return;
        }
        const sessions: SyncableItem<BrewSession>[] = JSON.parse(cached);
        let updatedCount = 0;

        // Find all sessions that reference the old temp recipe ID
        for (const session of sessions) {
          if (session.data.recipe_id === tempId) {
            session.data.recipe_id = realId;
            session.data.updated_at = new Date().toISOString();
            // Always mark as needing sync to propagate the new recipe_id to server
            session.needsSync = true;
            session.syncStatus = "pending";
            session.lastModified = Date.now();
            updatedCount++;
            await UnifiedLogger.debug(
              "UserCacheService.mapTempIdToRealId",
              `Updated recipe_id reference in brew session`,
              {
                sessionId: session.id,
                sessionName: session.data.name,
                oldRecipeId: tempId,
                newRecipeId: realId,
              }
            );
          }
        }

        if (updatedCount > 0) {
          await AsyncStorage.setItem(
            STORAGE_KEYS_V2.USER_BREW_SESSIONS,
            JSON.stringify(sessions)
          );
          await UnifiedLogger.info(
            "UserCacheService.mapTempIdToRealId",
            `Updated ${updatedCount} brew session(s) with new recipe_id reference`,
            {
              tempRecipeId: tempId,
              realRecipeId: realId,
              updatedSessions: updatedCount,
            }
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
          // Update entityId if it matches the temp ID
          if (op.entityId === tempId) {
            op.entityId = realId;
            updated = true;
          }
          // Update recipe_id in brew session operation data if it references the temp recipe ID
          if (op.entityType === "brew_session" && op.data) {
            const brewSessionData = op.data as Partial<BrewSession>;
            if (brewSessionData.recipe_id === tempId) {
              brewSessionData.recipe_id = realId;
              updated = true;
              await UnifiedLogger.debug(
                "UserCacheService.mapTempIdToRealId",
                `Updated recipe_id in pending brew session operation`,
                {
                  operationId: op.id,
                  operationType: op.type,
                  oldRecipeId: tempId,
                  newRecipeId: realId,
                }
              );
            }
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
      // Try to mark recipe as synced
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
          await UnifiedLogger.debug(
            "UserCacheService.markItemAsSynced",
            `Marked recipe as synced`,
            { entityId, recipeName: recipes[i].data.name }
          );
        } else {
          console.warn(
            `[UserCacheService] Recipe with ID "${entityId}" not found in cache for marking as synced`
          );
        }
      });

      // Try to mark brew session as synced
      await withKeyQueue(STORAGE_KEYS_V2.USER_BREW_SESSIONS, async () => {
        const cached = await AsyncStorage.getItem(
          STORAGE_KEYS_V2.USER_BREW_SESSIONS
        );
        if (!cached) {
          return;
        }
        const sessions: SyncableItem<BrewSession>[] = JSON.parse(cached);
        const i = sessions.findIndex(
          item => item.id === entityId || item.data.id === entityId
        );
        if (i >= 0) {
          sessions[i].syncStatus = "synced";
          sessions[i].needsSync = false;
          sessions[i].data.updated_at = new Date().toISOString();
          await AsyncStorage.setItem(
            STORAGE_KEYS_V2.USER_BREW_SESSIONS,
            JSON.stringify(sessions)
          );
          await UnifiedLogger.debug(
            "UserCacheService.markItemAsSynced",
            `Marked brew session as synced`,
            { entityId, sessionName: sessions[i].data.name }
          );
        } else {
          console.warn(
            `[UserCacheService] Brew session with ID "${entityId}" not found in cache for marking as synced`
          );
        }
      });
    } catch (error) {
      await UnifiedLogger.error(
        "UserCacheService.markItemAsSynced",
        "Error marking item as synced",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          entityId,
        }
      );
    }
  }

  /**
   * Remove an item completely from cache (for successful delete operations)
   */
  private static async removeItemFromCache(entityId: string): Promise<void> {
    try {
      // Try to remove recipe from cache
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
          await UnifiedLogger.debug(
            "UserCacheService.removeItemFromCache",
            `Removed recipe from cache`,
            { entityId, removedCount: recipes.length - filteredRecipes.length }
          );
        } else {
          console.warn(
            `[UserCacheService] Recipe with ID "${entityId}" not found in cache for removal`
          );
        }
      });

      // Try to remove brew session from cache
      await withKeyQueue(STORAGE_KEYS_V2.USER_BREW_SESSIONS, async () => {
        const cached = await AsyncStorage.getItem(
          STORAGE_KEYS_V2.USER_BREW_SESSIONS
        );
        if (!cached) {
          return;
        }
        const sessions: SyncableItem<BrewSession>[] = JSON.parse(cached);
        const filteredSessions = sessions.filter(
          item => item.id !== entityId && item.data.id !== entityId
        );

        if (filteredSessions.length < sessions.length) {
          await AsyncStorage.setItem(
            STORAGE_KEYS_V2.USER_BREW_SESSIONS,
            JSON.stringify(filteredSessions)
          );
          await UnifiedLogger.debug(
            "UserCacheService.removeItemFromCache",
            `Removed brew session from cache`,
            {
              entityId,
              removedCount: sessions.length - filteredSessions.length,
            }
          );
        } else {
          console.warn(
            `[UserCacheService] Brew session with ID "${entityId}" not found in cache for removal`
          );
        }
      });
    } catch (error) {
      await UnifiedLogger.error(
        "UserCacheService.removeItemFromCache",
        "Error removing item from cache",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          entityId,
        }
      );
    }
  }

  /**
   * Sanitize recipe update data for API consumption
   * Ensures all fields are properly formatted and valid for backend validation
   */
  private static sanitizeRecipeUpdatesForAPI(
    updates: Partial<Recipe>
  ): Partial<Recipe> {
    const sanitized = { ...updates };

    // Debug logging to understand the data being sanitized
    if (__DEV__ && sanitized.ingredients) {
      console.log(
        "[UserCacheService.sanitizeRecipeUpdatesForAPI] Original ingredients:",
        JSON.stringify(
          sanitized.ingredients.map(ing => ({
            name: ing.name,
            id: ing.id,
            id_type: typeof ing.id,
            ingredient_id: (ing as any).ingredient_id,
            ingredient_id_type: typeof (ing as any).ingredient_id,
          })),
          null,
          2
        )
      );
    }

    // Remove fields that shouldn't be updated via API
    delete sanitized.id;
    delete sanitized.created_at;
    delete sanitized.user_id;

    // Sanitize numeric fields
    if (sanitized.batch_size !== undefined && sanitized.batch_size !== null) {
      sanitized.batch_size = Number(sanitized.batch_size) || 0;
    }
    if (sanitized.boil_time !== undefined && sanitized.boil_time !== null) {
      sanitized.boil_time = Number(sanitized.boil_time) || 0;
    }
    if (sanitized.efficiency !== undefined && sanitized.efficiency !== null) {
      sanitized.efficiency = Number(sanitized.efficiency) || 0;
    }
    if (
      sanitized.mash_temperature !== undefined &&
      sanitized.mash_temperature !== null
    ) {
      sanitized.mash_temperature = Number(sanitized.mash_temperature) || 0;
    }
    if (sanitized.mash_time !== undefined && sanitized.mash_time !== null) {
      sanitized.mash_time = Number(sanitized.mash_time) || 0;
    }

    // Sanitize ingredients array to match BrewTracker frontend format exactly
    if (sanitized.ingredients && Array.isArray(sanitized.ingredients)) {
      sanitized.ingredients = sanitized.ingredients.map(ingredient => {
        // Extract the correct ingredient_id from either ingredient_id or complex id
        let ingredientId = (ingredient as any).ingredient_id;

        // If no ingredient_id but we have a complex id, try to extract it
        if (
          !ingredientId &&
          ingredient.id &&
          typeof ingredient.id === "string"
        ) {
          // Try to extract ingredient_id from complex id format like "grain-687a59172023723cb876ba97-none-0"
          const parts = ingredient.id.split("-");
          if (parts.length >= 2) {
            const potentialId = parts[1];
            // Validate it looks like an ObjectID (24 hex characters)
            if (/^[a-fA-F0-9]{24}$/.test(potentialId)) {
              ingredientId = potentialId;
            }
          }
        }

        // Create clean ingredient object following BrewTracker frontend format exactly
        // Only include fields that the backend expects, excluding UI-specific fields
        const sanitizedIngredient: any = {};

        // Only add ingredient_id if it's a valid ObjectID
        if (
          ingredientId &&
          typeof ingredientId === "string" &&
          /^[a-fA-F0-9]{24}$/.test(ingredientId)
        ) {
          sanitizedIngredient.ingredient_id = ingredientId;
        }

        // Required fields
        sanitizedIngredient.name = ingredient.name || "";
        sanitizedIngredient.type = ingredient.type || "grain";
        sanitizedIngredient.amount = Number(ingredient.amount) || 0;
        sanitizedIngredient.unit = ingredient.unit || "lb";
        sanitizedIngredient.use = ingredient.use || "mash";
        sanitizedIngredient.time = Math.floor(Number(ingredient.time)) || 0;

        // Optional fields - only add if they exist and are valid
        if (
          ingredient.potential !== undefined &&
          ingredient.potential !== null
        ) {
          const potentialNum = Number(ingredient.potential);
          if (!isNaN(potentialNum)) {
            sanitizedIngredient.potential = potentialNum;
          }
        }

        if (ingredient.color !== undefined && ingredient.color !== null) {
          const colorNum = Number(ingredient.color);
          if (!isNaN(colorNum)) {
            sanitizedIngredient.color = colorNum;
          }
        }

        if (ingredient.grain_type) {
          sanitizedIngredient.grain_type = ingredient.grain_type;
        }

        if (
          ingredient.alpha_acid !== undefined &&
          ingredient.alpha_acid !== null
        ) {
          const alphaAcidNum = Number(ingredient.alpha_acid);
          if (!isNaN(alphaAcidNum)) {
            sanitizedIngredient.alpha_acid = alphaAcidNum;
          }
        }

        if (
          ingredient.attenuation !== undefined &&
          ingredient.attenuation !== null
        ) {
          const attenuationNum = Number(ingredient.attenuation);
          if (!isNaN(attenuationNum)) {
            sanitizedIngredient.attenuation = attenuationNum;
          }
        }

        return sanitizedIngredient;
      });
    }

    // Debug logging to see the sanitized result
    if (__DEV__ && sanitized.ingredients) {
      console.log(
        "[UserCacheService.sanitizeRecipeUpdatesForAPI] Sanitized ingredients (FULL):",
        JSON.stringify(sanitized.ingredients, null, 2)
      );
    }

    return sanitized;
  }
}

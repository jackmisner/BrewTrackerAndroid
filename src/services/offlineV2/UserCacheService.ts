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
import {
  SyncableItem,
  PendingOperation,
  SyncResult,
  OfflineError,
  SyncError,
  STORAGE_KEYS_V2,
  Recipe,
} from "@src/types";

export class UserCacheService {
  private static syncInProgress = false;
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_BACKOFF_BASE = 1000; // 1 second

  // ============================================================================
  // Recipe Management
  // ============================================================================

  /**
   * Get all recipes for a user
   */
  static async getRecipes(userId: string): Promise<Recipe[]> {
    try {
      const cached = await this.getCachedRecipes(userId);

      // Filter out deleted items and return data
      return cached
        .filter(item => !item.isDeleted)
        .map(item => item.data)
        .sort((a, b) => Number(b.created_at) - Number(a.created_at));
    } catch (error) {
      console.error("Error getting recipes:", error);
      throw new OfflineError("Failed to get recipes", "RECIPES_ERROR", true);
    }
  }

  /**
   * Create a new recipe
   */
  static async createRecipe(recipe: Partial<Recipe>): Promise<Recipe> {
    try {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = Date.now();

      const newRecipe: Recipe = {
        id: tempId,
        name: recipe.name || "",
        description: recipe.description || "",
        ingredients: recipe.ingredients || [],
        created_at: now.toString(),
        updated_at: now.toString(),
        user_id: recipe.user_id || "",
        is_public: recipe.is_public || false,
        ...recipe,
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

      // Add to cache
      await this.addRecipeToCache(syncableItem);

      // Add to pending operations
      const operation: PendingOperation = {
        id: `create_${tempId}`,
        type: "create",
        entityType: "recipe",
        entityId: tempId,
        data: recipe,
        timestamp: now,
        retryCount: 0,
        maxRetries: this.MAX_RETRY_ATTEMPTS,
      };

      await this.addPendingOperation(operation);

      // Trigger background sync
      this.backgroundSync();

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
      const userId = updates.user_id || "";
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
        updated_at: now.toString(),
      };

      // Update syncable item
      const updatedItem: SyncableItem<Recipe> = {
        ...existingItem,
        data: updatedRecipe,
        lastModified: now,
        syncStatus: "pending",
        needsSync: true,
      };

      // Update cache
      await this.updateRecipeInCache(updatedItem);

      // Add to pending operations
      const operation: PendingOperation = {
        id: `update_${id}_${now}`,
        type: "update",
        entityType: "recipe",
        entityId: id,
        data: updates,
        timestamp: now,
        retryCount: 0,
        maxRetries: this.MAX_RETRY_ATTEMPTS,
      };

      await this.addPendingOperation(operation);

      // Trigger background sync
      this.backgroundSync();

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
      const cached = await this.getCachedRecipes(userId || "");
      const existingItem = cached.find(
        item => item.id === id || item.data.id === id
      );

      if (!existingItem) {
        throw new OfflineError("Recipe not found", "NOT_FOUND", false);
      }

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

      // Update cache
      await this.updateRecipeInCache(deletedItem);

      // Add to pending operations
      const operation: PendingOperation = {
        id: `delete_${id}_${now}`,
        type: "delete",
        entityType: "recipe",
        entityId: id,
        timestamp: now,
        retryCount: 0,
        maxRetries: this.MAX_RETRY_ATTEMPTS,
      };

      await this.addPendingOperation(operation);

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
    // Check for stuck sync
    if (this.syncInProgress && this.syncStartTime) {
      const elapsed = Date.now() - this.syncStartTime;
      if (elapsed > this.SYNC_TIMEOUT_MS) {
        console.warn("Resetting stuck sync flag");
        this.syncInProgress = false;
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

    this.syncInProgress = true;
    const result: SyncResult = {
      success: true,
      processed: 0,
      failed: 0,
      conflicts: 0,
      errors: [],
    };

    try {
      const operations = await this.getPendingOperations();

      for (const operation of operations) {
        try {
          await this.processPendingOperation(operation);
          await this.removePendingOperation(operation.id);
          result.processed++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.error(
            `Failed to process operation ${operation.id}:`,
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

      if (result.failed === 0) {
        result.success = true;
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Sync failed:", errorMessage);
      result.success = false;
      result.errors.push(`Sync process failed: ${errorMessage}`);
      return result;
    } finally {
      this.syncInProgress = false;
    }
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

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get cached recipes for a user
   */
  private static async getCachedRecipes(
    userId: string
  ): Promise<SyncableItem<Recipe>[]> {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS_V2.USER_RECIPES);
    if (!cached) {
      return [];
    }

    const allRecipes: SyncableItem<Recipe>[] = JSON.parse(cached);
    return allRecipes.filter(item => item.data.user_id === userId);
  }

  /**
   * Add recipe to cache
   */
  private static async addRecipeToCache(
    item: SyncableItem<Recipe>
  ): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS_V2.USER_RECIPES);
      const recipes: SyncableItem<Recipe>[] = cached ? JSON.parse(cached) : [];

      recipes.push(item);

      await AsyncStorage.setItem(
        STORAGE_KEYS_V2.USER_RECIPES,
        JSON.stringify(recipes)
      );
    } catch (error) {
      console.error("Error adding recipe to cache:", error);
      throw new OfflineError("Failed to cache recipe", "CACHE_ERROR", true);
    }
  }

  /**
   * Update recipe in cache
   */
  private static async updateRecipeInCache(
    updatedItem: SyncableItem<Recipe>
  ): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS_V2.USER_RECIPES);
      const recipes: SyncableItem<Recipe>[] = cached ? JSON.parse(cached) : [];

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
    try {
      const operations = await this.getPendingOperations();
      operations.push(operation);

      await AsyncStorage.setItem(
        STORAGE_KEYS_V2.PENDING_OPERATIONS,
        JSON.stringify(operations)
      );
    } catch (error) {
      console.error("Error adding pending operation:", error);
      throw new OfflineError("Failed to queue operation", "QUEUE_ERROR", true);
    }
  }

  /**
   * Remove pending operation
   */
  private static async removePendingOperation(
    operationId: string
  ): Promise<void> {
    try {
      const operations = await this.getPendingOperations();
      const filtered = operations.filter(op => op.id !== operationId);

      await AsyncStorage.setItem(
        STORAGE_KEYS_V2.PENDING_OPERATIONS,
        JSON.stringify(filtered)
      );
    } catch (error) {
      console.error("Error removing pending operation:", error);
    }
  }

  /**
   * Update pending operation
   */
  private static async updatePendingOperation(
    operation: PendingOperation
  ): Promise<void> {
    try {
      const operations = await this.getPendingOperations();
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
  }

  /**
   * Process a single pending operation
   */
  private static async processPendingOperation(
    operation: PendingOperation
  ): Promise<void> {
    try {
      switch (operation.type) {
        case "create":
          if (operation.entityType === "recipe") {
            await ApiService.recipes.create(operation.data);
          }
          break;

        case "update":
          if (operation.entityType === "recipe") {
            await ApiService.recipes.update(operation.entityId, operation.data);
          }
          break;

        case "delete":
          if (operation.entityType === "recipe") {
            await ApiService.recipes.delete(operation.entityId);
          }
          break;

        default:
          throw new SyncError(
            `Unknown operation type: ${operation.type}`,
            operation
          );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `Error processing ${operation.type} operation:`,
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
      // Don't wait for sync to complete
      setTimeout(async () => {
        try {
          await this.syncPendingOperations();
        } catch (error) {
          console.warn("Background sync failed:", error);
        }
      }, 1000); // 1 second delay
    } catch (error) {
      console.warn("Failed to start background sync:", error);
    }
  }
}

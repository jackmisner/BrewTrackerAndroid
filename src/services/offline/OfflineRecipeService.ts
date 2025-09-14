/**
 * Offline Recipe Service for BrewTracker Android
 *
 * Provides offline-first CRUD operations for recipes with automatic synchronization.
 * Falls back to local storage when network is unavailable and syncs when reconnected.
 *
 * Features:
 * - Offline recipe creation, reading, updating, and deletion
 * - Automatic conflict resolution with last-write-wins strategy
 * - Background synchronization when network becomes available
 * - Optimistic UI updates with rollback on sync failure
 * - Temporary ID generation for offline-created recipes
 *
 * @example
 * ```typescript
 * // Create recipe offline
 * const recipe = await OfflineRecipeService.create(recipeData);
 *
 * // Get all recipes (online + offline)
 * const recipes = await OfflineRecipeService.getAll();
 *
 * // Sync pending changes when online
 * await OfflineRecipeService.syncPendingChanges();
 * ```
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiService from "@services/api/apiService";
import { STORAGE_KEYS } from "@services/config";
import { Recipe, CreateRecipeRequest, UpdateRecipeRequest } from "@src/types";
import NetInfo from "@react-native-community/netinfo";
import { extractUserIdFromJWT } from "@utils/jwtUtils";

// Offline-specific types
export interface OfflineRecipe extends Recipe {
  // Offline-specific metadata
  isOffline?: boolean;
  tempId?: string;
  lastModified: number;
  syncStatus: "pending" | "synced" | "conflict" | "failed";
  originalData?: Recipe; // For conflict resolution
}

export interface OfflinePendingOperation {
  id: string;
  type: "create" | "update" | "delete";
  recipeId: string;
  data?: CreateRecipeRequest | UpdateRecipeRequest;
  timestamp: number;
  retryCount: number;
}

export interface OfflineRecipeState {
  recipes: OfflineRecipe[];
  pendingOperations: OfflinePendingOperation[];
  lastSync: number;
  version: number;
}

/**
 * Offline-first Recipe Service
 */
export class OfflineRecipeService {
  private static readonly STORAGE_KEY = STORAGE_KEYS.OFFLINE_RECIPES;
  private static readonly PENDING_OPERATIONS_KEY = `${STORAGE_KEYS.OFFLINE_RECIPES}_pending`;

  /**
   * Generate temporary ID for offline-created recipes
   */
  private static generateTempId(): string {
    // Use crypto.randomUUID() for better uniqueness guarantees if available
    const uuid = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 9)}`;
    return `offline_${uuid}`;
  }

  /**
   * Load offline recipe state from storage
   */
  private static async loadOfflineState(): Promise<OfflineRecipeState> {
    try {
      const [recipesData, operationsData] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEY),
        AsyncStorage.getItem(this.PENDING_OPERATIONS_KEY),
      ]);

      const recipes: OfflineRecipe[] = recipesData
        ? JSON.parse(recipesData)
        : [];
      const pendingOperations: OfflinePendingOperation[] = operationsData
        ? JSON.parse(operationsData)
        : [];

      return {
        recipes,
        pendingOperations,
        lastSync: 0,
        version: 1,
      };
    } catch (error) {
      console.error("Failed to load offline recipe state:", error);
      return {
        recipes: [],
        pendingOperations: [],
        lastSync: 0,
        version: 1,
      };
    }
  }

  /**
   * Save offline recipe state to storage
   */
  private static async saveOfflineState(
    state: OfflineRecipeState
  ): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(state.recipes)),
        AsyncStorage.setItem(
          this.PENDING_OPERATIONS_KEY,
          JSON.stringify(state.pendingOperations)
        ),
      ]);
    } catch (error) {
      console.error("Failed to save offline recipe state:", error);
      throw error;
    }
  }
  private static operationQueue: Promise<void> = Promise.resolve();

  /**
   * Add pending operation for later sync
   */
  private static async addPendingOperation(
    operation: Omit<OfflinePendingOperation, "id">
  ): Promise<void> {
    // Queue operations to prevent race conditions
    this.operationQueue = this.operationQueue.then(async () => {
      const state = await this.loadOfflineState();

      const newOperation: OfflinePendingOperation = {
        ...operation,
        id: this.generateTempId(),
      };

      state.pendingOperations.push(newOperation);
      await this.saveOfflineState(state);
    });

    await this.operationQueue;
  }

  /**
   * Check if device is currently online
   */
  private static async isOnline(): Promise<boolean> {
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        return false;
      }
      // Also check API availability
      return await ApiService.checkConnection();
    } catch {
      return false;
    }
  }

  /**
   * Get current user ID from JWT token
   * Returns null if no token or extraction fails
   */
  private static async getCurrentUserId(): Promise<string | null> {
    try {
      const token = await ApiService.token.getToken();
      if (!token) {
        console.warn("No JWT token found for user ID extraction");
        return null;
      }

      const userId = extractUserIdFromJWT(token);
      if (!userId) {
        console.warn("Failed to extract user ID from JWT token");
        return null;
      }

      return userId;
    } catch (error) {
      console.warn("Error extracting user ID from token:", error);
      return null;
    }
  }

  /**
   * Get all recipes (combines online and offline)
   */
  static async getAll(): Promise<OfflineRecipe[]> {
    const state = await this.loadOfflineState();

    // If online, try to fetch latest from server and merge with offline
    if (await this.isOnline()) {
      try {
        // Fetch all recipes with pagination
        let allServerRecipes: Recipe[] = [];
        let page = 1;
        let hasMore = true;
        const pageSize = 100;

        while (hasMore) {
          const response = await ApiService.recipes.getAll(page, pageSize);
          allServerRecipes = [...allServerRecipes, ...response.data.recipes];
          hasMore = response.data.recipes.length === pageSize;
          page++;
        }
        const serverRecipes: OfflineRecipe[] = allServerRecipes.map(recipe => ({
          ...recipe,
          isOffline: false,
          lastModified: Date.now(),
          syncStatus: "synced" as const,
        }));

        // Merge with offline recipes (offline takes precedence for conflicts)
        const mergedRecipes = this.mergeRecipes(serverRecipes, state.recipes);

        // Update cached recipes
        state.recipes = mergedRecipes;
        await this.saveOfflineState(state);

        return mergedRecipes;
      } catch (error) {
        console.warn(
          "Failed to fetch online recipes, using offline cache:",
          error
        );
      }
    }

    // Return offline recipes
    return state.recipes;
  }

  /**
   * Get recipe by ID
   */
  static async getById(id: string): Promise<OfflineRecipe | null> {
    const state = await this.loadOfflineState();

    // Check offline cache first
    const offlineRecipe = state.recipes.find(
      r => r.id === id || r.tempId === id
    );

    // If found offline and it's newer or we're offline, return it
    if (
      offlineRecipe &&
      (!(await this.isOnline()) || offlineRecipe.isOffline)
    ) {
      return offlineRecipe;
    }

    // Try to fetch from server if online
    if (await this.isOnline()) {
      try {
        const response = await ApiService.recipes.getById(id);
        const serverRecipe: OfflineRecipe = {
          ...response.data,
          isOffline: false,
          lastModified: Date.now(),
          syncStatus: "synced",
        };

        // Update cache
        const recipeIndex = state.recipes.findIndex(r => r.id === id);
        if (recipeIndex >= 0) {
          state.recipes[recipeIndex] = serverRecipe;
        } else {
          state.recipes.push(serverRecipe);
        }
        await this.saveOfflineState(state);

        return serverRecipe;
      } catch (error) {
        console.warn(`Failed to fetch recipe ${id} from server:`, error);
      }
    }

    return offlineRecipe || null;
  }

  /**
   * Create new recipe (works offline)
   */
  static async create(recipeData: CreateRecipeRequest): Promise<OfflineRecipe> {
    const isOnline = await this.isOnline();

    if (isOnline) {
      try {
        // Try online creation first
        const response = await ApiService.recipes.create(recipeData);
        const newRecipe: OfflineRecipe = {
          ...response.data,
          isOffline: false,
          lastModified: Date.now(),
          syncStatus: "synced",
        };

        // Add to offline cache
        const state = await this.loadOfflineState();
        state.recipes.push(newRecipe);
        await this.saveOfflineState(state);

        return newRecipe;
      } catch (error) {
        console.warn("Online recipe creation failed, creating offline:", error);
      }
    }

    // Create offline recipe
    const tempId = this.generateTempId();
    const userId = await this.getCurrentUserId();

    if (!userId) {
      throw new Error("Cannot create offline recipe: user not authenticated");
    }

    const offlineRecipe: OfflineRecipe = {
      id: tempId,
      tempId,
      ...recipeData,
      isOffline: true,
      lastModified: Date.now(),
      syncStatus: "pending",
      // Add required Recipe fields with defaults
      user_id: userId,
      is_public: false,
      is_owner: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    };

    // Save to offline storage
    const state = await this.loadOfflineState();
    state.recipes.push(offlineRecipe);
    await this.saveOfflineState(state);

    // Add pending operation for later sync
    await this.addPendingOperation({
      type: "create",
      recipeId: tempId,
      data: recipeData,
      timestamp: Date.now(),
      retryCount: 0,
    });

    return offlineRecipe;
  }

  /**
   * Update existing recipe (works offline)
   */
  static async update(
    id: string,
    recipeData: UpdateRecipeRequest
  ): Promise<OfflineRecipe> {
    const state = await this.loadOfflineState();
    const existingRecipeIndex = state.recipes.findIndex(
      r => r.id === id || r.tempId === id
    );

    if (existingRecipeIndex === -1) {
      throw new Error(`Recipe with id ${id} not found`);
    }

    const existingRecipe = state.recipes[existingRecipeIndex];
    const isOnline = await this.isOnline();

    if (isOnline && !existingRecipe.tempId) {
      try {
        // Try online update first (if recipe has real ID)
        const response = await ApiService.recipes.update(id, recipeData);
        const updatedRecipe: OfflineRecipe = {
          ...response.data,
          isOffline: false,
          lastModified: Date.now(),
          syncStatus: "synced",
        };

        // Update in cache
        state.recipes[existingRecipeIndex] = updatedRecipe;
        await this.saveOfflineState(state);

        return updatedRecipe;
      } catch (error) {
        console.warn("Online recipe update failed, updating offline:", error);
      }
    }

    // Update offline
    const updatedRecipe: OfflineRecipe = {
      ...existingRecipe,
      ...recipeData,
      lastModified: Date.now(),
      syncStatus: "pending",
      updated_at: new Date().toISOString(),
    };

    // Save to offline storage
    state.recipes[existingRecipeIndex] = updatedRecipe;
    await this.saveOfflineState(state);

    // Add pending operation for later sync
    await this.addPendingOperation({
      type: "update",
      recipeId: existingRecipe.tempId || id,
      data: recipeData,
      timestamp: Date.now(),
      retryCount: 0,
    });

    return updatedRecipe;
  }

  /**
   * Delete recipe (works offline)
   */
  static async delete(id: string): Promise<void> {
    const state = await this.loadOfflineState();
    const recipeIndex = state.recipes.findIndex(
      r => r.id === id || r.tempId === id
    );

    if (recipeIndex === -1) {
      throw new Error(`Recipe with id ${id} not found`);
    }

    const recipe = state.recipes[recipeIndex];
    const isOnline = await this.isOnline();

    if (isOnline && !recipe.tempId) {
      try {
        // Try online deletion first (if recipe has real ID)
        await ApiService.recipes.delete(id);

        // Remove from cache
        state.recipes.splice(recipeIndex, 1);
        await this.saveOfflineState(state);

        return;
      } catch (error) {
        console.warn(
          "Online recipe deletion failed, marking for offline deletion:",
          error
        );
      }
    }

    // Handle offline deletion
    if (recipe.tempId) {
      // If it's a purely offline recipe, just remove it
      state.recipes.splice(recipeIndex, 1);
      // Also remove any pending operations for this recipe
      state.pendingOperations = state.pendingOperations.filter(
        op => op.recipeId !== recipe.tempId && op.recipeId !== recipe.id
      );
    } else {
      // Mark for deletion on server
      recipe.syncStatus = "pending";
      await this.addPendingOperation({
        type: "delete",
        recipeId: id,
        timestamp: Date.now(),
        retryCount: 0,
      });

      // Remove from local cache
      state.recipes.splice(recipeIndex, 1);
    }

    await this.saveOfflineState(state);
  }

  /**
   * Merge server recipes with offline recipes, handling conflicts
   */
  private static mergeRecipes(
    serverRecipes: OfflineRecipe[],
    offlineRecipes: OfflineRecipe[]
  ): OfflineRecipe[] {
    const merged = new Map<string, OfflineRecipe>();
    const conflicts: {
      serverId: string;
      serverVersion: OfflineRecipe;
      offlineVersion: OfflineRecipe;
    }[] = [];
    // Add server recipes first
    serverRecipes.forEach(recipe => {
      merged.set(recipe.id, recipe);
    });

    // Add offline recipes, preferring newer versions
    offlineRecipes.forEach(offlineRecipe => {
      const serverId = offlineRecipe.id;
      const serverRecipe = merged.get(serverId);

      if (
        !serverRecipe ||
        offlineRecipe.lastModified > (serverRecipe.lastModified || 0)
      ) {
        // Offline version is newer or doesn't exist on server
        merged.set(serverId, offlineRecipe);
      } else if (offlineRecipe.lastModified < serverRecipe.lastModified) {
        // Detected conflict - store both versions
        if (offlineRecipe.syncStatus === "pending") {
          conflicts.push({
            serverId,
            serverVersion: serverRecipe,
            offlineVersion: offlineRecipe,
          });
          merged.set(serverId, {
            ...serverRecipe,
            syncStatus: "conflict",
            originalData: offlineRecipe,
          });
        } else {
          merged.set(serverId, serverRecipe);
        }
      }
    });

    return Array.from(merged.values()).sort(
      (a, b) => (b.lastModified || 0) - (a.lastModified || 0)
    );
  }

  /**
   * Sync pending operations when online
   */
  static async syncPendingChanges(): Promise<{
    success: number;
    failed: number;
  }> {
    if (!(await this.isOnline())) {
      return { success: 0, failed: 0 };
    }

    const state = await this.loadOfflineState();
    let successCount = 0;
    let failedCount = 0;

    const remainingOperations: OfflinePendingOperation[] = [];

    for (const operation of state.pendingOperations) {
      try {
        await this.syncOperation(operation, state);
        successCount++;
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);

        // Retry logic
        operation.retryCount++;
        if (operation.retryCount < 3) {
          remainingOperations.push(operation);
        } else {
          failedCount++;
          // Store failed operations separately for manual retry or user notification
          const failedOpsKey = `${this.PENDING_OPERATIONS_KEY}_failed`;
          const existingFailed = await AsyncStorage.getItem(failedOpsKey);
          const failedOps = existingFailed ? JSON.parse(existingFailed) : [];
          failedOps.push({
            ...operation,
            failedAt: Date.now(),
            error: (error as any).message || "Unknown error",
          });
          await AsyncStorage.setItem(failedOpsKey, JSON.stringify(failedOps));

          // Mark recipe as failed sync
          const recipe = state.recipes.find(
            r => r.id === operation.recipeId || r.tempId === operation.recipeId
          );
          if (recipe) {
            recipe.syncStatus = "failed";
          }
        }
      }
    }

    // Update pending operations
    state.pendingOperations = remainingOperations;
    state.lastSync = Date.now();
    await this.saveOfflineState(state);

    return { success: successCount, failed: failedCount };
  }

  /**
   * Sync individual operation
   */
  private static async syncOperation(
    operation: OfflinePendingOperation,
    state: OfflineRecipeState
  ): Promise<void> {
    switch (operation.type) {
      case "create":
        if (operation.data) {
          const response = await ApiService.recipes.create(
            operation.data as CreateRecipeRequest
          );

          // Update the offline recipe with real ID
          const recipeIndex = state.recipes.findIndex(
            r => r.tempId === operation.recipeId
          );
          if (recipeIndex >= 0) {
            state.recipes[recipeIndex] = {
              ...response.data,
              isOffline: false,
              lastModified: Date.now(),
              syncStatus: "synced",
            };
          } else {
            // Recipe was deleted locally but created on server - add it back
            state.recipes.push({
              ...response.data,
              isOffline: false,
              lastModified: Date.now(),
              syncStatus: "synced",
            });
          }
        }
        break;

      case "update":
        if (operation.data) {
          const response = await ApiService.recipes.update(
            operation.recipeId,
            operation.data as UpdateRecipeRequest
          );

          // Update the offline recipe
          const recipeIndex = state.recipes.findIndex(
            r => r.id === operation.recipeId
          );
          if (recipeIndex >= 0) {
            state.recipes[recipeIndex] = {
              ...response.data,
              isOffline: false,
              lastModified: Date.now(),
              syncStatus: "synced",
            };
          } else {
            // Recipe was deleted locally but updated on server - log warning
            console.warn(
              `Recipe ${operation.recipeId} was updated on server but not found locally`
            );
          }
        }
        break;

      case "delete":
        try {
          await ApiService.recipes.delete(operation.recipeId);
        } catch (error) {
          // If recipe is already deleted on server (404), consider it success
          if ((error as any).response?.status !== 404) {
            throw error;
          }
        }

        // Remove from offline cache if still there
        const recipeIndex = state.recipes.findIndex(
          r => r.id === operation.recipeId
        );
        if (recipeIndex >= 0) {
          state.recipes.splice(recipeIndex, 1);
        }
        break;
    }
  }

  /**
   * Get sync status statistics
   */
  static async getSyncStatus(): Promise<{
    totalRecipes: number;
    pendingSync: number;
    conflicts: number;
    failedSync: number;
    lastSync: number;
  }> {
    const state = await this.loadOfflineState();

    const pendingSync = state.recipes.filter(
      r => r.syncStatus === "pending"
    ).length;
    const conflicts = state.recipes.filter(
      r => r.syncStatus === "conflict"
    ).length;
    const failedSync = state.recipes.filter(
      r => r.syncStatus === "failed"
    ).length;

    return {
      totalRecipes: state.recipes.length,
      pendingSync,
      conflicts,
      failedSync,
      lastSync: state.lastSync,
    };
  }

  /**
   * Clear all offline data (use with caution)
   */
  static async clearOfflineData(): Promise<void> {
    await AsyncStorage.multiRemove([
      this.STORAGE_KEY,
      this.PENDING_OPERATIONS_KEY,
    ]);
  }
}

export default OfflineRecipeService;

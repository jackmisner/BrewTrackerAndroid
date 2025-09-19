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
import NetInfo from "@react-native-community/netinfo";
import * as Device from "expo-device";
import ApiService from "@services/api/apiService";
import { STORAGE_KEYS } from "@services/config";
import { extractUserIdFromJWT } from "@utils/jwtUtils";
import { generateUniqueId } from "@utils/keyUtils";
import { Recipe, CreateRecipeRequest, UpdateRecipeRequest } from "@src/types";
import {
  OfflineRecipe,
  OfflinePendingOperation,
  OfflineRecipeState,
} from "@src/types/offline";
import OfflineMetricsCalculator from "./OfflineMetricsCalculator";

// Re-export types from @types/offline for backward compatibility
export type {
  OfflineRecipe,
  OfflinePendingOperation,
  OfflineRecipeState,
} from "@src/types/offline";

/**
 * Offline-first Recipe Service
 */
export class OfflineRecipeService {
  /**
   * Get current user ID from JWT token
   * Returns null if no token or extraction fails
   */
  private static async getCurrentUserId(): Promise<string | null> {
    try {
      const token = await ApiService.token.getToken();
      if (!token) {
        return null;
      }

      const userId = extractUserIdFromJWT(token);
      if (!userId && __DEV__) {
        console.warn("Failed to extract user ID from JWT token");
      }

      return userId;
    } catch (error) {
      if (__DEV__) {
        console.warn("Error extracting user ID from token:", error);
      }
      return null;
    }
  }

  /**
   * Generate user-scoped storage keys and metadata key
   */
  private static async getUserScopedKeys() {
    const userId = await this.getCurrentUserId();
    const baseKey = userId
      ? `${STORAGE_KEYS.OFFLINE_RECIPES}_${userId}`
      : `${STORAGE_KEYS.OFFLINE_RECIPES}_anonymous_${await this.getDeviceId()}`;
    return {
      STORAGE_KEY: baseKey,
      PENDING_OPERATIONS_KEY: `${baseKey}_pending`,
      METADATA_KEY: `${baseKey}_meta`,
    };
  }

  /**
   * Returns a unique device identifier for anonymous offline storage.
   * Falls back to a random string if device info is unavailable.
   */
  private static async getDeviceId(): Promise<string> {
    const prefix = "anonymous";
    // Use a global counter to reduce collision risk in fallback IDs
    let globalCounter = 0;
    const fallbackIdGeneration = () => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      const id = `${timestamp}_${globalCounter}_${random}`;
      globalCounter++;
      return id;
    };
    try {
      // Use Expo Device API if available
      if (Device.osInternalBuildId) {
        return Device.osInternalBuildId;
      }
      if (Device.deviceName) {
        return `${Device.deviceName}`;
      }
      // Use crypto.randomUUID() when available (most secure and unique)
      if (
        typeof globalThis !== "undefined" &&
        globalThis.crypto &&
        typeof globalThis.crypto.randomUUID === "function"
      ) {
        const uuid = globalThis.crypto.randomUUID();
        return prefix ? `${prefix}_${uuid}` : uuid;
      } else {
        const id = fallbackIdGeneration();
        return `${prefix}_${id}`;
      }
    } catch {
      const id = fallbackIdGeneration();
      return `${prefix}_${id}`;
    }
  }

  /**
   * Generate temporary ID for offline-created recipes
   */
  private static generateTempId(): string {
    // Use crypto.randomUUID() when available; safe for RN/TS
    const g: any = globalThis as any;
    const uuid =
      g?.crypto && typeof g.crypto.randomUUID === "function"
        ? g.crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${Math.random().toString(36).substring(2, 9)}`;
    return `offline_${uuid}`;
  }

  /**
   * Normalizes server timestamp to number (ms since epoch), falling back to Date.now()
   */
  private static normalizeServerTimestamp(responseData: any): number {
    if (!responseData) {
      return Date.now();
    }

    // Try to extract timestamp from common server fields
    const serverTimestamp =
      responseData.lastModified ||
      responseData.updatedAt ||
      responseData.updated_at ||
      responseData.createdAt ||
      responseData.created_at;

    if (!serverTimestamp) {
      return Date.now();
    }

    // Parse the timestamp
    const parsed =
      typeof serverTimestamp === "number"
        ? serverTimestamp < 1e12
          ? serverTimestamp * 1000
          : serverTimestamp
        : Date.parse(serverTimestamp);

    // Return parsed timestamp if valid, otherwise fallback to current time
    return parsed && !isNaN(parsed) ? parsed : Date.now();
  }

  /**
   * Load offline recipe state from storage
   */
  private static async loadOfflineState(
    _user_id?: string
  ): Promise<OfflineRecipeState> {
    try {
      const { STORAGE_KEY, PENDING_OPERATIONS_KEY, METADATA_KEY } =
        await this.getUserScopedKeys();
      const [recipesData, operationsData, metadataData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(PENDING_OPERATIONS_KEY),
        AsyncStorage.getItem(METADATA_KEY),
      ]);

      const recipes: OfflineRecipe[] = recipesData
        ? JSON.parse(recipesData)
        : [];
      const pendingOperations: OfflinePendingOperation[] = operationsData
        ? JSON.parse(operationsData)
        : [];

      // Load metadata if exists, otherwise use defaults
      const metadata = metadataData
        ? JSON.parse(metadataData)
        : { lastSync: 0, version: 1 };

      return {
        recipes,
        pendingOperations,
        lastSync: metadata.lastSync || 0,
        version: metadata.version || 1,
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
    state: OfflineRecipeState,
    _userId?: string
  ): Promise<void> {
    try {
      const { STORAGE_KEY, PENDING_OPERATIONS_KEY, METADATA_KEY } =
        await this.getUserScopedKeys();

      // Prepare metadata for storage
      const metadata = {
        lastSync: state.lastSync,
        version: state.version,
      };

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.recipes)),
        AsyncStorage.setItem(
          PENDING_OPERATIONS_KEY,
          JSON.stringify(state.pendingOperations)
        ),
        AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata)),
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
    // Queue operations and keep the chain alive on failures
    this.operationQueue = this.operationQueue
      .catch(() => void 0)
      .then(async () => {
        try {
          const state = await this.loadOfflineState();
          const newOperation: OfflinePendingOperation = {
            ...operation,
            id: this.generateTempId(),
          };
          state.pendingOperations.push(newOperation);
          await this.saveOfflineState(state);
        } catch (err) {
          console.error("addPendingOperation failed:", err);
        }
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
      // Also check API availability, but catch simulated offline errors
      try {
        return await ApiService.checkConnection();
      } catch (error) {
        // Don't treat simulated offline mode as a real error
        if (
          error instanceof Error &&
          error.message?.includes("Simulated offline")
        ) {
          return false;
        }
        throw error;
      }
    } catch {
      return false;
    }
  }

  /**
   * Clean up stale or invalid recipe data from cache
   * Removes recipes with invalid IDs, corrupted data, etc.
   */
  static async cleanupStaleData(): Promise<{
    removed: number;
    cleaned: string[];
  }> {
    try {
      const state = await this.loadOfflineState();
      const initialCount = state.recipes.length;

      // Use utility to clean up stale recipes
      const cleanupResult = this.cleanupStaleRecipes(state.recipes);
      state.recipes = cleanupResult.cleanedRecipes;

      // Clean up pending operations for recipes that were removed
      const currentRecipeIds = new Set(state.recipes.map(r => r.id));
      const currentTempIds = new Set(
        state.recipes
          .map(r => r.tempId)
          .filter((id): id is string => Boolean(id))
      );

      state.pendingOperations = this.cleanupPendingOperations(
        state.pendingOperations,
        currentRecipeIds,
        currentTempIds
      );

      // Save cleaned state
      await this.saveOfflineState(state);

      const removedCount = initialCount - state.recipes.length;

      return {
        removed: removedCount,
        cleaned: cleanupResult.cleanedNames,
      };
    } catch (error) {
      console.error("Failed to cleanup stale recipe data:", error);
      return { removed: 0, cleaned: [] };
    }
  }

  /**
   * Clean up stale or invalid recipe data from cache
   * Removes recipes with invalid IDs, corrupted data, etc.
   */
  private static cleanupStaleRecipes(recipes: OfflineRecipe[]): {
    cleanedRecipes: OfflineRecipe[];
    removedCount: number;
    cleanedNames: string[];
  } {
    const initialCount = recipes.length;
    const removedRecipes: string[] = [];

    // Filter out recipes with invalid data
    const cleanedRecipes = recipes.filter(recipe => {
      // CRITICAL: Never remove recipes that need syncing, regardless of data issues
      if (recipe.needsSync) {
        if (__DEV__) {
          console.log(
            `🔒 Preserving recipe that needs sync: ${recipe.name} (${recipe.id})`
          );
        }
        return true;
      }

      // Check for basic required fields
      if (!recipe.id || !recipe.name) {
        const missingFields = [];
        if (!recipe.id) {
          missingFields.push("id");
        }
        if (!recipe.name) {
          missingFields.push("name");
        }

        removedRecipes.push(
          `${recipe.name || recipe.id || "Unknown"} (missing required fields: ${missingFields.join(", ")})`
        );
        console.warn(`🧹 CLEANUP: Recipe missing fields:`, {
          recipeName: recipe.name,
          recipeId: recipe.id,
          missingFields,
          recipeKeys: Object.keys(recipe),
        });
        return false;
      }

      // Accept any non-empty string ID (allow UUIDs, numerics, etc.). We already filtered missing IDs above.
      // Keep recipe to avoid accidental data loss.
      if (
        __DEV__ &&
        !this.isValidObjectId(recipe.id) &&
        !recipe.id.startsWith("offline_") &&
        !recipe.id.startsWith("temp")
      ) {
        console.warn(
          `🔍 Non-standard recipe ID format detected: "${recipe.id}" for recipe "${recipe.name}"`
        );
      }

      // Check for corrupted ingredients data
      if (!Array.isArray(recipe.ingredients)) {
        removedRecipes.push(`${recipe.name} (corrupted ingredients data)`);
        return false;
      }

      return true;
    });

    const removedCount = initialCount - cleanedRecipes.length;

    if (removedCount > 0 && __DEV__) {
      console.log(`Cleaned up ${removedCount} stale recipes:`, removedRecipes);
    }

    return {
      cleanedRecipes,
      removedCount,
      cleanedNames: removedRecipes,
    };
  }

  /**
   * Clean up pending operations for recipes that were removed
   */
  private static cleanupPendingOperations(
    operations: OfflinePendingOperation[],
    existingRecipeIds: Set<string>,
    existingTempIds: Set<string>
  ): OfflinePendingOperation[] {
    return operations.filter(op => {
      // Keep operations for recipes that still exist (by ID or tempId)
      return (
        existingRecipeIds.has(op.recipeId) || existingTempIds.has(op.recipeId)
      );
    });
  }

  /**
   * DEV ONLY: Force cleanup all tombstones to get app back to clean state
   * Use this during development when you've manually cleaned the database
   */
  static devCleanupAllTombstones(recipes: OfflineRecipe[]): {
    cleanedRecipes: OfflineRecipe[];
    removedTombstones: number;
    tombstoneNames: string[];
  } {
    if (!__DEV__) {
      throw new Error(
        "devCleanupAllTombstones is only available in development mode"
      );
    }

    // Count and log tombstones before cleanup
    const tombstones = recipes.filter(r => r.isDeleted);
    const tombstoneNames = tombstones.map(t => t.name);
    const tombstoneCount = tombstones.length;

    if (tombstoneCount > 0) {
      console.log(`🧹 DEV: Force removing ${tombstoneCount} tombstones:`);
      tombstoneNames.forEach(name => console.log(`   - ${name}`));
    } else {
      console.log(`🧹 DEV: No tombstones found to clean up`);
    }

    // Remove ALL tombstones regardless of sync status
    const cleanedRecipes = recipes.filter(r => !r.isDeleted);

    const result = {
      cleanedRecipes,
      removedTombstones: tombstoneCount,
      tombstoneNames,
    };

    console.log(`🧹 DEV: Tombstone cleanup complete:`, result);
    return result;
  }

  /**
   * Clear all offline data for the current user
   * Used during logout to prevent data leakage between users
   */
  static async clearUserData(userId?: string): Promise<void> {
    try {
      let keysToRemove: string[];

      if (userId) {
        // Clear specific user's data including metadata and failed operations
        const baseKey = `${STORAGE_KEYS.OFFLINE_RECIPES}_${userId}`;
        keysToRemove = [
          baseKey,
          `${baseKey}_pending`,
          `${baseKey}_meta`,
          `${baseKey}_pending_failed`, // Failed operations key
        ];
      } else {
        // Clear all offline recipe keys (including metadata and failed operation keys)
        const allKeys = await AsyncStorage.getAllKeys();
        keysToRemove = allKeys.filter(key =>
          key.startsWith(STORAGE_KEYS.OFFLINE_RECIPES)
        );
      }

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (error) {
      console.error("Failed to clear offline recipe data:", error);
      throw error;
    }
  }

  /**
   * Get all recipes (combines online and offline)
   */
  static async getAll(): Promise<OfflineRecipe[]> {
    const online = await this.isOnline();
    // Only clean up stale data when online to avoid removing offline-created recipes
    if (online) {
      await this.cleanupStaleData();
    }

    const state = await this.loadOfflineState();

    // Check if user is authenticated before making API calls
    const userId = await this.getCurrentUserId();
    const isAuthenticated = !!userId;

    // If online and authenticated, try to fetch latest from server and merge with offline
    if (online && isAuthenticated) {
      try {
        // Fetch all recipes with pagination
        let allServerRecipes: Recipe[] = [];
        let page = 1;
        let hasMore = true;
        const pageSize = 100;

        while (hasMore) {
          const response = await ApiService.recipes.getAll(page, pageSize);
          allServerRecipes = [...allServerRecipes, ...response.data.recipes];
          hasMore =
            response.data.recipes.length > 0 &&
            response.data.recipes.length === pageSize;
          page++;
        }
        const serverRecipes: OfflineRecipe[] = allServerRecipes.map(recipe => {
          const lastModified = this.normalizeServerTimestamp(recipe);
          return {
            ...recipe,
            isOffline: false,
            lastModified: lastModified,
            syncStatus: "synced" as const,
            needsSync: false, // Server recipes don't need sync
          };
        });

        // Merge with offline recipes (offline takes precedence for conflicts)
        const mergedRecipes = this.mergeRecipes(serverRecipes, state.recipes);

        // Clean up defensive tombstones for recipes that are confirmed deleted on server
        const serverRecipeIds = new Set(serverRecipes.map(r => r.id));
        const cleanedRecipes = mergedRecipes.filter(recipe => {
          // Remove defensive tombstones for recipes that are confirmed deleted on server
          if (
            recipe.isDeleted &&
            recipe.syncStatus === "synced" &&
            !recipe.needsSync &&
            !serverRecipeIds.has(recipe.id)
          ) {
            console.log(
              `🧹 DELETE: Cleaning up defensive tombstone for confirmed deleted recipe: ${recipe.name}`
            );
            return false; // Remove the tombstone
          }
          return true; // Keep the recipe
        });

        // Update cached recipes with stable instance_ids
        const persisted = cleanedRecipes.map(
          r => this.ensureIngredientsHaveInstanceId(r) as OfflineRecipe
        );
        state.recipes = persisted;
        await this.saveOfflineState(state);

        // Run background metrics calculation for recipes missing metrics
        this.calculateMissingMetrics().catch(error => {
          console.warn("Background metrics calculation failed:", error);
        });

        // Filter out deleted recipes before returning to UI (same as offline path)
        const activeRecipes = persisted.filter(recipe => !recipe.isDeleted);

        const recipesWithInstanceIds = activeRecipes; // already ensured

        if (__DEV__) {
          console.log(
            `🔍 Online recipes filtered: ${recipesWithInstanceIds.length} active (${cleanedRecipes.length} total including ${cleanedRecipes.length - recipesWithInstanceIds.length} tombstones)`
          );
        }

        return recipesWithInstanceIds;
      } catch (error) {
        console.warn(
          "Failed to fetch online recipes, using offline cache:",
          error
        );
      }
    } else if (online && !isAuthenticated) {
      console.log(
        "User not authenticated, skipping online recipe fetch and using offline cache only"
      );
    }

    // Filter out deleted recipes before returning to UI
    const activeRecipes = state.recipes.filter(recipe => !recipe.isDeleted);

    // Ensure all ingredients have instance_id for stable React keys
    const recipesWithInstanceIds = activeRecipes.map(
      recipe => this.ensureIngredientsHaveInstanceId(recipe) as OfflineRecipe
    );

    if (__DEV__) {
      console.log(
        `🔍 Returning offline recipes: ${recipesWithInstanceIds.length} active (${state.recipes.length} total including ${state.recipes.length - recipesWithInstanceIds.length} tombstones)`
      );
      console.log(
        `📋 Active recipe IDs: ${recipesWithInstanceIds.map(r => `${r.name} (${r.id})`).join(", ")}`
      );
    }
    return recipesWithInstanceIds;
  }

  /**
   * Get recipe by ID
   */
  static async getById(id: string): Promise<OfflineRecipe | null> {
    const state = await this.loadOfflineState();
    const online = await this.isOnline();

    // Check offline cache first
    const offlineRecipe = state.recipes.find(
      r => r.id === id || r.tempId === id
    );

    // If found offline but it's deleted, return null (recipe no longer exists)
    if (offlineRecipe && offlineRecipe.isDeleted) {
      return null;
    }

    // If found offline and it's newer or we're offline, return it
    if (offlineRecipe && (!online || offlineRecipe.isOffline)) {
      return this.ensureIngredientsHaveInstanceId(
        offlineRecipe
      ) as OfflineRecipe;
    }

    // Try to fetch from server if online
    if (online) {
      try {
        const response = await ApiService.recipes.getById(id);
        const serverTimestamp = this.normalizeServerTimestamp(response.data);
        const serverRecipe: OfflineRecipe = {
          ...response.data,
          isOffline: false,
          lastModified: serverTimestamp,
          syncStatus: "synced",
          needsSync: false, // Fresh from server
        };

        // Update cache with ensured instance_ids
        const toPersist = this.ensureIngredientsHaveInstanceId(
          serverRecipe
        ) as OfflineRecipe;
        const recipeIndex = state.recipes.findIndex(r => r.id === id);
        if (recipeIndex >= 0) {
          state.recipes[recipeIndex] = toPersist;
        } else {
          state.recipes.push(toPersist);
        }
        await this.saveOfflineState(state);
        return toPersist;
      } catch (error) {
        console.warn(`Failed to fetch recipe ${id} from server:`, error);
      }
    }

    return offlineRecipe
      ? (this.ensureIngredientsHaveInstanceId(offlineRecipe) as OfflineRecipe)
      : null;
  }

  /**
   * Ensures all ingredients in a recipe have instance_id for stable React keys
   */
  private static ensureIngredientsHaveInstanceId(
    recipe: Recipe | OfflineRecipe
  ): Recipe | OfflineRecipe {
    if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
      return recipe;
    }

    const ingredientsWithInstanceId = recipe.ingredients.map(ingredient => {
      if (ingredient.instance_id) {
        return ingredient; // Already has instance_id
      }

      // Generate stable instance_id for server-sourced ingredients
      return {
        ...ingredient,
        instance_id: generateUniqueId("ing"),
      };
    });

    return {
      ...recipe,
      ingredients: ingredientsWithInstanceId,
    };
  }

  /**
   * Calculate metrics for a recipe using offline calculator
   */
  private static calculateRecipeMetrics(recipe: Partial<Recipe>): {
    estimated_og?: number;
    estimated_fg?: number;
    estimated_abv?: number;
    estimated_ibu?: number;
    estimated_srm?: number;
  } {
    if (!recipe.batch_size || !recipe.efficiency || !recipe.ingredients) {
      return {};
    }

    try {
      // Normalize batch size unit before passing to calculator
      const normalizedBatchSizeUnit = this.normalizeBatchSizeUnit(
        recipe.batch_size_unit || "gallon"
      );

      const metrics = OfflineMetricsCalculator.calculateMetrics({
        batch_size: recipe.batch_size,
        batch_size_unit: normalizedBatchSizeUnit,
        efficiency: recipe.efficiency,
        boil_time: recipe.boil_time || 60,
        ingredients: recipe.ingredients,
        mash_temperature: recipe.mash_temperature,
        mash_temp_unit: recipe.mash_temp_unit,
      });

      return {
        estimated_og: metrics.og !== 1.0 ? metrics.og : undefined,
        estimated_fg: metrics.fg !== 1.0 ? metrics.fg : undefined,
        estimated_abv: metrics.abv !== 0.0 ? metrics.abv : undefined,
        estimated_ibu: metrics.ibu !== 0.0 ? metrics.ibu : undefined,
        estimated_srm: metrics.srm !== 0.0 ? metrics.srm : undefined,
      };
    } catch (error) {
      if (__DEV__) {
        console.warn("Failed to calculate offline metrics:", error);
      }
      return {};
    }
  }

  /**
   * Prepares ingredients for API sync by mapping ingredient IDs to ingredient_id field
   *
   * Preserves the original ingredient.id and maps it to ingredient_id for the API payload.
   * This maintains referential integrity without fabricating new ObjectIds.
   *
   * @throws Error if any ingredient is missing an ID
   */
  private static prepareIngredientsForSync(
    ingredients: any[],
    recipeContext?: { id?: string; name?: string }
  ): any[] {
    return ingredients.map((ingredient, index) => {
      // Check for null/undefined ingredient
      if (!ingredient) {
        const recipeInfo = recipeContext
          ? `recipe "${recipeContext.name || recipeContext.id || "unknown"}"`
          : "recipe";
        throw new Error(
          `Ingredient validation failed: ingredient at index ${index} in ${recipeInfo} is null or undefined.`
        );
      }
      // Validate that ingredient has an ID
      if (!ingredient.id || ingredient.id === undefined) {
        const recipeInfo = recipeContext
          ? `recipe "${recipeContext.name || recipeContext.id || "unknown"}"`
          : "recipe";
        const ingredientInfo =
          ingredient.name || `ingredient at index ${index}`;

        throw new Error(
          `Ingredient validation failed: ${ingredientInfo} in ${recipeInfo} is missing ID. ` +
            `Cannot sync ingredients without valid IDs.`
        );
      }

      // Create the payload object with ingredient_id set to the original id, and omit the id field
      const { id, ...ingredientWithoutId } = ingredient;

      return {
        ...ingredientWithoutId,
        ingredient_id: id,
      };
    });
  }

  /**
   * Create new recipe (works offline)
   */
  static async create(recipeData: CreateRecipeRequest): Promise<OfflineRecipe> {
    const isOnline = await this.isOnline();

    if (isOnline) {
      try {
        // Try online creation first - prepare payload with normalized ingredients
        const outboundPayload = {
          ...recipeData,
          ingredients: recipeData.ingredients
            ? this.prepareIngredientsForSync(recipeData.ingredients, {
                name: recipeData.name,
              })
            : [],
        };

        const response = await ApiService.recipes.create(outboundPayload);
        const serverTimestamp = this.normalizeServerTimestamp(response.data);
        const newRecipe: OfflineRecipe = {
          ...response.data,
          ...(typeof recipeData.is_public === "boolean"
            ? { is_public: recipeData.is_public }
            : {}),
          lastModified: serverTimestamp,
          syncStatus: "synced",
          needsSync: false, // Successfully created online
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

    // Calculate metrics for offline recipe
    const calculatedMetrics = this.calculateRecipeMetrics(recipeData);

    const offlineRecipe: OfflineRecipe = {
      id: tempId,
      tempId,
      ...recipeData,
      ...calculatedMetrics, // Include calculated metrics
      isOffline: true,
      lastModified: Date.now(),
      syncStatus: "pending",
      needsSync: true, // New recipe needs to be synced
      // Add required Recipe fields with defaults
      user_id: userId,
      is_public: recipeData.is_public ?? false,
      is_owner: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    };

    // Save to offline storage
    const state = await this.loadOfflineState();
    state.recipes.push(offlineRecipe);
    await this.saveOfflineState(state);

    if (__DEV__) {
      console.log(
        `✅ Offline recipe created and saved: ${offlineRecipe.name} (${offlineRecipe.id})`
      );
      console.log(`📊 Total offline recipes now: ${state.recipes.length}`);
      if (Object.keys(calculatedMetrics).length > 0) {
        console.log(`📊 Calculated metrics saved:`, calculatedMetrics);
      }
    }

    // Only add legacy pending operation if not using needsSync flow
    // When needsSync is true, recipe will be handled by syncModifiedRecipes
    if (!offlineRecipe.needsSync) {
      await this.addPendingOperation({
        type: "create",
        recipeId: tempId,
        data: recipeData,
        timestamp: Date.now(),
        retryCount: 0,
      });
    }

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
        // Try online update first (if recipe has real ID) - prepare payload with normalized ingredients
        const outboundPayload = {
          ...recipeData,
          ingredients: recipeData.ingredients
            ? this.prepareIngredientsForSync(recipeData.ingredients, {
                id,
                name: recipeData.name || existingRecipe.name,
              })
            : recipeData.ingredients, // Keep original if undefined/null
        };

        const response = await ApiService.recipes.update(id, outboundPayload);
        const serverTimestamp = this.normalizeServerTimestamp(response.data);
        const updatedRecipe: OfflineRecipe = {
          ...response.data,
          isOffline: false,
          lastModified: serverTimestamp,
          syncStatus: "synced",
          needsSync: false, // Successfully updated online
        };

        // Update in cache
        state.recipes[existingRecipeIndex] = updatedRecipe;
        await this.saveOfflineState(state);

        return updatedRecipe;
      } catch (error) {
        console.warn("Online recipe update failed, updating offline:", error);
      }
    }

    // Calculate updated metrics for offline recipe
    const updatedData = { ...existingRecipe, ...recipeData };
    const calculatedMetrics = this.calculateRecipeMetrics(updatedData);

    // Update offline
    const updatedRecipe: OfflineRecipe = {
      ...existingRecipe,
      ...recipeData,
      ...calculatedMetrics, // Include updated calculated metrics
      lastModified: Date.now(),
      syncStatus: "pending",
      needsSync: true, // Updated recipe needs to be synced
      updated_at: new Date().toISOString(),
    };

    // Save to offline storage
    state.recipes[existingRecipeIndex] = updatedRecipe;
    await this.saveOfflineState(state);

    // Only add legacy pending operation if not using needsSync flow
    // When needsSync is true, recipe will be handled by syncModifiedRecipes
    if (!updatedRecipe.needsSync) {
      await this.addPendingOperation({
        type: "update",
        recipeId: existingRecipe.tempId || id,
        data: recipeData,
        timestamp: Date.now(),
        retryCount: 0,
      });
    }

    return updatedRecipe;
  }

  /**
   * Validate if ID is a valid MongoDB ObjectId format
   */
  private static isValidObjectId(id: string): boolean {
    // MongoDB ObjectId: 24-character hexadecimal string
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  /**
   * Delete recipe (works offline) - uses tombstone pattern
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

    console.log(`🗑️ DELETE: Starting deletion of "${recipe.name}" (ID: ${id})`);
    console.log(
      `🗑️ DELETE: Recipe details - tempId: ${recipe.tempId}, isValidId: ${this.isValidObjectId(id)}, isOnline: ${isOnline}`
    );

    // Check if this is a server recipe that can be deleted online immediately
    if (isOnline && !recipe.tempId) {
      console.log(`🗑️ DELETE: Attempting immediate online deletion...`);
      try {
        // Try online deletion first (if recipe has valid ID)
        await ApiService.recipes.delete(id);
        console.log(`🗑️ DELETE: Online deletion API call succeeded`);

        // DEFENSIVE: Create a temporary tombstone even for "successful" deletions
        // This prevents race conditions where server hasn't processed deletion yet
        const defensiveTombstone: OfflineRecipe = {
          ...recipe,
          isDeleted: true,
          deletedAt: Date.now(),
          needsSync: false, // Already deleted on server
          syncStatus: "synced", // Server deletion succeeded
          lastModified: Date.now(),
        };

        state.recipes[recipeIndex] = defensiveTombstone;
        await this.saveOfflineState(state);
        console.log(
          `🗑️ DELETE: Created defensive tombstone to prevent race conditions`
        );

        console.log(
          `✅ Recipe deleted online with defensive tombstone: ${recipe.name}`
        );
        return;
      } catch (error) {
        console.warn(
          `🗑️ DELETE: Online deletion failed for "${recipe.name}":`,
          error
        );
        console.log(`🗑️ DELETE: Will fall back to sync tombstone creation`);
      }
    } else {
      console.log(
        `🗑️ DELETE: Skipping online deletion - offline: ${!isOnline}, tempId: ${!!recipe.tempId}, invalidId: ${!this.isValidObjectId(id)}`
      );
    }

    // Handle offline deletion or failed online deletion with tombstones
    if (recipe.tempId && recipe.id.startsWith("offline_")) {
      // If it's a purely offline recipe (never been synced), just remove it entirely
      console.log(`🗑️ DELETE: Removing offline-only recipe entirely`);
      state.recipes.splice(recipeIndex, 1);

      // Also remove any pending operations for this recipe
      state.pendingOperations = state.pendingOperations.filter(
        op => op.recipeId !== recipe.tempId && op.recipeId !== recipe.id
      );

      console.log(`🗑️ Offline-only recipe removed: ${recipe.name}`);
    } else {
      // Create tombstone for server recipe or offline recipe that needs server deletion
      console.log(`🗑️ DELETE: Creating tombstone for server recipe`);
      const tombstone: OfflineRecipe = {
        ...recipe,
        isDeleted: true,
        deletedAt: Date.now(),
        needsSync: true,
        syncStatus: "pending",
        lastModified: Date.now(),
      };

      state.recipes[recipeIndex] = tombstone;
      console.log(`🪦 Created deletion tombstone: ${recipe.name}`);
    }

    await this.saveOfflineState(state);
    console.log(`🗑️ DELETE: Final state saved, deletion process complete`);
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

      // Always preserve offline recipes with temp IDs (newly created offline recipes)
      if (offlineRecipe.tempId || serverId.startsWith("offline_")) {
        if (__DEV__) {
          console.log(
            `🔄 Preserving offline recipe with temp ID: ${offlineRecipe.name} (${serverId})`
          );
        }
        merged.set(serverId, offlineRecipe);
        return;
      }

      // CRITICAL: Tombstones (deleted recipes) always take precedence
      // This prevents deleted recipes from reappearing when server still has them
      if (offlineRecipe.isDeleted) {
        if (__DEV__) {
          console.log(
            `🪦 Preserving tombstone for deleted recipe: ${offlineRecipe.name} (${serverId})`
          );
        }
        merged.set(serverId, offlineRecipe);
        return;
      }

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
   * Sync recipes flagged as needing sync (new approach)
   */
  static async syncModifiedRecipes(): Promise<{
    success: number;
    failed: number;
    details: string[];
  }> {
    if (!(await this.isOnline())) {
      return { success: 0, failed: 0, details: ["Device is offline"] };
    }

    const state = await this.loadOfflineState();
    const recipesToSync = state.recipes.filter(recipe => recipe.needsSync);

    if (recipesToSync.length === 0) {
      return { success: 0, failed: 0, details: ["No recipes need syncing"] };
    }

    // Separate deleted recipes from regular recipes
    const recipesToDelete = recipesToSync.filter(recipe => recipe.isDeleted);
    const recipesToCreateOrUpdate = recipesToSync.filter(
      recipe => !recipe.isDeleted
    );

    let successCount = 0;
    let failedCount = 0;
    const details: string[] = [];

    // Handle deleted recipes first
    for (const recipe of recipesToDelete) {
      try {
        // Only try to delete on server if it has a real server ID
        if (!recipe.tempId) {
          await ApiService.recipes.delete(recipe.id);
          details.push(`Deleted from server: ${recipe.name}`);
        } else {
          details.push(`Removed offline-only recipe: ${recipe.name}`);
        }

        // Remove tombstone entirely from storage after successful sync
        const recipeIndex = state.recipes.findIndex(
          r => r.id === recipe.id || r.tempId === recipe.tempId
        );
        if (recipeIndex >= 0) {
          state.recipes.splice(recipeIndex, 1);
          // CRITICAL: Save state immediately so other operations see updated state
          await this.saveOfflineState(state);
          if (__DEV__) {
            console.log(
              `💾 Immediately saved state after removing tombstone: ${recipe.name}`
            );
          }
        }

        successCount++;
      } catch (error) {
        // If recipe is already deleted on server (404), treat as successful
        if ((error as any).response?.status === 404) {
          details.push(`Already deleted on server: ${recipe.name}`);

          // Remove tombstone entirely from storage since deletion succeeded
          const recipeIndex = state.recipes.findIndex(
            r => r.id === recipe.id || r.tempId === recipe.tempId
          );
          if (recipeIndex >= 0) {
            state.recipes.splice(recipeIndex, 1);
            // CRITICAL: Save state immediately so other operations see updated state
            await this.saveOfflineState(state);
            if (__DEV__) {
              console.log(
                `💾 Immediately saved state after removing tombstone: ${recipe.name}`
              );
            }
          }

          successCount++;
        } else {
          console.error(`Failed to delete recipe ${recipe.name}:`, error);

          // Mark tombstone as failed sync but keep it for retry
          const recipeIndex = state.recipes.findIndex(
            r => r.id === recipe.id || r.tempId === recipe.tempId
          );
          if (recipeIndex >= 0) {
            state.recipes[recipeIndex] = {
              ...recipe,
              syncStatus: "failed",
              // Keep needsSync: true so it can be retried
              // Keep isDeleted: true so it stays filtered from UI
            };
          }

          details.push(
            `Failed to delete: ${recipe.name} - ${error instanceof Error ? error.message : "Unknown error"}`
          );
          failedCount++;
        }
      }
    }

    // Handle regular recipe creation and updates
    for (const recipe of recipesToCreateOrUpdate) {
      try {
        if (recipe.tempId || recipe.id.startsWith("offline_")) {
          // This is a new offline recipe - create it on server
          // Include offline-calculated metrics in the request so they get saved to the database
          const createData: CreateRecipeRequest & {
            estimated_og?: number;
            estimated_fg?: number;
            estimated_abv?: number;
            estimated_ibu?: number;
            estimated_srm?: number;
          } = {
            name: recipe.name,
            style: recipe.style,
            description: recipe.description || "",
            batch_size: recipe.batch_size,
            batch_size_unit: recipe.batch_size_unit,
            unit_system: recipe.unit_system,
            boil_time: recipe.boil_time,
            efficiency: recipe.efficiency,
            mash_temperature: recipe.mash_temperature,
            mash_temp_unit: recipe.mash_temp_unit,
            mash_time: recipe.mash_time,
            is_public: recipe.is_public,
            notes: recipe.notes,
            ingredients: this.prepareIngredientsForSync(recipe.ingredients),
            // Include offline-calculated metrics so they're saved to database
            ...(recipe.estimated_og != null && {
              estimated_og: recipe.estimated_og,
            }),
            ...(recipe.estimated_fg != null && {
              estimated_fg: recipe.estimated_fg,
            }),
            ...(recipe.estimated_abv != null && {
              estimated_abv: recipe.estimated_abv,
            }),
            ...(recipe.estimated_ibu != null && {
              estimated_ibu: recipe.estimated_ibu,
            }),
            ...(recipe.estimated_srm != null && {
              estimated_srm: recipe.estimated_srm,
            }),
          };

          if (__DEV__) {
            const includeMetrics = {
              estimated_og: recipe.estimated_og,
              estimated_fg: recipe.estimated_fg,
              estimated_abv: recipe.estimated_abv,
              estimated_ibu: recipe.estimated_ibu,
              estimated_srm: recipe.estimated_srm,
            };
            console.log(
              `🔄 Syncing offline recipe "${recipe.name}" with calculated metrics:`,
              includeMetrics
            );
          }

          const response = await ApiService.recipes.create(createData);

          // Replace the offline recipe with the server version
          const recipeIndex = state.recipes.findIndex(
            r => r.id === recipe.id || r.tempId === recipe.tempId
          );
          if (recipeIndex >= 0) {
            // Extract recipe data and metrics from server response
            // Handle different response structures: direct recipe vs nested {recipe: ..., metrics: ...}
            const responseData = response.data as any; // Cast to any to handle nested response structure
            const serverRecipe = responseData.recipe || responseData;
            const serverMetrics = {
              estimated_og: responseData.estimated_og,
              estimated_fg: responseData.estimated_fg,
              estimated_abv: responseData.estimated_abv,
              estimated_ibu: responseData.estimated_ibu,
              estimated_srm: responseData.estimated_srm,
            };

            // Preserve client-calculated metrics if server doesn't provide them
            const offlineRecipe = state.recipes[recipeIndex];
            const preservedMetrics = {
              estimated_og:
                serverMetrics.estimated_og ?? offlineRecipe.estimated_og,
              estimated_fg:
                serverMetrics.estimated_fg ?? offlineRecipe.estimated_fg,
              estimated_abv:
                serverMetrics.estimated_abv ?? offlineRecipe.estimated_abv,
              estimated_ibu:
                serverMetrics.estimated_ibu ?? offlineRecipe.estimated_ibu,
              estimated_srm:
                serverMetrics.estimated_srm ?? offlineRecipe.estimated_srm,
            };

            const serverTimestamp = this.normalizeServerTimestamp(serverRecipe);
            state.recipes[recipeIndex] = {
              ...serverRecipe,
              ...preservedMetrics, // Preserve client-calculated metrics
              isOffline: false,
              lastModified: serverTimestamp,
              syncStatus: "synced",
              needsSync: false,
            };

            if (
              __DEV__ &&
              (preservedMetrics.estimated_og ||
                preservedMetrics.estimated_fg ||
                preservedMetrics.estimated_abv ||
                preservedMetrics.estimated_ibu ||
                preservedMetrics.estimated_srm)
            ) {
              console.log(
                `📊 Preserved client-calculated metrics for: ${recipe.name}`
              );
            }
          }

          details.push(`Created: ${recipe.name}`);
          successCount++;
        } else {
          // This is an existing recipe - update it on server
          // Include offline-calculated metrics in the request so they get saved to the database
          const updateData: UpdateRecipeRequest & {
            estimated_og?: number;
            estimated_fg?: number;
            estimated_abv?: number;
            estimated_ibu?: number;
            estimated_srm?: number;
          } = {
            name: recipe.name,
            style: recipe.style,
            description: recipe.description || "",
            batch_size: recipe.batch_size,
            batch_size_unit: recipe.batch_size_unit,
            unit_system: recipe.unit_system,
            boil_time: recipe.boil_time,
            efficiency: recipe.efficiency,
            mash_temperature: recipe.mash_temperature,
            mash_temp_unit: recipe.mash_temp_unit,
            mash_time: recipe.mash_time,
            is_public: recipe.is_public,
            notes: recipe.notes,
            ingredients: this.prepareIngredientsForSync(recipe.ingredients),
            // Include offline-calculated metrics so they're saved to database
            ...(recipe.estimated_og != null && {
              estimated_og: recipe.estimated_og,
            }),
            ...(recipe.estimated_fg != null && {
              estimated_fg: recipe.estimated_fg,
            }),
            ...(recipe.estimated_abv != null && {
              estimated_abv: recipe.estimated_abv,
            }),
            ...(recipe.estimated_ibu != null && {
              estimated_ibu: recipe.estimated_ibu,
            }),
            ...(recipe.estimated_srm != null && {
              estimated_srm: recipe.estimated_srm,
            }),
          };

          const response = await ApiService.recipes.update(
            recipe.id,
            updateData
          );

          // Update the recipe with server response
          const recipeIndex = state.recipes.findIndex(r => r.id === recipe.id);
          if (recipeIndex >= 0) {
            // Extract recipe data and metrics from server response
            // Handle different response structures: direct recipe vs nested {recipe: ..., metrics: ...}
            const responseData = response.data as any; // Cast to any to handle nested response structure
            const serverRecipe = responseData.recipe || responseData;
            const serverMetrics = {
              estimated_og: responseData.estimated_og,
              estimated_fg: responseData.estimated_fg,
              estimated_abv: responseData.estimated_abv,
              estimated_ibu: responseData.estimated_ibu,
              estimated_srm: responseData.estimated_srm,
            };

            // Preserve client-calculated metrics if server doesn't provide them
            const offlineRecipe = state.recipes[recipeIndex];
            const preservedMetrics = {
              estimated_og:
                serverMetrics.estimated_og ?? offlineRecipe.estimated_og,
              estimated_fg:
                serverMetrics.estimated_fg ?? offlineRecipe.estimated_fg,
              estimated_abv:
                serverMetrics.estimated_abv ?? offlineRecipe.estimated_abv,
              estimated_ibu:
                serverMetrics.estimated_ibu ?? offlineRecipe.estimated_ibu,
              estimated_srm:
                serverMetrics.estimated_srm ?? offlineRecipe.estimated_srm,
            };

            const serverTimestamp = this.normalizeServerTimestamp(serverRecipe);
            state.recipes[recipeIndex] = {
              ...serverRecipe,
              ...preservedMetrics, // Preserve client-calculated metrics
              isOffline: false,
              lastModified: serverTimestamp,
              syncStatus: "synced",
              needsSync: false,
            };

            if (
              __DEV__ &&
              (preservedMetrics.estimated_og ||
                preservedMetrics.estimated_fg ||
                preservedMetrics.estimated_abv ||
                preservedMetrics.estimated_ibu ||
                preservedMetrics.estimated_srm)
            ) {
              console.log(
                `📊 Preserved client-calculated metrics for updated: ${recipe.name}`
              );
            }
          }

          details.push(`Updated: ${recipe.name}`);
          successCount++;
        }
      } catch (error) {
        console.error(`Failed to sync recipe ${recipe.name}:`, error);

        // Mark as failed sync but keep needsSync true for retry
        const recipeIndex = state.recipes.findIndex(
          r => r.id === recipe.id || r.tempId === recipe.tempId
        );
        if (recipeIndex >= 0) {
          state.recipes[recipeIndex] = {
            ...recipe,
            syncStatus: "failed",
            // Keep needsSync: true so it can be retried
          };
        }

        details.push(
          `Failed: ${recipe.name} - ${error instanceof Error ? error.message : "Unknown error"}`
        );
        failedCount++;
      }
    }

    // Save updated state
    state.lastSync = Date.now();
    await this.saveOfflineState(state);

    // Calculate missing metrics for any recipes that need them
    try {
      const metricsResult = await this.calculateMissingMetrics();
      if (metricsResult.updated > 0) {
        details.push(
          `Calculated metrics for ${metricsResult.updated} recipes that were missing them`
        );
      }
    } catch (error) {
      console.warn("Failed to calculate missing metrics:", error);
    }

    // Clean up old tombstones after successful sync
    if (successCount > 0) {
      try {
        const cleanup = await this.cleanupTombstones();
        if (cleanup.cleaned > 0) {
          details.push(`Cleaned up ${cleanup.cleaned} old tombstones`);
        }
      } catch (error) {
        console.warn("Failed to cleanup tombstones:", error);
      }
    }

    if (__DEV__) {
      console.log(
        `🔄 Sync completed: ${successCount} successful, ${failedCount} failed`
      );
      details.forEach(detail => console.log(`  - ${detail}`));
    }

    return { success: successCount, failed: failedCount, details };
  }

  /**
   * Sync pending operations when online (legacy - kept for compatibility)
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
          await this.storeFailedOperation(operation, error);

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
      case "create": {
        if (operation.data) {
          const response = await ApiService.recipes.create(
            operation.data as CreateRecipeRequest
          );
          const newId = (response.data as any).id;
          const serverTimestamp = this.normalizeServerTimestamp(response.data);
          const idx = state.recipes.findIndex(
            r => r.tempId === operation.recipeId
          );
          if (idx >= 0) {
            state.recipes[idx] = {
              ...response.data,
              isOffline: false,
              lastModified: serverTimestamp,
              syncStatus: "synced",
            };
          } else {
            state.recipes.push({
              ...response.data,
              isOffline: false,
              lastModified: serverTimestamp,
              syncStatus: "synced",
            });
          }
          // Remap subsequent ops from tempId -> real id
          state.pendingOperations = state.pendingOperations.map(op =>
            op !== operation && op.recipeId === operation.recipeId
              ? { ...op, recipeId: newId }
              : op
          );
        }
        break;
      }

      case "update": {
        if (operation.data) {
          const response = await ApiService.recipes.update(
            operation.recipeId,
            operation.data as UpdateRecipeRequest
          );
          const serverTimestamp = this.normalizeServerTimestamp(response.data);
          const idx = state.recipes.findIndex(
            r => r.id === operation.recipeId || r.tempId === operation.recipeId
          );
          if (idx >= 0) {
            state.recipes[idx] = {
              ...response.data,
              isOffline: false,
              lastModified: serverTimestamp,
              syncStatus: "synced",
            };
          } else {
            console.warn(
              `Recipe ${operation.recipeId} was updated on server but not found locally`
            );
          }
        }
        break;
      }

      case "delete": {
        try {
          await ApiService.recipes.delete(operation.recipeId);
        } catch (error) {
          if ((error as any).response?.status !== 404) {
            throw error;
          }
        }
        const idx = state.recipes.findIndex(r => r.id === operation.recipeId);
        if (idx >= 0) {
          state.recipes.splice(idx, 1);
        }
        break;
      }
    }
  }

  /**
   * Get sync status statistics
   */
  static async getSyncStatus(): Promise<{
    totalRecipes: number;
    activeRecipes: number; // Visible recipes (excludes deleted)
    pendingSync: number;
    needsSync: number; // New field for recipes flagged for sync
    pendingDeletions: number; // Number of recipes marked for deletion
    conflicts: number;
    failedSync: number;
    lastSync: number;
  }> {
    const state = await this.loadOfflineState();

    const activeRecipes = state.recipes.filter(r => !r.isDeleted).length;
    const pendingSync = state.recipes.filter(
      r => r.syncStatus === "pending"
    ).length;
    const needsSync = state.recipes.filter(r => r.needsSync === true).length;
    const pendingDeletions = state.recipes.filter(
      r => r.isDeleted && r.needsSync
    ).length;
    const conflicts = state.recipes.filter(
      r => r.syncStatus === "conflict"
    ).length;
    const failedSync = state.recipes.filter(
      r => r.syncStatus === "failed"
    ).length;

    return {
      totalRecipes: state.recipes.length,
      activeRecipes, // Visible recipes count
      pendingSync,
      needsSync, // Number of recipes that need syncing (includes deletions)
      pendingDeletions, // Number of deletion tombstones pending sync
      conflicts,
      failedSync,
      lastSync: state.lastSync,
    };
  }
  // Configurable tombstone retention period (default: 30 days)
  private static readonly TOMBSTONE_RETENTION_DAYS = 30;
  /**
   * Clean up old tombstones that have been successfully synced or are very old
   */
  static async cleanupTombstones(): Promise<{
    cleaned: number;
    details: string[];
  }> {
    const state = await this.loadOfflineState();
    const initialCount = state.recipes.length;
    const cleanupDetails: string[] = [];

    // Remove tombstones older than 30 days or already synced
    const retentionPeriodMs =
      this.TOMBSTONE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - retentionPeriodMs;

    state.recipes = state.recipes.filter(recipe => {
      // Keep non-tombstones
      if (!recipe.isDeleted) {
        return true;
      }

      // Remove old tombstones (30+ days old)
      if (recipe.deletedAt && recipe.deletedAt < cutoffTime) {
        cleanupDetails.push(
          `Cleaned old tombstone: ${recipe.name} (deleted ${new Date(recipe.deletedAt).toLocaleDateString()})`
        );
        return false;
      }

      // Remove successfully synced tombstones
      if (recipe.syncStatus === "synced" && !recipe.needsSync) {
        cleanupDetails.push(`Cleaned synced tombstone: ${recipe.name}`);
        return false;
      }

      // Keep tombstones that still need sync or are recent
      return true;
    });

    const cleanedCount = initialCount - state.recipes.length;

    if (cleanedCount > 0) {
      await this.saveOfflineState(state);

      if (__DEV__) {
        console.log(`🧹 Cleaned up ${cleanedCount} tombstones`);
        cleanupDetails.forEach(detail => console.log(`  - ${detail}`));
      }
    }

    return {
      cleaned: cleanedCount,
      details: cleanupDetails,
    };
  }

  /**
   * Calculate and add missing metrics to recipes that don't have them
   * This is called as a background process during sync or app startup
   */
  static async calculateMissingMetrics(): Promise<{
    processed: number;
    updated: number;
    details: string[];
  }> {
    const state = await this.loadOfflineState();
    let processedCount = 0;
    let updatedCount = 0;
    const details: string[] = [];

    // Find recipes that lack metrics
    const recipesNeedingMetrics = state.recipes.filter(recipe => {
      // Skip deleted recipes
      if (recipe.isDeleted) {
        return false;
      }

      // Check if recipe has any calculated metrics
      const hasMetrics = !!(
        recipe.estimated_og ||
        recipe.estimated_fg ||
        recipe.estimated_abv ||
        recipe.estimated_ibu ||
        recipe.estimated_srm
      );

      // Only process recipes with valid data that lack metrics
      const hasValidData = !!(
        recipe.batch_size &&
        recipe.efficiency &&
        recipe.ingredients &&
        recipe.ingredients.length > 0
      );

      return hasValidData && !hasMetrics;
    });

    if (recipesNeedingMetrics.length === 0) {
      return {
        processed: 0,
        updated: 0,
        details: ["No recipes found that need metrics calculation"],
      };
    }

    if (__DEV__) {
      console.log(
        `📊 Found ${recipesNeedingMetrics.length} recipes needing metrics calculation`
      );
    }

    // Calculate metrics for each recipe
    for (const recipe of recipesNeedingMetrics) {
      processedCount++;
      try {
        const calculatedMetrics = this.calculateRecipeMetrics(recipe);

        if (Object.keys(calculatedMetrics).length > 0) {
          // Find recipe index and update it
          const recipeIndex = state.recipes.findIndex(
            r => r.id === recipe.id || r.tempId === recipe.tempId
          );

          if (recipeIndex >= 0) {
            state.recipes[recipeIndex] = {
              ...recipe,
              ...calculatedMetrics,
              lastModified: Date.now(),
              // Mark as needing sync if it's an offline recipe
              needsSync: recipe.isOffline || recipe.needsSync,
            };

            updatedCount++;
            details.push(
              `Added metrics to: ${recipe.name} (OG: ${calculatedMetrics.estimated_og?.toFixed(3) || "—"}, ABV: ${calculatedMetrics.estimated_abv?.toFixed(1) || "—"}%)`
            );

            if (__DEV__) {
              console.log(
                `📊 Added metrics to "${recipe.name}":`,
                calculatedMetrics
              );
            }
          }
        } else {
          details.push(
            `Skipped ${recipe.name}: insufficient data for calculation`
          );
        }
      } catch (error: any) {
        details.push(
          `Failed to calculate metrics for ${recipe.name}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        console.warn(`Failed to calculate metrics for ${recipe.name}:`, error);
      }
    }

    // Save updated state if any recipes were updated
    if (updatedCount > 0) {
      await this.saveOfflineState(state);

      if (__DEV__) {
        console.log(
          `📊 Background metrics calculation completed: ${updatedCount}/${processedCount} recipes updated`
        );
      }
    }

    return {
      processed: processedCount,
      updated: updatedCount,
      details,
    };
  }

  /**
   * Normalizes batch size unit from shorthand to full name for calculator compatibility
   */
  private static normalizeBatchSizeUnit(unit: string): string {
    const normalizedUnit = unit.toLowerCase().trim();

    switch (normalizedUnit) {
      case "gal":
      case "gallon":
      case "gallons":
        return "gallon";
      case "l":
      case "liter":
      case "liters":
      case "litre":
      case "litres":
        return "liter";
      default:
        // Default to "gallon" for any unrecognized or empty unit
        if (
          __DEV__ &&
          normalizedUnit &&
          normalizedUnit !== "gallon" &&
          normalizedUnit !== "liter"
        ) {
          console.warn(
            `Unknown batch size unit "${unit}" - defaulting to "gallon"`
          );
        }
        return "gallon";
    }
  }

  /**
   * DEV ONLY: Force cleanup all tombstones to get app back to clean state (async wrapper)
   * Use this during development when you've manually cleaned the database
   */
  static async devCleanupAllTombstonesAsync(): Promise<{
    removedTombstones: number;
    tombstoneNames: string[];
  }> {
    if (!__DEV__) {
      throw new Error(
        "devCleanupAllTombstones is only available in development mode"
      );
    }

    const state = await this.loadOfflineState();
    const cleanupResult = this.devCleanupAllTombstones(state.recipes);
    state.recipes = cleanupResult.cleanedRecipes;
    await this.saveOfflineState(state);

    return {
      removedTombstones: cleanupResult.removedTombstones,
      tombstoneNames: cleanupResult.tombstoneNames,
    };
  }

  /**
   * Clear all offline data (use with caution)
   */
  static async clearOfflineData(): Promise<void> {
    const { STORAGE_KEY, PENDING_OPERATIONS_KEY, METADATA_KEY } =
      await this.getUserScopedKeys();
    await AsyncStorage.multiRemove([
      STORAGE_KEY,
      PENDING_OPERATIONS_KEY,
      METADATA_KEY,
      `${PENDING_OPERATIONS_KEY}_failed`, // Failed operations key
    ]);
  }

  /**
   * Store failed operations for manual retry or user notification
   */
  private static async storeFailedOperation(
    operation: OfflinePendingOperation,
    error: any
  ): Promise<void> {
    try {
      const { PENDING_OPERATIONS_KEY } = await this.getUserScopedKeys();
      const failedOpsKey = `${PENDING_OPERATIONS_KEY}_failed`;
      const existingFailed = await AsyncStorage.getItem(failedOpsKey);
      const failedOps = existingFailed ? JSON.parse(existingFailed) : [];
      failedOps.push({
        ...operation,
        failedAt: Date.now(),
        error: error?.message || "Unknown error",
      });
      await AsyncStorage.setItem(failedOpsKey, JSON.stringify(failedOps));
    } catch (err) {
      console.error("Failed to store failed operation:", err);
    }
  }
}

export default OfflineRecipeService;

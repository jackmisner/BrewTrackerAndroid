/**
 * Legacy Migration Service - BrewTracker Offline V2
 *
 * Provides utilities for migrating data from the legacy OfflineRecipeService
 * to the new V2 UserCacheService system.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserCacheService } from "./UserCacheService";
import { Recipe } from "@src/types";
import { OfflineRecipe } from "@src/types/offline";
import { STORAGE_KEYS } from "@services/config";

export interface MigrationResult {
  migrated: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
}

export class LegacyMigrationService {
  /**
   * Migrate all legacy recipes to V2 cache for a specific user
   */
  static async migrateLegacyRecipesToV2(
    userId: string,
    userUnitSystem: "imperial" | "metric" = "imperial"
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      migrated: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [],
    };

    try {
      console.log(`[LegacyMigration] Starting migration for user: ${userId}`);

      // Get legacy recipes from old storage
      const legacyRecipes = await this.getLegacyRecipes(userId);
      console.log(
        `[LegacyMigration] Found ${legacyRecipes.length} legacy recipes`
      );

      if (legacyRecipes.length === 0) {
        console.log(`[LegacyMigration] No legacy recipes to migrate`);
        return result;
      }

      // Get existing V2 recipes to avoid duplicates
      const existingV2Recipes = await UserCacheService.getRecipes(userId);
      const existingIds = new Set(existingV2Recipes.map(r => r.id));

      console.log(
        `[LegacyMigration] Found ${existingV2Recipes.length} existing V2 recipes`
      );

      // Migrate each legacy recipe
      for (const legacyRecipe of legacyRecipes) {
        try {
          // Skip if already exists in V2 cache
          if (existingIds.has(legacyRecipe.id)) {
            console.log(
              `[LegacyMigration] Skipping duplicate recipe: ${legacyRecipe.id}`
            );
            result.skipped++;
            continue;
          }

          // Convert legacy recipe to V2 format
          const v2Recipe = this.convertLegacyToV2Recipe(
            legacyRecipe,
            userId,
            userUnitSystem
          );

          // Add to V2 cache
          await UserCacheService.addRecipeToCache({
            id: v2Recipe.id,
            data: v2Recipe,
            lastModified: Date.now(),
            syncStatus: legacyRecipe.needsSync ? "pending" : "synced",
            needsSync: legacyRecipe.needsSync || false,
            tempId: legacyRecipe.tempId,
          });

          console.log(
            `[LegacyMigration] Migrated recipe: ${legacyRecipe.name} (${legacyRecipe.id})`
          );
          result.migrated++;
        } catch (error) {
          console.error(
            `[LegacyMigration] Failed to migrate recipe ${legacyRecipe.id}:`,
            error
          );
          result.errors++;
          result.errorDetails.push(
            `${legacyRecipe.id}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      console.log(`[LegacyMigration] Migration completed:`, result);
      return result;
    } catch (error) {
      console.error(`[LegacyMigration] Migration failed:`, error);
      result.errors++;
      result.errorDetails.push(
        `Migration failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      return result;
    }
  }

  /**
   * Get all legacy recipes for a user from old storage
   */
  private static async getLegacyRecipes(
    userId: string
  ): Promise<OfflineRecipe[]> {
    try {
      const offlineData = await AsyncStorage.getItem(
        STORAGE_KEYS.OFFLINE_RECIPES
      );
      if (!offlineData) {
        return [];
      }

      const parsedData = JSON.parse(offlineData);
      const allRecipes: OfflineRecipe[] = parsedData.recipes || [];

      // Filter recipes for this user and exclude deleted ones
      return allRecipes.filter(
        recipe => recipe.user_id === userId && !recipe.isDeleted
      );
    } catch (error) {
      console.error(`[LegacyMigration] Failed to load legacy recipes:`, error);
      return [];
    }
  }

  /**
   * Convert a legacy OfflineRecipe to V2 Recipe format
   */
  private static convertLegacyToV2Recipe(
    legacyRecipe: OfflineRecipe,
    userId: string,
    userUnitSystem: "imperial" | "metric"
  ): Recipe {
    // Create base recipe from legacy data
    const v2Recipe: Recipe = {
      id: legacyRecipe.id,
      user_id: userId,
      name: legacyRecipe.name,
      description: legacyRecipe.description || "",
      style: legacyRecipe.style || "",
      batch_size: legacyRecipe.batch_size || 5,
      boil_time: legacyRecipe.boil_time || 60,
      efficiency: legacyRecipe.efficiency || 75,
      ingredients: legacyRecipe.ingredients || [],
      estimated_og: legacyRecipe.estimated_og || 1.05,
      estimated_fg: legacyRecipe.estimated_fg || 1.01,
      estimated_abv: legacyRecipe.estimated_abv || 5.0,
      estimated_ibu: legacyRecipe.estimated_ibu || 25,
      estimated_srm: legacyRecipe.estimated_srm || 5,
      created_at: legacyRecipe.created_at || new Date().toISOString(),
      updated_at: legacyRecipe.updated_at || new Date().toISOString(),
      is_public: legacyRecipe.is_public || false,
      is_owner: true, // Legacy recipes are always owned by the user
      username: undefined, // Will be set by the system
      version: legacyRecipe.version || 1,
      parent_recipe_id: legacyRecipe.parent_recipe_id,
      original_author: legacyRecipe.original_author,
      // Add missing required fields based on user's unit system
      batch_size_unit: userUnitSystem === "metric" ? "l" : "gal",
      unit_system: userUnitSystem,
      mash_temperature: userUnitSystem === "metric" ? 67 : 152, // 67°C ≈ 152°F
      mash_temp_unit: userUnitSystem === "metric" ? "C" : "F",
      notes: "", // Default empty notes
    };

    return v2Recipe;
  }

  /**
   * Check if there are legacy recipes that need migration
   */
  static async hasLegacyRecipes(userId: string): Promise<boolean> {
    const legacyRecipes = await this.getLegacyRecipes(userId);
    return legacyRecipes.length > 0;
  }

  /**
   * Get count of legacy recipes for a user
   */
  static async getLegacyRecipeCount(userId: string): Promise<number> {
    const legacyRecipes = await this.getLegacyRecipes(userId);
    return legacyRecipes.length;
  }

  /**
   * Clear legacy recipes for a user after successful migration
   * WARNING: This permanently removes legacy data
   */
  static async clearLegacyRecipes(userId: string): Promise<void> {
    try {
      console.log(
        `[LegacyMigration] Clearing legacy recipes for user: ${userId}`
      );

      const offlineData = await AsyncStorage.getItem(
        STORAGE_KEYS.OFFLINE_RECIPES
      );
      if (!offlineData) {
        return;
      }

      const parsedData = JSON.parse(offlineData);
      const allRecipes: OfflineRecipe[] = parsedData.recipes || [];

      // Keep recipes for other users, remove recipes for this user
      const filteredRecipes = allRecipes.filter(
        recipe => recipe.user_id !== userId
      );

      // Update storage
      const updatedData = {
        ...parsedData,
        recipes: filteredRecipes,
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.OFFLINE_RECIPES,
        JSON.stringify(updatedData)
      );

      console.log(
        `[LegacyMigration] Cleared legacy recipes for user ${userId}`
      );
    } catch (error) {
      console.error(`[LegacyMigration] Failed to clear legacy recipes:`, error);
      throw error;
    }
  }
}

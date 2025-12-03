/**
 * Startup Hydration Service - BrewTracker Offline V2
 *
 * Handles automatic cache hydration when the app starts up.
 * Ensures that users have their server data available offline immediately.
 */

import { UserCacheService } from "./UserCacheService";
import { StaticDataService } from "./StaticDataService";
import { UnifiedLogger } from "@/src/services/logger/UnifiedLogger";
import { UnitSystem } from "@/src/types";

export class StartupHydrationService {
  private static isHydrating = false;
  private static hasHydrated = false;

  /**
   * Perform startup hydration for authenticated user
   */
  static async hydrateOnStartup(
    userId: string,
    userUnitSystem: UnitSystem = "imperial"
  ): Promise<void> {
    // Prevent multiple concurrent hydrations
    if (this.isHydrating || this.hasHydrated) {
      UnifiedLogger.debug(
        "offline-hydration",
        `[StartupHydrationService] Hydration already in progress or completed`
      );
      return;
    }

    this.isHydrating = true;
    UnifiedLogger.debug(
      "offline-hydration",
      `[StartupHydrationService] Starting hydration for user: "${userId}"`
    );

    try {
      // Hydrate in parallel for better performance
      await Promise.allSettled([
        this.hydrateUserData(userId, userUnitSystem),
        this.hydrateStaticData(),
      ]);

      this.hasHydrated = true;
      UnifiedLogger.debug(
        "offline-hydration",
        `[StartupHydrationService] Hydration completed successfully`
      );
    } catch (error) {
      console.error(`[StartupHydrationService] Hydration failed:`, error);
      // Don't throw - app should still work even if hydration fails
    } finally {
      this.isHydrating = false;
    }
  }

  /**
   * Hydrate user-specific data (recipes, brew sessions)
   */
  private static async hydrateUserData(
    userId: string,
    userUnitSystem: UnitSystem = "imperial"
  ): Promise<void> {
    try {
      UnifiedLogger.debug(
        "offline-hydration",
        `[StartupHydrationService] Hydrating user data...`
      );

      // Check if user already has cached recipes
      const existingRecipes = await UserCacheService.getRecipes(
        userId,
        userUnitSystem
      );

      if (existingRecipes.length === 0) {
        UnifiedLogger.debug(
          "offline-hydration",
          `[StartupHydrationService] No cached recipes found, will hydrate from server`
        );
        // The UserCacheService.getRecipes() method will automatically hydrate
        // So we don't need to do anything special here
      } else {
        UnifiedLogger.debug(
          "offline-hydration",
          `[StartupHydrationService] User already has ${existingRecipes.length} cached recipes`
        );
      }

      // TODO: Add brew sessions hydration when implemented
      // await this.hydrateBrewSessions(userId);

      UnifiedLogger.debug(
        "offline-hydration",
        `[StartupHydrationService] User data hydration completed`
      );
    } catch (error) {
      console.warn(
        `[StartupHydrationService] User data hydration failed:`,
        error
      );
      // Continue with static data hydration even if user data fails
    }
  }

  /**
   * Hydrate static data (ingredients, beer styles)
   */
  private static async hydrateStaticData(): Promise<void> {
    try {
      UnifiedLogger.debug(
        "offline-hydration",
        `[StartupHydrationService] Hydrating static data...`
      );

      // Check and update ingredients cache
      const ingredientsStats = await StaticDataService.getCacheStats();
      if (!ingredientsStats.ingredients.cached) {
        UnifiedLogger.debug(
          "offline-hydration",
          `[StartupHydrationService] No cached ingredients found, fetching...`
        );
        await StaticDataService.getIngredients(); // This will cache automatically
      } else {
        UnifiedLogger.debug(
          "offline-hydration",
          `[StartupHydrationService] Ingredients already cached (${ingredientsStats.ingredients.record_count} items)`
        );
        // Check for updates in background
        StaticDataService.updateIngredientsCache().catch(error => {
          console.warn(
            `[StartupHydrationService] Background ingredients update failed:`,
            error
          );
        });
      }

      // Check and update beer styles cache
      if (!ingredientsStats.beerStyles.cached) {
        UnifiedLogger.debug(
          "offline-hydration",
          `[StartupHydrationService] No cached beer styles found, fetching...`
        );
        await StaticDataService.getBeerStyles(); // This will cache automatically
      } else {
        UnifiedLogger.debug(
          "offline-hydration",
          `[StartupHydrationService] Beer styles already cached (${ingredientsStats.beerStyles.record_count} items)`
        );
        // Check for updates in background
        StaticDataService.updateBeerStylesCache().catch(error => {
          console.warn(
            `[StartupHydrationService] Background beer styles update failed:`,
            error
          );
        });
      }

      UnifiedLogger.debug(
        "offline-hydration",
        `[StartupHydrationService] Static data hydration completed`
      );
    } catch (error) {
      console.warn(
        `[StartupHydrationService] Static data hydration failed:`,
        error
      );
    }
  }

  /**
   * Reset hydration state (useful for testing or user logout)
   */
  static resetHydrationState(): void {
    this.isHydrating = false;
    this.hasHydrated = false;
    UnifiedLogger.debug(
      "offline-hydration",
      `[StartupHydrationService] Hydration state reset`
    );
  }

  /**
   * Check if hydration has been completed
   */
  static getHydrationStatus(): {
    isHydrating: boolean;
    hasHydrated: boolean;
  } {
    return {
      isHydrating: this.isHydrating,
      hasHydrated: this.hasHydrated,
    };
  }
}

/**
 * Startup Hydration Service - BrewTracker Offline V2
 *
 * Handles automatic cache hydration when the app starts up.
 * Ensures that users have their server data available offline immediately.
 */

import { UserCacheService } from "./UserCacheService";
import { StaticDataService } from "./StaticDataService";
import { UnifiedLogger } from "@services/logger/UnifiedLogger";
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
      return;
    }

    this.isHydrating = true;

    try {
      // Hydrate in parallel for better performance
      await Promise.allSettled([
        this.hydrateUserData(userId, userUnitSystem),
        this.hydrateStaticData(),
      ]);

      this.hasHydrated = true;
    } catch (error) {
      await UnifiedLogger.error(
        "offline-hydration",
        "[StartupHydrationService] Hydration failed:",
        error
      );
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
      // Check if user already has cached recipes
      const existingRecipes = await UserCacheService.getRecipes(
        userId,
        userUnitSystem
      );

      if (existingRecipes.length === 0) {
        // The UserCacheService.getRecipes() method will automatically hydrate
        // So we don't need to do anything special here
      } else {
      }

      // TODO: Add brew sessions hydration when implemented
      // await this.hydrateBrewSessions(userId);
    } catch (error) {
      void UnifiedLogger.warn(
        "offline-hydration",
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
      // Check and update ingredients cache
      const ingredientsStats = await StaticDataService.getCacheStats();
      if (!ingredientsStats.ingredients.cached) {
        await StaticDataService.getIngredients(); // This will cache automatically
      } else {
        // Check for updates in background
        StaticDataService.updateIngredientsCache().catch(error => {
          void UnifiedLogger.warn(
            "offline-hydration",
            `[StartupHydrationService] Background ingredients update failed:`,
            error
          );
        });
      }

      // Check and update beer styles cache
      if (!ingredientsStats.beerStyles.cached) {
        await StaticDataService.getBeerStyles(); // This will cache automatically
      } else {
        // Check for updates in background
        StaticDataService.updateBeerStylesCache().catch(error => {
          void UnifiedLogger.warn(
            "offline-hydration",
            `[StartupHydrationService] Background beer styles update failed:`,
            error
          );
        });
      }
    } catch (error) {
      void UnifiedLogger.warn(
        "offline-hydration",
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

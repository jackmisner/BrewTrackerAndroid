/**
 * Startup Hydration Service - BrewTracker Offline V2
 *
 * Handles automatic cache hydration when the app starts up.
 * Ensures that users have their server data available offline immediately.
 */

import { UserCacheService } from "./UserCacheService";
import { StaticDataService } from "./StaticDataService";

export class StartupHydrationService {
  private static isHydrating = false;
  private static hasHydrated = false;

  /**
   * Perform startup hydration for authenticated user
   */
  static async hydrateOnStartup(userId: string): Promise<void> {
    // Prevent multiple concurrent hydrations
    if (this.isHydrating || this.hasHydrated) {
      console.log(
        `[StartupHydrationService] Hydration already in progress or completed`
      );
      return;
    }

    this.isHydrating = true;
    console.log(
      `[StartupHydrationService] Starting hydration for user: "${userId}"`
    );

    try {
      // Hydrate in parallel for better performance
      await Promise.allSettled([
        this.hydrateUserData(userId),
        this.hydrateStaticData(),
      ]);

      this.hasHydrated = true;
      console.log(`[StartupHydrationService] Hydration completed successfully`);
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
  private static async hydrateUserData(userId: string): Promise<void> {
    try {
      console.log(`[StartupHydrationService] Hydrating user data...`);

      // Check if user already has cached recipes
      const existingRecipes = await UserCacheService.getRecipes(userId);

      if (existingRecipes.length === 0) {
        console.log(
          `[StartupHydrationService] No cached recipes found, will hydrate from server`
        );
        // The UserCacheService.getRecipes() method will automatically hydrate
        // So we don't need to do anything special here
      } else {
        console.log(
          `[StartupHydrationService] User already has ${existingRecipes.length} cached recipes`
        );
      }

      // TODO: Add brew sessions hydration when implemented
      // await this.hydrateBrewSessions(userId);

      console.log(`[StartupHydrationService] User data hydration completed`);
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
      console.log(`[StartupHydrationService] Hydrating static data...`);

      // Check and update ingredients cache
      const ingredientsStats = await StaticDataService.getCacheStats();
      if (!ingredientsStats.ingredients.cached) {
        console.log(
          `[StartupHydrationService] No cached ingredients found, fetching...`
        );
        await StaticDataService.getIngredients(); // This will cache automatically
      } else {
        console.log(
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
        console.log(
          `[StartupHydrationService] No cached beer styles found, fetching...`
        );
        await StaticDataService.getBeerStyles(); // This will cache automatically
      } else {
        console.log(
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

      console.log(`[StartupHydrationService] Static data hydration completed`);
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
    console.log(`[StartupHydrationService] Hydration state reset`);
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

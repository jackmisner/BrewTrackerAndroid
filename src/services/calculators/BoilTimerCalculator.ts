import { Recipe, RecipeIngredient } from "@src/types";

export interface HopAddition {
  time: number;
  name: string;
  amount: number;
  unit: string;
  added?: boolean;
  use?: string;
  alpha_acid?: number;
}

export interface BoilTimerResult {
  duration: number;
  hopSchedule: HopAddition[];
  otherSchedule: Array<{
    time: number;
    description: string;
    added?: boolean;
  }>;
}

export interface RecipeTimerData {
  recipeId: string;
  recipeName: string;
  recipeStyle: string;
  boilTime: number;
  hopAlerts: Array<{
    time: number;
    name: string;
    amount: number;
    unit: string;
    added: boolean;
    alertScheduled: boolean;
    use?: string;
    alpha_acid?: number;
  }>;
}

export class BoilTimerCalculator {
  public static calculate(
    duration: number,
    hopAdditions: HopAddition[] = [],
    otherAdditions: Array<{ time: number; description: string }> = []
  ): BoilTimerResult {
    if (duration <= 0) {
      throw new Error("Duration must be greater than 0");
    }

    return {
      duration,
      hopSchedule: hopAdditions.map(hop => ({
        ...hop,
        added: false,
      })),
      otherSchedule: otherAdditions.map(addition => ({
        ...addition,
        added: false,
      })),
    };
  }

  /**
   * Create a timer configuration from a recipe
   */
  public static createFromRecipe(recipe: Recipe): RecipeTimerData {
    if (!recipe) {
      throw new Error("Recipe is required");
    }

    if (recipe.boil_time <= 0) {
      throw new Error("Recipe must have a valid boil time");
    }

    const hopAlerts = this.getHopSchedule(recipe);

    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      recipeStyle: recipe.style,
      boilTime: recipe.boil_time,
      hopAlerts,
    };
  }

  /**
   * Extract and validate hop schedule from recipe ingredients
   */
  public static getHopSchedule(recipe: Recipe): Array<{
    time: number;
    name: string;
    amount: number;
    unit: string;
    added: boolean;
    alertScheduled: boolean;
    use?: string;
    alpha_acid?: number;
  }> {
    // Filter hop ingredients
    const hopIngredients = recipe.ingredients.filter(
      (ingredient: RecipeIngredient) => ingredient.type === "hop"
    );

    // Convert to hop alerts format
    const hopAlerts = hopIngredients
      .filter((hop: RecipeIngredient) => {
        // Only include hops that have a time specified and are boil additions
        return (
          hop.time !== undefined &&
          hop.time !== null &&
          hop.time >= 0 &&
          (hop.use === "boil" || hop.use === "Boil" || !hop.use)
        ); // Default to boil if not specified
      })
      .map((hop: RecipeIngredient) => ({
        time: hop.time || 0,
        name: hop.name,
        amount: hop.amount,
        unit: hop.unit,
        added: false,
        alertScheduled: false,
        use: hop.use,
        alpha_acid: hop.alpha_acid,
      }))
      .sort((a, b) => b.time - a.time); // Sort by time descending (60min, 30min, 15min, etc.)

    // Validate hop times against boil duration
    const validatedHops = hopAlerts.filter(hop => {
      if (hop.time > recipe.boil_time) {
        console.warn(
          `Hop ${hop.name} has addition time ${hop.time}min which exceeds boil time ${recipe.boil_time}min`
        );
        return false;
      }
      return true;
    });

    return validatedHops;
  }

  /**
   * Generate automatic boil additions for common brewing additives
   */
  public static getDefaultBoilAdditions(boilTime: number): Array<{
    time: number;
    description: string;
    added: boolean;
  }> {
    const additions = [];

    // Add whirlfloc/irish moss at 15min if boil is long enough
    if (boilTime >= 15) {
      additions.push({
        time: 15,
        description: "Add Whirlfloc/Irish Moss",
        added: false,
      });
    }

    // Add yeast nutrient at 10min if boil is long enough
    if (boilTime >= 10) {
      additions.push({
        time: 10,
        description: "Add Yeast Nutrient (optional)",
        added: false,
      });
    }

    // Flameout additions
    additions.push({
      time: 0,
      description: "Flameout - Turn off heat",
      added: false,
    });

    return additions;
  }

  /**
   * Calculate when to alert for hop additions (30 seconds before)
   */
  public static getHopAlertTimes(
    hopSchedule: HopAddition[]
  ): Map<number, HopAddition[]> {
    const alertMap = new Map<number, HopAddition[]>();

    hopSchedule.forEach(hop => {
      // Alert 30 seconds before addition time
      const alertTime = hop.time * 60 + 30; // Convert to seconds and add 30 second buffer

      if (!alertMap.has(alertTime)) {
        alertMap.set(alertTime, []);
      }
      alertMap.get(alertTime)?.push(hop);
    });

    return alertMap;
  }

  /**
   * Validate recipe for timer compatibility
   */
  public static validateRecipeForTimer(recipe: Recipe): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check boil time
    if (!recipe.boil_time || recipe.boil_time <= 0) {
      errors.push("Recipe must have a valid boil time");
    } else if (recipe.boil_time > 180) {
      warnings.push("Boil time is unusually long (>3 hours)");
    }

    // Check hop ingredients
    const hops = recipe.ingredients.filter(ing => ing.type === "hop");
    if (hops.length === 0) {
      warnings.push("Recipe has no hop additions");
    } else {
      hops.forEach(hop => {
        if (hop.time === undefined || hop.time === null) {
          warnings.push(`Hop ${hop.name} has no addition time specified`);
        } else if (hop.time < 0) {
          errors.push(
            `Hop ${hop.name} has a negative addition time (${hop.time}min)`
          );
        } else if (hop.time > recipe.boil_time) {
          errors.push(
            `Hop ${hop.name} addition time (${hop.time}min) exceeds boil time (${recipe.boil_time}min)`
          );
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Format time for display (MM:SS)
   */
  public static formatTime(seconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  /**
   * Calculate time remaining until next hop addition
   */
  public static getTimeToNextAddition(
    currentTimeRemaining: number, // seconds
    hopAlerts: { time: number; added: boolean }[]
  ): {
    nextAddition: { time: number; added: boolean } | null;
    timeUntilNext: number;
  } {
    // Convert current time remaining to minutes for comparison
    const currentMinutes = Math.floor(currentTimeRemaining / 60);

    // Find next unfinished hop addition
    const nextAddition =
      hopAlerts
        .filter(hop => !hop.added && hop.time <= currentMinutes)
        .sort((a, b) => b.time - a.time)[0] || null;

    const timeUntilNext = nextAddition
      ? currentTimeRemaining - nextAddition.time * 60
      : 0;

    return {
      nextAddition,
      timeUntilNext,
    };
  }
}

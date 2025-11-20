/**
 * AI Recipe Analysis Helper Utilities
 *
 * Provides utility functions for grouping and formatting AI analysis results.
 * Uses existing formatUtils for value formatting to avoid duplication.
 *
 * @module utils/aiHelpers
 */

import {
  RecipeChange,
  AIChangeValue,
  RecipeFormData,
  RecipeIngredient,
  RecipeMetrics,
} from "@src/types";
import {
  formatGravity,
  formatABV,
  formatIBU,
  formatSRM,
  formatIngredientAmount,
} from "./formatUtils";

/**
 * Backend metrics format with uppercase keys
 */
interface BackendMetrics {
  OG?: number;
  FG?: number;
  ABV?: number;
  IBU?: number;
  SRM?: number;
  attenuation?: number;
}

/**
 * Normalizes backend metrics (uppercase keys) to RecipeMetrics format (lowercase keys)
 *
 * Backend sends metrics with uppercase keys (OG, FG, ABV, IBU, SRM)
 * but our RecipeMetrics type uses lowercase keys (og, fg, abv, ibu, srm)
 *
 * @param backendMetrics - Metrics object from backend with uppercase keys
 * @returns Normalized metrics with lowercase keys matching RecipeMetrics type
 */
export function normalizeBackendMetrics(
  backendMetrics: BackendMetrics | undefined
): RecipeMetrics | undefined {
  if (!backendMetrics) {
    return undefined;
  }

  return {
    og: backendMetrics.OG ?? 0,
    fg: backendMetrics.FG ?? 0,
    abv: backendMetrics.ABV ?? 0,
    ibu: backendMetrics.IBU ?? 0,
    srm: backendMetrics.SRM ?? 0,
    attenuation: backendMetrics.attenuation,
  };
}

/**
 * Grouped recipe changes for organized display
 */
export interface GroupedRecipeChanges {
  /** Recipe-level parameter modifications (mash temp, boil time, etc.) */
  parameters: RecipeChange[];
  /** Ingredient modifications (amount, time changes) */
  modifications: RecipeChange[];
  /** New ingredient additions */
  additions: RecipeChange[];
  /** Ingredient removals */
  removals: RecipeChange[];
}

/**
 * Groups recipe changes by type for organized UI display
 *
 * Separates changes into categories for better user comprehension
 *
 * @param changes - Array of recipe changes from optimization
 * @returns Grouped changes by category
 */
export function groupRecipeChanges(
  changes: RecipeChange[]
): GroupedRecipeChanges {
  return {
    parameters: changes.filter(c => c.type === "modify_recipe_parameter"),
    modifications: changes.filter(c => c.type === "ingredient_modified"),
    additions: changes.filter(c => c.type === "ingredient_added"),
    removals: changes.filter(c => c.type === "ingredient_removed"),
  };
}

/**
 * Formats a change value with its unit
 *
 * @param value - The value to format
 * @param unit - Optional unit to append
 * @param field - Field name to determine formatting (e.g., "amount")
 * @returns Formatted value string
 */
export function formatChangeValue(
  value: AIChangeValue | undefined,
  unit?: string,
  field?: string
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  // Handle numeric values
  if (typeof value === "number") {
    // Use existing formatters for specific fields
    if (field === "amount" && unit) {
      const formattedAmount = formatIngredientAmount(value, unit);
      return `${formattedAmount} ${unit}`;
    }

    // Round to 1 decimal place for display
    const rounded = Math.round(value * 10) / 10;
    return unit ? `${rounded} ${unit}` : rounded.toString();
  }

  // Handle string and boolean values
  const stringValue = String(value);
  return unit ? `${stringValue} ${unit}` : stringValue;
}

/**
 * Formats a recipe change into a human-readable description
 *
 * Always includes units for clarity and uses actual ingredient values
 *
 * @param change - The recipe change to format
 * @returns Formatted description string with units
 */
export function formatChangeDescription(change: RecipeChange): string {
  switch (change.type) {
    case "ingredient_modified": {
      const originalFormatted = formatChangeValue(
        change.original_value,
        change.unit,
        change.field
      );
      const optimizedFormatted = formatChangeValue(
        change.optimized_value,
        change.unit,
        change.field
      );
      return `${change.ingredient_name}: ${originalFormatted} → ${optimizedFormatted}`;
    }

    case "ingredient_added": {
      const amount = change.optimized_value ?? change.amount;
      const amountFormatted = formatChangeValue(amount, change.unit, "amount");
      return `Add ${change.ingredient_name} (${amountFormatted})`;
    }

    case "ingredient_removed":
      return `Remove ${change.ingredient_name}`;

    case "modify_recipe_parameter": {
      const paramName = change.parameter || "parameter";
      // Format parameter changes with appropriate units
      const unit =
        change.unit || (paramName.toLowerCase().includes("temp") ? "°" : "");
      const originalFormatted = formatChangeValue(change.original_value, unit);
      const optimizedFormatted = formatChangeValue(
        change.optimized_value,
        unit
      );
      return `${paramName}: ${originalFormatted} → ${optimizedFormatted}`;
    }

    default:
      return "Unknown change";
  }
}

/**
 * Calculates the percentage change between two values
 *
 * @param original - Original value
 * @param optimized - Optimized value
 * @returns Percentage change (positive = increase, negative = decrease)
 */
export function calculatePercentageChange(
  original: number,
  optimized: number
): number {
  if (original === 0) {
    // Cannot calculate percentage change from zero
    // Return 0 to indicate no baseline for comparison
    return 0;
  }
  return ((optimized - original) / original) * 100;
}

/**
 * Determines if a metric improved (got closer to style guidelines)
 *
 * @param original - Original metric value
 * @param optimized - Optimized metric value
 * @param min - Style guideline minimum
 * @param max - Style guideline maximum
 * @returns True if the optimized value is closer to the style range
 */
export function isMetricImproved(
  original: number,
  optimized: number,
  min?: number,
  max?: number
): boolean {
  // Cannot determine improvement without a target range
  if (min === undefined || max === undefined) {
    return false;
  }

  // Calculate distance from range for both values
  const originalDistance = getDistanceFromRange(original, min, max);
  const optimizedDistance = getDistanceFromRange(optimized, min, max);

  // Improved if optimized value is closer to the range (or within it)
  return optimizedDistance < originalDistance;
}

/**
 * Calculates distance of a value from a range
 *
 * @param value - Value to check
 * @param min - Minimum of range
 * @param max - Maximum of range
 * @returns Distance from range (0 if within range)
 */
function getDistanceFromRange(value: number, min: number, max: number): number {
  if (value < min) {
    return min - value;
  }
  if (value > max) {
    return value - max;
  }
  // Within range
  return 0;
}

/**
 * Gets a color indicator for metric changes
 *
 * Returns theme color names for styling
 *
 * @param improved - Whether the metric improved
 * @param inRange - Whether the optimized value is within style range
 * @returns Color name for theme-based styling
 */
export function getMetricChangeColor(
  improved: boolean,
  inRange: boolean
): "success" | "warning" | "textMuted" {
  if (inRange) {
    return "success"; // Green - in style range
  }
  if (improved) {
    return "warning"; // Yellow - improved but not quite in range
  }
  return "textMuted"; // Gray - no change or worse
}

/**
 * Formats a metric value for display using existing formatters
 *
 * @param metricName - Name of the metric (OG, FG, ABV, IBU, SRM)
 * @param value - Metric value
 * @returns Formatted string with appropriate precision
 */
export function formatMetricForComparison(
  metricName: string,
  value: number | undefined
): string {
  if (value === undefined || value === null) {
    return "—";
  }

  switch (metricName.toUpperCase()) {
    case "OG":
    case "FG":
      return formatGravity(value);

    case "ABV":
      return formatABV(value);

    case "IBU":
      return formatIBU(value);

    case "SRM":
      return formatSRM(value);

    default:
      return value.toFixed(1);
  }
}

/**
 * Counts total number of changes
 *
 * @param grouped - Grouped recipe changes
 * @returns Total count of all changes
 */
export function getTotalChanges(grouped: GroupedRecipeChanges): number {
  return (
    grouped.parameters.length +
    grouped.modifications.length +
    grouped.additions.length +
    grouped.removals.length
  );
}

/**
 * Enriches recipe changes with actual original values from the user's recipe
 *
 * The backend may send intermediate values from optimization steps.
 * This function ensures changes display what the user actually entered.
 *
 * @param changes - Recipe changes from optimization
 * @param originalRecipe - The user's original recipe data
 * @returns Enriched recipe changes with correct original values
 */
export function enrichRecipeChanges(
  changes: RecipeChange[],
  originalRecipe: RecipeFormData
): RecipeChange[] {
  return changes.map(change => {
    if (change.type === "ingredient_modified" && change.ingredient_name) {
      // Find the original ingredient in the user's recipe
      const originalIngredient = originalRecipe.ingredients.find(
        ing => ing.name === change.ingredient_name
      );

      if (originalIngredient && change.field) {
        // Get the actual original value from the user's ingredient
        const actualOriginalValue =
          originalIngredient[change.field as keyof RecipeIngredient];

        return {
          ...change,
          original_value: actualOriginalValue as AIChangeValue,
        };
      }
    }

    if (change.type === "modify_recipe_parameter" && change.parameter) {
      // Get the actual original parameter value from the user's recipe
      const parameterMap: Record<string, keyof RecipeFormData> = {
        mash_temperature: "mash_temperature",
        mash_time: "mash_time",
        boil_time: "boil_time",
        efficiency: "efficiency",
        batch_size: "batch_size",
      };

      const recipeField = parameterMap[change.parameter];
      if (recipeField) {
        const actualOriginalValue = originalRecipe[recipeField];
        return {
          ...change,
          original_value: actualOriginalValue as AIChangeValue,
        };
      }
    }

    // Return unchanged for additions and removals
    return change;
  });
}

/**
 * AI Recipe Analysis Helper Utilities
 *
 * Provides utility functions for grouping and formatting AI analysis results.
 * Uses existing formatUtils for value formatting to avoid duplication.
 *
 * @module utils/aiHelpers
 */

import { RecipeChange, AIChangeValue } from "@src/types";
import {
  formatGravity,
  formatABV,
  formatIBU,
  formatSRM,
  formatIngredientAmount,
} from "./formatUtils";

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
      return formatIngredientAmount(value, unit);
    }

    // Round to 1 decimal place for display
    const rounded = Math.round(value * 10) / 10;
    return unit ? `${rounded}${unit}` : rounded.toString();
  }

  // Handle string and boolean values
  const stringValue = String(value);
  return unit ? `${stringValue} ${unit}` : stringValue;
}

/**
 * Formats a recipe change into a human-readable description
 *
 * @param change - The recipe change to format
 * @returns Formatted description string
 */
export function formatChangeDescription(change: RecipeChange): string {
  switch (change.type) {
    case "ingredient_modified":
      return `${change.ingredient_name}: ${formatChangeValue(change.original_value, change.unit, change.field)} → ${formatChangeValue(change.optimized_value, change.unit, change.field)}`;

    case "ingredient_added":
      return `Add ${change.ingredient_name} (${formatChangeValue(change.optimized_value ?? change.amount, change.unit, "amount")})`;

    case "ingredient_removed":
      return `Remove ${change.ingredient_name}`;

    case "modify_recipe_parameter":
      return `${change.parameter}: ${formatChangeValue(change.original_value)} → ${formatChangeValue(change.optimized_value)}`;

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
  if (original === 0) return 0;
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

/**
 * Utility functions for generating unique React keys
 *
 * Ensures all components have stable, unique keys even when the same
 * entity appears multiple times in different contexts (e.g., same hop
 * used for both boil and dry hop additions).
 */

import { RecipeIngredient } from "@src/types";

/**
 * Generates a unique React key for recipe ingredients
 *
 * Handles cases where the same ingredient is used multiple times
 * in different contexts (different usage, timing, etc.)
 *
 * @param ingredient - The recipe ingredient
 * @param index - The array index for this ingredient (fallback only)
 * @param context - Context string for discriminating same ingredient in different roles
 * @returns Deterministic composite key, stable across reorders when ID exists
 */
export function generateIngredientKey(
  ingredient: RecipeIngredient,
  index: number,
  context?: string
): string {
  const type = ingredient.type || "unknown";
  const contextPrefix = context ? `${context}-` : "";

  if (ingredient.id) {
    // Stable key: context + type + id (no index needed)
    return `${contextPrefix}${type}-${ingredient.id}`;
  }

  // Fallback for items without stable ID
  const tempKey =
    ingredient.name?.replace(/\s+/g, "-").toLowerCase() || "unknown";
  return `${contextPrefix}${type}-temp-${tempKey}-${index}`;
}

/**
 * Generates a unique key for any list item with optional context
 *
 * @param item - Object with id and optional name properties
 * @param index - Array index (fallback only)
 * @param context - Context string for discriminating same item in different roles
 * @returns Deterministic composite key, stable across reorders when ID exists
 */
export function generateListItemKey(
  item: { id?: string; name?: string },
  index: number,
  context?: string
): string {
  const contextPrefix = context ? `${context}-` : "";

  if (item.id) {
    // Stable key: context + id (no index needed)
    return `${contextPrefix}${item.id}`;
  }

  // Fallback for items without stable ID
  const tempKey = item.name?.replace(/\s+/g, "-").toLowerCase() || "unknown";
  return `${contextPrefix}temp-${tempKey}-${index}`;
}

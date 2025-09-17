/**
 * Utility functions for generating unique React keys
 *
 * Ensures all components have stable, unique keys even when the same
 * entity appears multiple times in different contexts (e.g., same hop
 * used for both boil and dry hop additions).
 */

import { RecipeIngredient } from "@src/types";

const slugify = (s: string): string =>
  s
    .normalize?.("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-");

/**
 * Generates a unique React key for recipe ingredients
 *
 * Handles cases where the same ingredient is used multiple times
 * in different contexts (different usage, timing, etc.)
 *
 * @param ingredient - The recipe ingredient
 * @param index - The array index for this ingredient (always included for uniqueness)
 * @param context - Context string for discriminating same ingredient in different roles
 * @returns Deterministic composite key, unique even when same ingredient appears multiple times
 */
export function generateIngredientKey(
  ingredient: RecipeIngredient,
  index: number,
  context?: string
): string {
  const type = ingredient.type || "unknown";
  const contextPrefix = context ? `${slugify(context)}-` : "";

  if (ingredient.id) {
    // Always include index to handle cases where same ingredient (same ID) is used multiple times
    return `${contextPrefix}${type}-${String(ingredient.id)}-${index}`;
  }

  // Fallback for items without stable ID
  const tempKey = ingredient.name ? slugify(ingredient.name) : "unknown";

  return `${contextPrefix}${type}-temp-${tempKey}-${index}`;
}

/**
 * Generates a unique key for any list item with optional context
 *
 * @param item - Object with id and optional name properties
 * @param index - Array index (always included for uniqueness)
 * @param context - Context string for discriminating same item in different roles
 * @returns Deterministic composite key, unique even when same item appears multiple times
 */
export function generateListItemKey(
  item: { id?: string; name?: string },
  index: number,
  context?: string
): string {
  const contextPrefix = context ? `${slugify(context)}-` : "";

  if (item.id) {
    // Always include index to handle cases where same item (same ID) appears multiple times
    return `${contextPrefix}${String(item.id)}-${index}`;
  }

  // Fallback for items without stable ID
  const tempKey = item.name ? slugify(item.name) : "unknown";
  return `${contextPrefix}temp-${tempKey}-${index}`;
}

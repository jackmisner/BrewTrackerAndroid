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
 * Generate a key for React ingredient items, preferring stable identifiers and only falling back to index when necessary
 *
 * @param ingredient - The recipe ingredient
 * @param index - Array index (used as fallback when no stable identifier exists)
 * @param context - Context string for discriminating same ingredient in different roles
 * @param dedupeKey - Optional stable per-instance identifier to prevent remounts on reorder
 * @returns Deterministic composite key that remains stable during reordering when possible
 */
export function generateIngredientKey(
  ingredient: RecipeIngredient,
  index: number,
  context?: string,
  dedupeKey?: string | number
): string {
  const type = ingredient.type || "unknown";
  const slugifiedContext = context ? slugify(context) : "";
  const contextPrefix = slugifiedContext ? `${slugifiedContext}-` : "";

  // Prefer dedupeKey when provided (most stable)
  if (dedupeKey !== undefined && dedupeKey !== null) {
    return `${contextPrefix}${type}-${String(dedupeKey)}`;
  }

  // Then prefer ingredient.id if present
  if (ingredient.id) {
    return `${contextPrefix}${type}-${String(ingredient.id)}`;
  }

  // Then use ingredient.name if present
  if (ingredient.name) {
    return `${contextPrefix}${type}-name-${slugify(ingredient.name)}`;
  }

  // Only fall back to index when no stable identifier exists
  return `${contextPrefix}${type}-index-${index}`;
}

/**
 * Generate a key for React list items, preferring stable identifiers and only falling back to index when necessary
 * @param item - Item with potential id/name fields
 * @param index - Array index (used as fallback when no stable identifier exists)
 * @param context - Context string for discriminating same item in different roles
 * @param dedupeKey - Optional stable per-instance identifier to prevent remounts on reorder
 * @returns Deterministic composite key that remains stable during reordering when possible
 */
export function generateListItemKey(
  item: { id?: string; name?: string },
  index: number,
  context?: string,
  dedupeKey?: string | number
): string {
  const slugifiedContext = context ? slugify(context) : "";
  const contextPrefix = slugifiedContext ? `${slugifiedContext}-` : "";

  // Prefer dedupeKey when provided (most stable)
  if (dedupeKey !== undefined && dedupeKey !== null) {
    return `${contextPrefix}${String(dedupeKey)}`;
  }

  // Then prefer item.id if present
  if (item.id) {
    return `${contextPrefix}${String(item.id)}`;
  }

  // Then use item.name if present
  if (item.name) {
    return `${contextPrefix}name-${slugify(item.name)}`;
  }

  // Only fall back to index when no stable identifier exists
  return `${contextPrefix}index-${index}`;
}

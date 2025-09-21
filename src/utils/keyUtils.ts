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
 * Generate a stable, unique key for React ingredient items
 *
 * Uses format: {type}-{ingredientId}-{instanceId}
 * - type: ingredient type (hop, grain, yeast, other)
 * - ingredientId: database ingredient ID
 * - instanceId: unique instance identifier that never changes
 *
 * @param ingredient - The recipe ingredient (will have instance_id generated if missing)
 * @returns Stable unique key that never changes once generated
 */
export function generateIngredientKey(ingredient: RecipeIngredient): string {
  const type = ingredient.type || "unknown";
  const ingredientId =
    ingredient.id != null ? String(ingredient.id) : "unknown";

  let instanceId = ingredient.instance_id;
  if (!instanceId) {
    instanceId = generateIngredientInstanceId();
    // Persist so future renders reuse the same key

    ingredient.instance_id = instanceId;
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `Ingredient missing instance_id; generated one: ${ingredient.name}`
      );
    }
  }
  return `${type}-${ingredientId}-${instanceId}`;
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
  if (item.id != null) {
    return `${contextPrefix}${String(item.id)}`;
  }

  // Then use item.name if present
  if (item.name != null && item.name !== "") {
    return `${contextPrefix}name-${slugify(item.name)}`;
  }

  // Only fall back to index when no stable identifier exists
  return `${contextPrefix}index-${index}`;
}

// Global counter to prevent collisions during rapid ID generation
let globalCounter = 0;

/**
 * Generates a unique identifier that prevents collisions even during rapid creation
 * Uses crypto.randomUUID() when available, falls back to timestamp + counter + random
 */
export const generateUniqueId = (prefix?: string): string => {
  globalCounter += 1;

  // Use crypto.randomUUID() when available (most secure and unique)
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    const uuid = globalThis.crypto.randomUUID();
    return prefix ? `${prefix}_${uuid}` : uuid;
  }

  // Fallback to timestamp + counter + random for maximum collision resistance
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const id = `${timestamp}_${globalCounter}_${random}`;

  return prefix ? `${prefix}_${id}` : id;
};

/**
 * Generates a unique instance ID specifically for recipe ingredients
 */
export const generateIngredientInstanceId = (): string => {
  return generateUniqueId("ing");
};

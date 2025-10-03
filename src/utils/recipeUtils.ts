/**
 * Recipe Utilities for BrewTracker Android
 *
 * Shared utility functions for recipe-related operations.
 */

import { RecipeIngredient } from "@src/types/recipe";
import { CreateDryHopFromRecipeRequest } from "@src/types/brewSession";
import { convertMinutesToDays } from "@utils/timeUtils";

/**
 * Checks if a recipe ID is a temporary ID (used for offline-created recipes)
 *
 * @param id - The recipe ID to check (can be undefined/null)
 * @returns True if the ID is a temporary ID, false otherwise
 */
export function isTempId(id: string | null | undefined): boolean {
  return Boolean(id?.startsWith("temp_"));
}

/**
 * Normalizes hop use string to handle various formats
 * Handles: "dry_hop", "dry-hop", "dryHop", "DryHop", "dry hop", etc.
 *
 * @param use - The hop use string to normalize
 * @returns Normalized lowercase string with underscores (e.g., "dry_hop")
 */
function normalizeHopUse(use: string | undefined): string {
  if (!use) {
    return "";
  }

  // Convert to lowercase and replace all non-alphanumeric chars with underscore
  return use.toLowerCase().replace(/[\s-]/g, "_");
}

/**
 * Checks if an ingredient is a dry-hop addition
 * Handles various formats: "dry_hop", "dry-hop", "dryHop", "DryHop", "dry hop", etc.
 *
 * @param ingredient - The recipe ingredient to check
 * @returns True if the ingredient is a hop with dry-hop use, false otherwise
 */
export function isDryHopIngredient(ingredient: RecipeIngredient): boolean {
  return (
    ingredient.type === "hop" && normalizeHopUse(ingredient.use) === "dry_hop"
  );
}

/**
 * Filters and transforms recipe ingredients into dry-hop addition requests
 *
 * @param ingredients - Array of recipe ingredients
 * @returns Array of dry-hop requests ready to be added to a brew session
 */
export function getDryHopsFromRecipe(
  ingredients: RecipeIngredient[]
): CreateDryHopFromRecipeRequest[] {
  return ingredients.filter(isDryHopIngredient).map(ingredient => ({
    hop_name: ingredient.name,
    hop_type: ingredient.hop_type,
    amount: ingredient.amount,
    amount_unit: ingredient.unit,
    duration_days: ingredient.time
      ? convertMinutesToDays(ingredient.time)
      : undefined, // Convert from minutes (storage) to days (dry-hop duration)
    phase: "primary", // Default to primary fermentation
    recipe_instance_id: ingredient.instance_id, // Preserve unique instance ID for handling duplicate hops
  }));
}

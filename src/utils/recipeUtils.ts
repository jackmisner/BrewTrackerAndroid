/**
 * Recipe Utilities for BrewTracker Android
 *
 * Shared utility functions for recipe-related operations.
 */

/**
 * Checks if a recipe ID is a temporary ID (used for offline-created recipes)
 *
 * @param id - The recipe ID to check (can be undefined/null)
 * @returns True if the ID is a temporary ID, false otherwise
 */
export function isTempId(id: string | null | undefined): boolean {
  return Boolean(id?.startsWith("temp_"));
}

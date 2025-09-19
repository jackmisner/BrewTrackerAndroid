/**
 * Shared types for offline recipe services
 */

import { Recipe, CreateRecipeRequest, UpdateRecipeRequest } from "@src/types";

// Offline-specific types
export interface OfflineRecipe extends Recipe {
  // Offline-specific metadata
  isOffline?: boolean;
  tempId?: string;
  lastModified: number;
  syncStatus: "pending" | "synced" | "conflict" | "failed";
  needsSync?: boolean; // Flag indicating recipe has been modified and needs sync
  isDeleted?: boolean; // Flag indicating recipe is deleted (tombstone)
  deletedAt?: number; // Timestamp when recipe was deleted
  originalData?: Recipe; // For conflict resolution
}

export interface OfflinePendingOperation {
  id: string;
  type: "create" | "update" | "delete";
  recipeId: string;
  data?: CreateRecipeRequest | UpdateRecipeRequest;
  timestamp: number;
  retryCount: number;
}

export interface OfflineRecipeState {
  recipes: OfflineRecipe[];
  pendingOperations: OfflinePendingOperation[];
  lastSync: number;
  version: number;
}

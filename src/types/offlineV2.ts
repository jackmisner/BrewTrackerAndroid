/**
 * Types for BrewTracker Offline V2 Architecture
 *
 * Clean, version-based offline system with separation between:
 * - Static data (ingredients, beer styles) - permanent cache with version updates
 * - User data (recipes, brew sessions) - sync-enabled cache with conflict resolution
 */

// ============================================================================
// Static Data Types (Ingredients & Beer Styles)
// ============================================================================

/**
 * Database ingredient type (from API responses)
 */
export interface Ingredient {
  id: string;
  name: string;
  type: "grain" | "hop" | "yeast" | "other";
  description?: string;

  // Grain-specific
  potential?: number;
  color?: number;
  grain_type?: string;

  // Hop-specific
  alpha_acid?: number;
  hop_type?: string;

  // Yeast-specific
  attenuation?: number;
  yeast_type?: string;

  // For UI/picker usage
  suggested_unit?: string;
  amount?: number;
  unit?: string;
}

/**
 * Beer style type (from API responses)
 */
export interface BeerStyle {
  id: string;
  style_id: string;
  name: string;
  category: string;
  description?: string;

  // Style guidelines
  og_min?: number;
  og_max?: number;
  fg_min?: number;
  fg_max?: number;
  abv_min?: number;
  abv_max?: number;
  ibu_min?: number;
  ibu_max?: number;
  srm_min?: number;
  srm_max?: number;
}

export interface StaticDataVersion {
  version: string;
  last_modified: string;
  total_records: number;
  data_type: "ingredients" | "beer_styles";
}

export interface StaticDataVersionResponse {
  version: string;
  last_modified: string;
  total_records: number;
}

export interface CachedStaticData<T> {
  data: T[];
  version: string;
  cached_at: number;
  expires_never: true; // Only updates when version changes
}

export interface StaticDataCacheStats {
  ingredients: {
    cached: boolean;
    version: string | null;
    record_count: number;
    last_updated: number | null;
  };
  beerStyles: {
    cached: boolean;
    version: string | null;
    record_count: number;
    last_updated: number | null;
  };
}

export interface VersionCheckResult {
  ingredients: boolean; // true if update needed
  beerStyles: boolean; // true if update needed
}

// ============================================================================
// User Data Types (Recipes, Brew Sessions, etc.)
// ============================================================================

export interface SyncableItem<T> {
  id: string;
  data: T;
  lastModified: number;
  syncStatus: "pending" | "synced" | "conflict" | "failed";
  isDeleted?: boolean;
  deletedAt?: number;
  tempId?: string; // For offline-created items
  needsSync: boolean;
}

export interface PendingOperation {
  id: string;
  type: "create" | "update" | "delete";
  entityType:
    | "recipe"
    | "brew_session"
    | "fermentation_entry"
    | "dry_hop_addition";
  entityId: string;
  parentId?: string; // For embedded documents: parent brew session ID
  entryIndex?: number; // For update/delete operations on embedded documents (array index)
  userId?: string;
  data?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  conflicts: number;
  errors: string[];
}

export interface ConflictResolution {
  strategy: "local_wins" | "remote_wins" | "manual";
  resolvedData?: any;
}

// ============================================================================
// Service Configuration
// ============================================================================

export interface OfflineConfig {
  staticData: {
    versionCheckInterval: number; // ms between version checks
    maxRetries: number;
    retryDelay: number;
  };
  userData: {
    syncInterval: number; // ms between sync attempts
    maxRetries: number;
    retryBackoff: number;
    conflictResolution: "local_wins" | "remote_wins";
  };
  storage: {
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
  };
}

// ============================================================================
// Storage Keys
// ============================================================================

export const STORAGE_KEYS_V2 = {
  // Static data with versioning
  INGREDIENTS_DATA: "static_ingredients_v2",
  INGREDIENTS_VERSION: "static_ingredients_version_v2",
  BEER_STYLES_DATA: "static_beer_styles_v2",
  BEER_STYLES_VERSION: "static_beer_styles_version_v2",

  // User data with sync
  USER_RECIPES: "user_recipes_v2",
  USER_BREW_SESSIONS: "user_brew_sessions_v2",
  USER_FERMENTATION_ENTRIES: "user_fermentation_entries_v2",

  // Sync management
  PENDING_OPERATIONS: "pending_operations_v2",
  SYNC_METADATA: "sync_metadata_v2",
  CONFLICT_QUEUE: "conflict_queue_v2",

  // Configuration
  OFFLINE_CONFIG: "offline_config_v2",
  CACHE_STATS: "cache_stats_v2",
} as const;

// ============================================================================
// Error Types
// ============================================================================

export class OfflineError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = "OfflineError";
  }
}

export class SyncError extends OfflineError {
  constructor(
    message: string,
    public operation: PendingOperation
  ) {
    super(message, "SYNC_ERROR", true);
    this.name = "SyncError";
  }
}

export class VersionError extends OfflineError {
  constructor(
    message: string,
    public dataType: string
  ) {
    super(message, "VERSION_ERROR", true);
    this.name = "VersionError";
  }
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseStaticDataReturn<T> {
  data: T[] | null;
  isLoading: boolean;
  error: string | null;
  isStale: boolean;
  lastUpdated: number | null;
  refresh: () => Promise<void>;
  stats: StaticDataCacheStats[keyof StaticDataCacheStats];
}

export interface UseUserDataReturn<T> {
  data: T[] | null;
  isLoading: boolean;
  error: string | null;
  pendingCount: number;
  conflictCount: number;
  lastSync: number | null;
  create: (item: Partial<T>) => Promise<T>;
  update: (id: string, updates: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<void>;
  clone: (id: string) => Promise<T>;
  getById: (id: string) => Promise<T | null>;
  sync: () => Promise<SyncResult>;
  refresh: () => Promise<void>;
  // Optional brew session-specific methods
  addFermentationEntry?: (
    sessionId: string,
    entry: Partial<import("./brewSession").FermentationEntry>
  ) => Promise<import("./brewSession").BrewSession>;
  updateFermentationEntry?: (
    sessionId: string,
    entryIndex: number,
    updates: Partial<import("./brewSession").FermentationEntry>
  ) => Promise<import("./brewSession").BrewSession>;
  deleteFermentationEntry?: (
    sessionId: string,
    entryIndex: number
  ) => Promise<import("./brewSession").BrewSession>;
  addDryHopFromRecipe?: (
    sessionId: string,
    dryHopData: import("./brewSession").CreateDryHopFromRecipeRequest
  ) => Promise<import("./brewSession").BrewSession>;
  removeDryHop?: (
    sessionId: string,
    dryHopIndex: number
  ) => Promise<import("./brewSession").BrewSession>;
  deleteDryHopAddition?: (
    sessionId: string,
    dryHopIndex: number
  ) => Promise<import("./brewSession").BrewSession>;
}

export interface UseOfflineSyncReturn {
  isSyncing: boolean;
  pendingOperations: number;
  conflicts: number;
  lastSync: number | null;
  sync: () => Promise<SyncResult>;
  clearPending: () => Promise<void>;
  resolveConflict: (
    id: string,
    resolution: ConflictResolution
  ) => Promise<void>;
}

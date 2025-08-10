/**
 * ID Normalization Utilities
 *
 * Handles the inconsistent ID field naming across backend responses:
 * - Backend returns: recipe_id, ingredient_id, session_id, user_id
 * - Frontend expects: id (consistent across all entities)
 *
 * This utility provides automatic transformation between backend and frontend formats.
 */

import { ID } from "@src/types/common";

// Entity types that need ID normalization
export type EntityType =
  | "recipe"
  | "ingredient"
  | "brewSession"
  | "user"
  | "fermentationEntry"
  | "style";

// Mapping of entity types to their backend ID field names
export const BACKEND_ID_FIELD_MAPPING: Record<EntityType, string> = {
  recipe: "recipe_id",
  ingredient: "ingredient_id",
  brewSession: "session_id",
  user: "user_id",
  fermentationEntry: "entry_id",
  style: "style_guide_id",
};

// Reverse mapping for denormalization (backend-field → entity-type)
export const FRONTEND_TO_BACKEND_MAPPING = Object.fromEntries(
  Object.entries(BACKEND_ID_FIELD_MAPPING).map(([entityType, backendField]) => [
    backendField,
    entityType,
  ])
) as Record<string, EntityType>;

/**
 * Extract ID from entity regardless of field name format
 */
export function extractEntityId(
  entity: any,
  entityType: EntityType
): ID | null {
  if (!entity || typeof entity !== "object") {
    return null;
  }

  const backendIdField = BACKEND_ID_FIELD_MAPPING[entityType];

  // Try multiple ID field possibilities
  const candidates = [entity[backendIdField], entity.id, entity._id];
  return candidates.find(v => v !== undefined && v !== null) ?? null;
}

/**
 * Normalize a single entity by converting backend ID field to generic 'id'
 */
export function normalizeEntityId<T extends Record<string, any>>(
  entity: T,
  entityType: EntityType,
  preserveOriginalId: boolean = false
): T & { id: ID } {
  if (!entity || typeof entity !== "object") {
    throw new Error(
      `Invalid entity provided for normalization: ${typeof entity}`
    );
  }

  const normalizedId = extractEntityId(entity, entityType);

  if (!normalizedId) {
    console.warn(`No valid ID found for ${entityType} entity:`, entity);
    throw new Error(`No valid ID found for ${entityType} entity`);
  }

  const normalized = {
    ...entity,
    id: normalizedId as ID,
  } as T & { id: ID };

  // Optionally remove the original backend ID field to avoid confusion
  if (!preserveOriginalId) {
    const backendIdField = BACKEND_ID_FIELD_MAPPING[entityType];
    delete (normalized as any)[backendIdField];
  }

  return normalized;
}

/**
 * Normalize an array of entities
 */
export function normalizeEntityIds<T extends Record<string, any>>(
  entities: T[],
  entityType: EntityType,
  preserveOriginalId: boolean = false
): Array<T & { id: ID }> {
  if (!Array.isArray(entities)) {
    console.error("normalizeEntityIds received non-array:", entities);
    return [];
  }

  return entities.map(entity =>
    normalizeEntityId(entity, entityType, preserveOriginalId)
  );
}

/**
 * Convert frontend entity back to backend format (for API submissions)
 */
export function denormalizeEntityId<T extends Record<string, any> & { id: ID }>(
  entity: T,
  entityType: EntityType
): Omit<T, "id"> & Record<string, any> {
  const backendIdField = BACKEND_ID_FIELD_MAPPING[entityType];

  const denormalized = {
    ...entity,
    [backendIdField]: entity.id,
  };

  // Remove generic 'id' field for backend
  delete (denormalized as any).id;

  return denormalized;
}

/**
 * Detect entity type from API endpoint URL
 */
export function detectEntityTypeFromUrl(url: string): EntityType | null {
  const normalizedUrl = url.toLowerCase();

  // Endpoint patterns to entity type mapping
  const patterns: Array<{ pattern: RegExp; entityType: EntityType }> = [
    // Specific sub-resources first
    { pattern: /\/fermentation(\/|\?|$)/i, entityType: "fermentationEntry" },
    // Then general resources - allow query parameters
    { pattern: /\/recipes(\/|\?|$)/i, entityType: "recipe" },
    { pattern: /\/ingredients(\/|\?|$)/i, entityType: "ingredient" },
    { pattern: /\/brew-sessions(\/|\?|$)/i, entityType: "brewSession" },
    { pattern: /\/users(\/|\?|$)/i, entityType: "user" },
    { pattern: /\/styles(\/|\?|$)/i, entityType: "style" },
  ];

  // Check patterns in order (most specific first)
  for (const { pattern, entityType } of patterns) {
    if (pattern.test(normalizedUrl)) {
      return entityType;
    }
  }

  return null;
}

/**
 * Smart normalization that handles various response formats
 */
export function normalizeResponseData(data: any, entityType: EntityType): any {
  if (!data) {
    return data;
  }

  // Handle direct array response
  if (Array.isArray(data)) {
    return normalizeEntityIds(data, entityType);
  }

  // Handle wrapped array response (e.g., { ingredients: [...], unit_system: "..." })
  if (data.ingredients && Array.isArray(data.ingredients)) {
    return {
      ...data,
      ingredients: normalizeEntityIds(data.ingredients, "ingredient"),
    };
  }

  // Handle wrapped recipe response (e.g., { recipes: [...], total: 10, page: 1 })
  if (data.recipes && Array.isArray(data.recipes)) {
    return {
      ...data,
      recipes: normalizeEntityIds(data.recipes, "recipe"),
    };
  }

  // Handle wrapped brew sessions response (e.g., { brew_sessions: [...], total: 5, page: 1 })
  if (data.brew_sessions && Array.isArray(data.brew_sessions)) {
    return {
      ...data,
      brew_sessions: normalizeEntityIds(data.brew_sessions, "brewSession"),
    };
  }

  // Handle wrapped response with data field
  if (data.data && Array.isArray(data.data)) {
    return {
      ...data,
      data: normalizeEntityIds(data.data, entityType),
    };
  }

  // Handle single entity response
  if (typeof data === "object" && !Array.isArray(data)) {
    // Check if it looks like an entity (has ID-like fields)
    const hasIdField = extractEntityId(data, entityType);
    if (hasIdField) {
      return normalizeEntityId(data, entityType);
    }
  }

  // Return unchanged if no normalization needed
  return data;
}

/**
 * Debug utility to log ID fields in an entity
 */
export function debugEntityIds(entity: any, label: string = "Entity"): void {
  if (!entity || typeof entity !== "object") {
    return;
  }

  const idFields = Object.keys(entity).filter(
    key => key.includes("id") || key.includes("Id") || key === "_id"
  );

  const idValues = idFields.reduce(
    (acc, field) => {
      acc[field] = entity[field];
      return acc;
    },
    {} as Record<string, any>
  );
}
/**
 * Detect entity type based on object properties instead of unreliable URL field
 */
function detectEntityTypeFromProperties(obj: any): EntityType | null {
  if (!obj || typeof obj !== "object") return null;

  // Check for specific backend ID field patterns
  if (
    "recipe_id" in obj ||
    ("name" in obj && "ingredients" in obj && "style" in obj)
  ) {
    return "recipe";
  }
  if (
    "ingredient_id" in obj ||
    ("name" in obj &&
      "type" in obj &&
      ("alpha_acid" in obj || "color" in obj || "potential" in obj))
  ) {
    return "ingredient";
  }
  if ("session_id" in obj || ("brew_date" in obj && "recipe" in obj)) {
    return "brewSession";
  }
  if ("user_id" in obj || ("email" in obj && "username" in obj)) {
    return "user";
  }
  if (
    "entry_id" in obj ||
    ("temperature" in obj && "gravity" in obj && "date" in obj)
  ) {
    return "fermentationEntry";
  }

  return null;
}

export function denormalizeEntityIdDeep(
  data: any,
  rootEntityType: EntityType,
  visited: WeakSet<object> = new WeakSet(),
  depth: number = 0
): any {
  // Prevent stack overflow with recursion depth limit
  const MAX_DEPTH = 50;
  if (depth > MAX_DEPTH) {
    console.warn("denormalizeEntityIdDeep: Maximum recursion depth exceeded");
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(d =>
      denormalizeEntityIdDeep(d, rootEntityType, visited, depth + 1)
    );
  }

  if (data && typeof data === "object") {
    // Prevent infinite recursion with circular reference detection
    if (visited.has(data)) {
      console.warn(
        "denormalizeEntityIdDeep: Circular reference detected, skipping object"
      );
      return data;
    }
    visited.add(data);

    let copy: any = { ...data };

    // Use property-based entity type detection instead of unreliable URL field
    const detected = detectEntityTypeFromProperties(copy) || rootEntityType;

    if ("id" in copy) {
      copy = denormalizeEntityId(copy, detected);
    }

    for (const k of Object.keys(copy)) {
      copy[k] = denormalizeEntityIdDeep(
        copy[k],
        rootEntityType,
        visited,
        depth + 1
      );
    }

    // Remove from visited set after processing to allow the object to be processed again in different branches
    visited.delete(data);
    return copy;
  }

  return data;
}

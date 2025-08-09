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
  const candidates = [
    entity[backendIdField],
    entity.id,
    entity._id,
  ];
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
    { pattern: /\/recipes/i, entityType: "recipe" },
    { pattern: /\/ingredients/i, entityType: "ingredient" },
    { pattern: /\/brew-sessions/i, entityType: "brewSession" },
    { pattern: /\/users/i, entityType: "user" },
    { pattern: /\/fermentation/i, entityType: "fermentationEntry" },
    { pattern: /\/styles/i, entityType: "style" },
  ];

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

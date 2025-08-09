/**
 * API ID Interceptor
 *
 * Automatically normalizes ID fields in API responses and requests
 * to solve backend/frontend ID inconsistency issues.
 *
 * Response Interceptor: Converts backend IDs (recipe_id, ingredient_id, etc.) → generic 'id'
 * Request Interceptor: Converts frontend IDs (id) → backend format (recipe_id, ingredient_id, etc.)
 */

import {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  detectEntityTypeFromUrl,
  normalizeResponseData,
  denormalizeEntityId,
  EntityType,
  debugEntityIds,
} from "@utils/idNormalization";

/**
 * Setup API interceptors for automatic ID normalization
 */
export function setupIDInterceptors(apiInstance: AxiosInstance): void {
  // Response interceptor - normalize backend IDs to frontend format
  apiInstance.interceptors.response.use(
    (response: AxiosResponse) => {
      const entityType = detectEntityTypeFromUrl(response.config.url || "");

      if (entityType) {
        // Debug original response (only log first item to avoid spam)
        if (response.data) {
          if (Array.isArray(response.data) && response.data.length > 0) {
            debugEntityIds(
              response.data[0],
              `Original ${entityType} (first item)`
            );
          } else if (
            response.data.data &&
            Array.isArray(response.data.data) &&
            response.data.data.length > 0
          ) {
            debugEntityIds(
              response.data.data[0],
              `Original ${entityType} (first item)`
            );
          } else if (
            response.data.ingredients &&
            Array.isArray(response.data.ingredients) &&
            response.data.ingredients.length > 0
          ) {
            debugEntityIds(
              response.data.ingredients[0],
              `Original ingredient (first item)`
            );
          } else if (
            typeof response.data === "object" &&
            !Array.isArray(response.data)
          ) {
            debugEntityIds(response.data, `Original ${entityType}`);
          }
        }

        try {
          const originalData = response.data;
          response.data = normalizeResponseData(response.data, entityType);

          // Debug normalized response (only log first item to avoid spam)
          if (response.data !== originalData) {
            if (Array.isArray(response.data) && response.data.length > 0) {
              debugEntityIds(
                response.data[0],
                `Normalized ${entityType} (first item)`
              );
            } else if (
              response.data.data &&
              Array.isArray(response.data.data) &&
              response.data.data.length > 0
            ) {
              debugEntityIds(
                response.data.data[0],
                `Normalized ${entityType} (first item)`
              );
            } else if (
              response.data.ingredients &&
              Array.isArray(response.data.ingredients) &&
              response.data.ingredients.length > 0
            ) {
              debugEntityIds(
                response.data.ingredients[0],
                `Normalized ingredient (first item)`
              );
            } else if (
              typeof response.data === "object" &&
              !Array.isArray(response.data)
            ) {
              debugEntityIds(response.data, `Normalized ${entityType}`);
            }
          }
        } catch (error) {
          console.error("❌ ID Interceptor - Response normalization failed:", {
            error: error instanceof Error ? error.message : String(error),
            url: response.config.url,
            entityType,
          });
          // Don't break the response if normalization fails
        }
      }

      return response;
    },
    error => {
      return Promise.reject(error);
    }
  );

  // Request interceptor - convert frontend IDs to backend format
  apiInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const entityType = detectEntityTypeFromUrl(config.url || "");

      if (
        entityType &&
        config.data &&
        typeof config.data === "object" &&
        config.data.id
      ) {
        try {
          debugEntityIds(config.data, `Original request data (${entityType})`);

          config.data = denormalizeEntityId(config.data, entityType);

          debugEntityIds(
            config.data,
            `Denormalized request data (${entityType})`
          );
        } catch (error) {
          console.error("❌ ID Interceptor - Request denormalization failed:", {
            error: error instanceof Error ? error.message : String(error),
            url: config.url,
            entityType,
          });
          // Don't break the request if denormalization fails
        }
      }

      return config;
    },
    error => {
      return Promise.reject(error);
    }
  );
}

/**
 * Remove ID interceptors (for testing or debugging)
 */
export function removeIDInterceptors(apiInstance: AxiosInstance): void {
  // Clear interceptors
  apiInstance.interceptors.request.clear();
  apiInstance.interceptors.response.clear();
}

/**
 * Get interceptor status information
 */
export function getInterceptorStatus(apiInstance: AxiosInstance): {
  requestInterceptors: boolean;
  responseInterceptors: boolean;
} {
  return {
    requestInterceptors: !!(apiInstance.interceptors.request as any).handlers
      ?.length,
    responseInterceptors: !!(apiInstance.interceptors.response as any).handlers
      ?.length,
  };
}

/**
 * User Validation Utilities for BrewTracker Android
 *
 * Provides secure user ID validation and ownership verification utilities.
 * These functions provide client-side security checks to complement server-side validation.
 *
 * Features:
 * - Current user ID extraction with error handling
 * - Resource ownership validation
 * - Combined client/server-side validation for enhanced security
 * - Type-safe user validation patterns
 *
 * Security Note: These are client-side checks for UX and basic security.
 * Server-side validation is still required for actual security.
 *
 * @example
 * ```typescript
 * const canEdit = await validateUserOwnership(recipe.user_id);
 * const isOwner = await isCurrentUserOwner(brewSession);
 * ```
 */

import { useAuth } from "@contexts/AuthContext";

/**
 * Resource interface for ownership validation
 * Any resource that has a user_id field can be validated
 */
export interface OwnedResource {
  user_id: string | null;
}

/**
 * Result of user validation operation
 */
export interface UserValidationResult {
  isValid: boolean;
  currentUserId: string | null;
  error?: string;
}

/**
 * Hook version of user ID validation - use within React components
 */
export function useUserValidation() {
  const { getUserId } = useAuth();

  /**
   * Get current user ID safely within component context
   */
  const getCurrentUserId = async (): Promise<string | null> => {
    try {
      return await getUserId();
    } catch (error) {
      console.warn("Failed to get current user ID:", error);
      return null;
    }
  };

  /**
   * Validate if current user owns a specific resource
   *
   * @param resourceUserId - The user_id of the resource to validate
   * @returns Promise resolving to validation result
   */
  const validateUserOwnership = async (
    resourceUserId: string
  ): Promise<UserValidationResult> => {
    try {
      const currentUserId = await getCurrentUserId();

      if (!currentUserId) {
        return {
          isValid: false,
          currentUserId: null,
          error: "User not authenticated",
        };
      }

      if (!resourceUserId) {
        return {
          isValid: false,
          currentUserId,
          error: "Resource has no user ID",
        };
      }

      const isValid = currentUserId === resourceUserId;
      return {
        isValid,
        currentUserId,
        error: isValid ? undefined : "User does not own this resource",
      };
    } catch (error) {
      return {
        isValid: false,
        currentUserId: null,
        error: `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  };

  /**
   * Check if current user owns a resource (simplified boolean version)
   *
   * @param resource - Resource with user_id field
   * @returns Promise resolving to true if user owns resource, false otherwise
   */
  const isCurrentUserOwner = async (
    resource: OwnedResource
  ): Promise<boolean> => {
    if (!resource.user_id) {
      return false;
    }
    const result = await validateUserOwnership(resource.user_id);
    return result.isValid;
  };

  /**
   * Enhanced ownership validation that combines client-side and server-side flags
   * Provides defense-in-depth by checking both JWT user ID and server is_owner flag
   *
   * @param resource - Resource with user_id and optional is_owner flag
   * @returns Promise resolving to comprehensive validation result
   */
  const validateEnhancedOwnership = async (
    resource: OwnedResource & { is_owner?: boolean }
  ): Promise<UserValidationResult & { serverOwnership?: boolean }> => {
    const clientValidation = resource.user_id
      ? await validateUserOwnership(resource.user_id)
      : { isValid: false, error: "No user ID provided", currentUserId: null };
    const serverOwnership = resource.is_owner ?? undefined;

    // If both client and server agree on ownership, return positive result
    if (clientValidation.isValid && serverOwnership === true) {
      return {
        ...clientValidation,
        serverOwnership,
      };
    }

    // If client validation fails, return failure regardless of server flag
    if (!clientValidation.isValid) {
      return {
        ...clientValidation,
        serverOwnership,
        error:
          clientValidation.error || "Client-side ownership validation failed",
      };
    }

    if (clientValidation.isValid && serverOwnership === false) {
      console.warn("Ownership validation mismatch: client=true, server=false", {
        resourceUserId: resource.user_id,
        currentUserId: clientValidation.currentUserId,
      });
      // Pessimistic default: deny when server explicitly denies ownership
      return {
        isValid: false,
        currentUserId: clientValidation.currentUserId,
        serverOwnership,
        error: "Ownership validation mismatch - server denies ownership",
      };
    }

    // Client says yes, server is undefined - proceed with client validation
    return {
      ...clientValidation,
      serverOwnership,
    };
  };

  /**
   * Quick check for UI elements - determines if user can perform actions
   *
   * @param resource - Resource to check ownership for
   * @returns Promise resolving to true if user should be able to perform actions
   */
  const canUserModifyResource = async (
    resource: OwnedResource & { is_owner?: boolean }
  ): Promise<boolean> => {
    const validation = await validateEnhancedOwnership(resource);
    return validation.isValid && validation.serverOwnership !== false;
  };

  return {
    getCurrentUserId,
    validateUserOwnership,
    isCurrentUserOwner,
    validateEnhancedOwnership,
    canUserModifyResource,
  };
}

/**
 * Service-level user validation (non-hook version)
 * Use this in services that don't have access to React context
 */
export class UserValidationService {
  /**
   * Validate user ownership using JWT token directly (for services)
   *
   * @param resourceUserId - The user_id to validate against
   * @returns Promise resolving to validation result
   */
  static async validateOwnershipFromToken(
    resourceUserId: string
  ): Promise<UserValidationResult> {
    try {
      // Import JWT utils dynamically to avoid circular dependencies
      const { extractUserIdFromJWT } = await import("@utils/jwtUtils");
      const ApiService = (await import("@services/api/apiService")).default;

      const token = await ApiService.token.getToken();
      if (!token) {
        return {
          isValid: false,
          currentUserId: null,
          error: "No authentication token found",
        };
      }

      const currentUserId = extractUserIdFromJWT(token);
      if (!currentUserId) {
        return {
          isValid: false,
          currentUserId: null,
          error: "Invalid authentication token",
        };
      }

      const isValid = currentUserId === resourceUserId;
      return {
        isValid,
        currentUserId,
        error: isValid ? undefined : "User does not own this resource",
      };
    } catch (error) {
      return {
        isValid: false,
        currentUserId: null,
        error: `Token validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get current user ID from token (for services)
   */
  static async getCurrentUserIdFromToken(): Promise<string | null> {
    try {
      const { extractUserIdFromJWT } = await import("@utils/jwtUtils");
      const ApiService = (await import("@services/api/apiService")).default;

      const token = await ApiService.token.getToken();
      if (!token) {
        return null;
      }

      return extractUserIdFromJWT(token);
    } catch (error) {
      console.warn("Failed to get user ID from token:", error);
      return null;
    }
  }
}

export default UserValidationService;

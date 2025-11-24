/**
 * PermissionService
 *
 * Determines what actions users can perform based on their authentication status.
 * Implements simplified three-state permission model:
 * - authenticated: Full offline CRUD access
 * - expired: Read-only mode (view recipes, use calculators, use creation UI but can't save)
 * - unauthenticated: Login required
 */

export type AuthStatus =
  | "authenticated" // Valid token - Full access with offline CRUD
  | "expired" // Expired token - Read-only (view + calculators, but no saves)
  | "unauthenticated"; // No token - Login required

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  requiresAuth?: boolean;
}

export class PermissionService {
  /**
   * Check if user can view their cached recipes
   * Allowed for: authenticated, expired
   * Denied for: unauthenticated
   */
  static canViewRecipes(status: AuthStatus): PermissionCheck {
    if (status === "unauthenticated") {
      return {
        allowed: false,
        reason: "Please log in to view recipes",
        requiresAuth: true,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if user can access recipe creation UI
   * Allowed for: authenticated, expired (can use UI, but saving requires auth)
   * Denied for: unauthenticated
   * Note: Actual saving is controlled by canSaveRecipe
   */
  static canCreateRecipe(status: AuthStatus): PermissionCheck {
    if (status === "unauthenticated") {
      return {
        allowed: false,
        reason: "Please log in to create recipes",
        requiresAuth: true,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if user can save a new or edited recipe
   * Only allowed for: authenticated
   * Denied for: expired, unauthenticated
   */
  static canSaveRecipe(status: AuthStatus): PermissionCheck {
    if (status === "authenticated") {
      return { allowed: true };
    }

    if (status === "unauthenticated") {
      return {
        allowed: false,
        reason: "Please log in to save recipes",
        requiresAuth: true,
      };
    }

    // expired
    return {
      allowed: false,
      reason: "Session expired. Reconnect to save changes.",
      requiresAuth: true,
    };
  }

  /**
   * Check if user can edit an existing recipe
   * Only allowed for: authenticated
   * Denied for: expired, unauthenticated
   */
  static canEditRecipe(status: AuthStatus): PermissionCheck {
    if (status === "authenticated") {
      return { allowed: true };
    }

    if (status === "unauthenticated") {
      return {
        allowed: false,
        reason: "Please log in to edit recipes",
        requiresAuth: true,
      };
    }

    // expired
    return {
      allowed: false,
      reason: "Session expired. Reconnect to edit recipes.",
      requiresAuth: true,
    };
  }

  /**
   * Check if user can delete a recipe
   * Only allowed for: authenticated
   * Denied for: expired, unauthenticated
   */
  static canDeleteRecipe(status: AuthStatus): PermissionCheck {
    if (status === "authenticated") {
      return { allowed: true };
    }

    if (status === "unauthenticated") {
      return {
        allowed: false,
        reason: "Please log in to delete recipes",
        requiresAuth: true,
      };
    }

    // expired
    return {
      allowed: false,
      reason: "Session expired. Reconnect to delete recipes.",
      requiresAuth: true,
    };
  }

  /**
   * Check if user can use calculators
   * Always allowed - calculators work offline without authentication
   */
  static canUseCalculators(_status: AuthStatus): PermissionCheck {
    return { allowed: true };
  }

  /**
   * Check if user can sync data with backend
   * Only allowed for: authenticated
   * Denied for: expired, unauthenticated
   */
  static canSyncData(status: AuthStatus): PermissionCheck {
    if (status === "authenticated") {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: "Authentication required to sync data",
      requiresAuth: true,
    };
  }

  /**
   * Check if user can view public recipes
   * Only allowed for: authenticated
   * Denied for: expired, unauthenticated
   */
  static canViewPublicRecipes(status: AuthStatus): PermissionCheck {
    if (status === "authenticated") {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: "Authentication required to browse public recipes",
      requiresAuth: true,
    };
  }

  /**
   * Check if user can create brew sessions
   * Only allowed for: authenticated
   * Denied for: expired, unauthenticated
   */
  static canCreateBrewSession(status: AuthStatus): PermissionCheck {
    return this.canSaveRecipe(status); // Same rules as recipe saving
  }

  /**
   * Check if user can edit brew sessions
   * Only allowed for: authenticated
   * Denied for: expired, unauthenticated
   */
  static canEditBrewSession(status: AuthStatus): PermissionCheck {
    return this.canEditRecipe(status); // Same rules as recipe editing
  }

  /**
   * Check if user can delete brew sessions
   * Only allowed for: authenticated
   * Denied for: expired, unauthenticated
   */
  static canDeleteBrewSession(status: AuthStatus): PermissionCheck {
    return this.canDeleteRecipe(status); // Same rules as recipe deletion
  }

  /**
   * Check if user can view brew sessions
   * Allowed for: authenticated, expired
   * Denied for: unauthenticated
   */
  static canViewBrewSessions(status: AuthStatus): PermissionCheck {
    return this.canViewRecipes(status); // Same rules as recipe viewing
  }

  /**
   * Get a summary of all permissions for the given auth status
   * Useful for debugging and displaying user capabilities
   */
  static getPermissionSummary(status: AuthStatus): {
    status: AuthStatus;
    permissions: {
      viewRecipes: boolean;
      createRecipe: boolean;
      saveRecipe: boolean;
      editRecipe: boolean;
      deleteRecipe: boolean;
      useCalculators: boolean;
      syncData: boolean;
      viewPublicRecipes: boolean;
      createBrewSession: boolean;
      editBrewSession: boolean;
      deleteBrewSession: boolean;
      viewBrewSessions: boolean;
    };
  } {
    return {
      status,
      permissions: {
        viewRecipes: this.canViewRecipes(status).allowed,
        createRecipe: this.canCreateRecipe(status).allowed,
        saveRecipe: this.canSaveRecipe(status).allowed,
        editRecipe: this.canEditRecipe(status).allowed,
        deleteRecipe: this.canDeleteRecipe(status).allowed,
        useCalculators: this.canUseCalculators(status).allowed,
        syncData: this.canSyncData(status).allowed,
        viewPublicRecipes: this.canViewPublicRecipes(status).allowed,
        createBrewSession: this.canCreateBrewSession(status).allowed,
        editBrewSession: this.canEditBrewSession(status).allowed,
        deleteBrewSession: this.canDeleteBrewSession(status).allowed,
        viewBrewSessions: this.canViewBrewSessions(status).allowed,
      },
    };
  }

  /**
   * Get user-friendly description of what the user can do in their current state
   */
  static getStatusDescription(status: AuthStatus): string {
    switch (status) {
      case "authenticated":
        return "Full access to all features";

      case "expired":
        return "Read-only mode: You can view recipes and use calculators, but cannot save changes. Reconnect to restore full access.";

      case "unauthenticated":
        return "Please log in to access your recipes and features";

      default:
        return "Unknown authentication status";
    }
  }

  /**
   * Get color theme for the auth status (for UI badges/banners)
   */
  static getStatusColor(
    status: AuthStatus
  ): "success" | "warning" | "error" | "neutral" {
    switch (status) {
      case "authenticated":
        return "success";
      case "expired":
        return "warning";
      case "unauthenticated":
        return "neutral";
      default:
        return "neutral";
    }
  }

  /**
   * Get icon name for the auth status (Material Icons)
   */
  static getStatusIcon(status: AuthStatus): string {
    switch (status) {
      case "authenticated":
        return "check-circle";
      case "expired":
        return "warning";
      case "unauthenticated":
        return "login";
      default:
        return "help";
    }
  }
}

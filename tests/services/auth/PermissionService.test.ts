/**
 * Tests for PermissionService
 *
 * Tests permission checks for all authentication states
 */

import {
  PermissionService,
  type AuthStatus,
} from "@services/auth/PermissionService";

describe("PermissionService", () => {
  describe("canViewRecipes", () => {
    it("should allow authenticated users to view recipes", () => {
      const result = PermissionService.canViewRecipes("authenticated");

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.requiresAuth).toBeUndefined();
    });

    it("should allow expired users to view recipes", () => {
      const result = PermissionService.canViewRecipes("expired");

      expect(result.allowed).toBe(true);
    });

    it("should deny unauthenticated users from viewing recipes", () => {
      const result = PermissionService.canViewRecipes("unauthenticated");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Please log in to view recipes");
      expect(result.requiresAuth).toBe(true);
    });
  });

  describe("canCreateRecipe", () => {
    it("should allow authenticated users to create recipes", () => {
      const result = PermissionService.canCreateRecipe("authenticated");

      expect(result.allowed).toBe(true);
    });

    it("should allow expired users to access creation UI", () => {
      const result = PermissionService.canCreateRecipe("expired");

      expect(result.allowed).toBe(true);
    });

    it("should deny unauthenticated users from creating recipes", () => {
      const result = PermissionService.canCreateRecipe("unauthenticated");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Please log in to create recipes");
      expect(result.requiresAuth).toBe(true);
    });
  });

  describe("canSaveRecipe", () => {
    it("should allow authenticated users to save recipes", () => {
      const result = PermissionService.canSaveRecipe("authenticated");

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should deny expired users from saving recipes", () => {
      const result = PermissionService.canSaveRecipe("expired");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Session expired. Reconnect to save changes.");
      expect(result.requiresAuth).toBe(true);
    });

    it("should deny unauthenticated users from saving recipes", () => {
      const result = PermissionService.canSaveRecipe("unauthenticated");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Please log in to save recipes");
      expect(result.requiresAuth).toBe(true);
    });
  });

  describe("canEditRecipe", () => {
    it("should allow authenticated users to edit recipes", () => {
      const result = PermissionService.canEditRecipe("authenticated");

      expect(result.allowed).toBe(true);
    });

    it("should deny expired users from editing recipes", () => {
      const result = PermissionService.canEditRecipe("expired");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Session expired. Reconnect to edit recipes.");
      expect(result.requiresAuth).toBe(true);
    });

    it("should deny unauthenticated users from editing recipes", () => {
      const result = PermissionService.canEditRecipe("unauthenticated");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Please log in to edit recipes");
      expect(result.requiresAuth).toBe(true);
    });
  });

  describe("canDeleteRecipe", () => {
    it("should allow authenticated users to delete recipes", () => {
      const result = PermissionService.canDeleteRecipe("authenticated");

      expect(result.allowed).toBe(true);
    });

    it("should deny expired users from deleting recipes", () => {
      const result = PermissionService.canDeleteRecipe("expired");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe(
        "Session expired. Reconnect to delete recipes."
      );
      expect(result.requiresAuth).toBe(true);
    });

    it("should deny unauthenticated users from deleting recipes", () => {
      const result = PermissionService.canDeleteRecipe("unauthenticated");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Please log in to delete recipes");
      expect(result.requiresAuth).toBe(true);
    });
  });

  describe("canUseCalculators", () => {
    it("should allow authenticated users to use calculators", () => {
      const result = PermissionService.canUseCalculators("authenticated");

      expect(result.allowed).toBe(true);
    });

    it("should allow expired users to use calculators", () => {
      const result = PermissionService.canUseCalculators("expired");

      expect(result.allowed).toBe(true);
    });

    it("should allow unauthenticated users to use calculators", () => {
      const result = PermissionService.canUseCalculators("unauthenticated");

      expect(result.allowed).toBe(true);
    });
  });

  describe("canSyncData", () => {
    it("should allow authenticated users to sync data", () => {
      const result = PermissionService.canSyncData("authenticated");

      expect(result.allowed).toBe(true);
    });

    it("should deny expired users from syncing data", () => {
      const result = PermissionService.canSyncData("expired");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Session expired. Reconnect to sync data.");
      expect(result.requiresAuth).toBe(true);
    });

    it("should deny unauthenticated users from syncing data", () => {
      const result = PermissionService.canSyncData("unauthenticated");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Please log in to sync data");
      expect(result.requiresAuth).toBe(true);
    });
  });

  describe("canViewPublicRecipes", () => {
    it("should allow authenticated users to view public recipes", () => {
      const result = PermissionService.canViewPublicRecipes("authenticated");

      expect(result.allowed).toBe(true);
    });

    it("should deny expired users from viewing public recipes", () => {
      const result = PermissionService.canViewPublicRecipes("expired");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe(
        "Session expired. Reconnect to browse public recipes."
      );
      expect(result.requiresAuth).toBe(true);
    });

    it("should deny unauthenticated users from viewing public recipes", () => {
      const result = PermissionService.canViewPublicRecipes("unauthenticated");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Please log in to browse public recipes");
      expect(result.requiresAuth).toBe(true);
    });
  });

  describe("brew session permissions", () => {
    describe("canCreateBrewSession", () => {
      it("should allow authenticated users", () => {
        const result = PermissionService.canCreateBrewSession("authenticated");
        expect(result.allowed).toBe(true);
      });

      it("should deny expired users", () => {
        const result = PermissionService.canCreateBrewSession("expired");
        expect(result.allowed).toBe(false);
      });

      it("should deny unauthenticated users", () => {
        const result =
          PermissionService.canCreateBrewSession("unauthenticated");
        expect(result.allowed).toBe(false);
      });
    });

    describe("canEditBrewSession", () => {
      it("should allow authenticated users", () => {
        const result = PermissionService.canEditBrewSession("authenticated");
        expect(result.allowed).toBe(true);
      });

      it("should deny expired users", () => {
        const result = PermissionService.canEditBrewSession("expired");
        expect(result.allowed).toBe(false);
      });

      it("should deny unauthenticated users", () => {
        const result = PermissionService.canEditBrewSession("unauthenticated");
        expect(result.allowed).toBe(false);
      });
    });

    describe("canDeleteBrewSession", () => {
      it("should allow authenticated users", () => {
        const result = PermissionService.canDeleteBrewSession("authenticated");
        expect(result.allowed).toBe(true);
      });

      it("should deny expired users", () => {
        const result = PermissionService.canDeleteBrewSession("expired");
        expect(result.allowed).toBe(false);
      });

      it("should deny unauthenticated users", () => {
        const result =
          PermissionService.canDeleteBrewSession("unauthenticated");
        expect(result.allowed).toBe(false);
      });
    });

    describe("canViewBrewSessions", () => {
      it("should allow authenticated users", () => {
        const result = PermissionService.canViewBrewSessions("authenticated");
        expect(result.allowed).toBe(true);
      });

      it("should allow expired users", () => {
        const result = PermissionService.canViewBrewSessions("expired");
        expect(result.allowed).toBe(true);
      });

      it("should deny unauthenticated users", () => {
        const result = PermissionService.canViewBrewSessions("unauthenticated");
        expect(result.allowed).toBe(false);
      });
    });
  });

  describe("getPermissionSummary", () => {
    it("should return complete permission summary for authenticated user", () => {
      const summary = PermissionService.getPermissionSummary("authenticated");

      expect(summary.status).toBe("authenticated");
      expect(summary.permissions).toEqual({
        viewRecipes: true,
        createRecipe: true,
        saveRecipe: true,
        editRecipe: true,
        deleteRecipe: true,
        useCalculators: true,
        syncData: true,
        viewPublicRecipes: true,
        createBrewSession: true,
        editBrewSession: true,
        deleteBrewSession: true,
        viewBrewSessions: true,
      });
    });

    it("should return limited permissions for expired user", () => {
      const summary = PermissionService.getPermissionSummary("expired");

      expect(summary.status).toBe("expired");
      expect(summary.permissions).toEqual({
        viewRecipes: true, // Can view
        createRecipe: true, // Can use UI
        saveRecipe: false, // Cannot save
        editRecipe: false, // Cannot edit
        deleteRecipe: false, // Cannot delete
        useCalculators: true, // Always allowed
        syncData: false, // Cannot sync
        viewPublicRecipes: false, // Cannot browse
        createBrewSession: false, // Cannot create
        editBrewSession: false, // Cannot edit
        deleteBrewSession: false, // Cannot delete
        viewBrewSessions: true, // Can view
      });
    });

    it("should return minimal permissions for unauthenticated user", () => {
      const summary = PermissionService.getPermissionSummary("unauthenticated");

      expect(summary.status).toBe("unauthenticated");
      expect(summary.permissions).toEqual({
        viewRecipes: false,
        createRecipe: false,
        saveRecipe: false,
        editRecipe: false,
        deleteRecipe: false,
        useCalculators: true, // Only calculators allowed
        syncData: false,
        viewPublicRecipes: false,
        createBrewSession: false,
        editBrewSession: false,
        deleteBrewSession: false,
        viewBrewSessions: false,
      });
    });
  });

  describe("getStatusDescription", () => {
    it("should return description for authenticated status", () => {
      const description =
        PermissionService.getStatusDescription("authenticated");

      expect(description).toBe("Full access to all features");
    });

    it("should return description for expired status", () => {
      const description = PermissionService.getStatusDescription("expired");

      expect(description).toContain("Read-only mode");
      expect(description).toContain("view recipes");
      expect(description).toContain("calculators");
      expect(description).toContain("cannot save changes");
      expect(description).toContain("Reconnect");
    });

    it("should return description for unauthenticated status", () => {
      const description =
        PermissionService.getStatusDescription("unauthenticated");

      expect(description).toContain("log in");
    });

    it("should handle unknown status", () => {
      const description = PermissionService.getStatusDescription(
        "unknown" as AuthStatus
      );

      expect(description).toBe("Unknown authentication status");
    });
  });

  describe("getStatusColor", () => {
    it("should return success color for authenticated", () => {
      const color = PermissionService.getStatusColor("authenticated");
      expect(color).toBe("success");
    });

    it("should return warning color for expired", () => {
      const color = PermissionService.getStatusColor("expired");
      expect(color).toBe("warning");
    });

    it("should return neutral color for unauthenticated", () => {
      const color = PermissionService.getStatusColor("unauthenticated");
      expect(color).toBe("neutral");
    });

    it("should handle unknown status", () => {
      const color = PermissionService.getStatusColor("unknown" as AuthStatus);
      expect(color).toBe("neutral");
    });
  });

  describe("getStatusIcon", () => {
    it("should return check-circle for authenticated", () => {
      const icon = PermissionService.getStatusIcon("authenticated");
      expect(icon).toBe("check-circle");
    });

    it("should return warning for expired", () => {
      const icon = PermissionService.getStatusIcon("expired");
      expect(icon).toBe("warning");
    });

    it("should return login for unauthenticated", () => {
      const icon = PermissionService.getStatusIcon("unauthenticated");
      expect(icon).toBe("login");
    });

    it("should handle unknown status", () => {
      const icon = PermissionService.getStatusIcon("unknown" as AuthStatus);
      expect(icon).toBe("help");
    });
  });

  describe("permission consistency", () => {
    it("brew session permissions should match recipe permissions", () => {
      const statuses: AuthStatus[] = [
        "authenticated",
        "expired",
        "unauthenticated",
      ];

      statuses.forEach(status => {
        // Create vs Save
        expect(PermissionService.canCreateBrewSession(status).allowed).toBe(
          PermissionService.canSaveRecipe(status).allowed
        );

        // Edit
        expect(PermissionService.canEditBrewSession(status).allowed).toBe(
          PermissionService.canEditRecipe(status).allowed
        );

        // Delete
        expect(PermissionService.canDeleteBrewSession(status).allowed).toBe(
          PermissionService.canDeleteRecipe(status).allowed
        );

        // View
        expect(PermissionService.canViewBrewSessions(status).allowed).toBe(
          PermissionService.canViewRecipes(status).allowed
        );
      });
    });

    it("all write operations should be denied for expired users", () => {
      const writeOperations = [
        () => PermissionService.canSaveRecipe("expired"),
        () => PermissionService.canEditRecipe("expired"),
        () => PermissionService.canDeleteRecipe("expired"),
        () => PermissionService.canSyncData("expired"),
        () => PermissionService.canCreateBrewSession("expired"),
        () => PermissionService.canEditBrewSession("expired"),
        () => PermissionService.canDeleteBrewSession("expired"),
      ];

      writeOperations.forEach(operation => {
        expect(operation().allowed).toBe(false);
      });
    });

    it("all operations except calculators should be denied for unauthenticated", () => {
      const restrictedOperations = [
        () => PermissionService.canViewRecipes("unauthenticated"),
        () => PermissionService.canCreateRecipe("unauthenticated"),
        () => PermissionService.canSaveRecipe("unauthenticated"),
        () => PermissionService.canEditRecipe("unauthenticated"),
        () => PermissionService.canDeleteRecipe("unauthenticated"),
        () => PermissionService.canSyncData("unauthenticated"),
        () => PermissionService.canViewPublicRecipes("unauthenticated"),
      ];

      restrictedOperations.forEach(operation => {
        expect(operation().allowed).toBe(false);
      });

      // Calculators should be allowed
      expect(
        PermissionService.canUseCalculators("unauthenticated").allowed
      ).toBe(true);
    });
  });
});

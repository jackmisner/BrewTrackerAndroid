import { API_CONFIG, STORAGE_KEYS, ENDPOINTS } from "@src/services/config";

describe("config", () => {
  describe("API_CONFIG", () => {
    it("should have default configuration values", () => {
      expect(API_CONFIG.BASE_URL).toBeDefined();
      expect(API_CONFIG.TIMEOUT).toBe(10000);
      expect(API_CONFIG.MAX_RETRIES).toBe(3);
      expect(API_CONFIG.RETRY_DELAY).toBe(1000);
      expect(typeof API_CONFIG.DEBUG_MODE).toBe("boolean");
      expect(API_CONFIG.LOG_LEVEL).toBeDefined();
    });

    it("should handle boolean environment variables correctly", () => {
      // Test that DEBUG_MODE is properly converted from string to boolean
      expect(typeof API_CONFIG.DEBUG_MODE).toBe("boolean");
    });

    it("should provide fallback values", () => {
      // Test that fallback values are reasonable
      expect(API_CONFIG.BASE_URL).toMatch(/^https?:\/\//); // Should be a valid URL
      expect(API_CONFIG.LOG_LEVEL).toMatch(/^(debug|info|warn|error)$/); // Should be a valid log level
    });
  });

  describe("STORAGE_KEYS", () => {
    it("should define all required storage keys", () => {
      expect(STORAGE_KEYS.ACCESS_TOKEN).toBe("access_token");
      expect(STORAGE_KEYS.USER_DATA).toBe("user_data");
      expect(STORAGE_KEYS.USER_SETTINGS).toBe("user_settings");
      expect(STORAGE_KEYS.OFFLINE_RECIPES).toBe("offline_recipes");
      expect(STORAGE_KEYS.CACHED_INGREDIENTS).toBe("cached_ingredients");
      expect(STORAGE_KEYS.LAST_SYNC).toBe("last_sync");
    });

    it("should have consistent key values", () => {
      // Test that keys are properly defined
      Object.values(STORAGE_KEYS).forEach(value => {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });

  describe("ENDPOINTS", () => {
    describe("AUTH endpoints", () => {
      it("should define authentication endpoints", () => {
        expect(ENDPOINTS.AUTH.LOGIN).toBe("/auth/login");
        expect(ENDPOINTS.AUTH.REGISTER).toBe("/auth/register");
        expect(ENDPOINTS.AUTH.GOOGLE_AUTH).toBe("/auth/google");
        expect(ENDPOINTS.AUTH.PROFILE).toBe("/auth/profile");
        expect(ENDPOINTS.AUTH.VERIFY_EMAIL).toBe("/auth/verify-email");
        expect(ENDPOINTS.AUTH.RESEND_VERIFICATION).toBe(
          "/auth/resend-verification"
        );
        expect(ENDPOINTS.AUTH.VALIDATE_USERNAME).toBe(
          "/auth/validate-username"
        );
      });
    });

    describe("USER endpoints", () => {
      it("should define user management endpoints", () => {
        expect(ENDPOINTS.USER.SETTINGS).toBe("/user/settings");
        expect(ENDPOINTS.USER.PROFILE).toBe("/user/profile");
        expect(ENDPOINTS.USER.CHANGE_PASSWORD).toBe("/user/change-password");
        expect(ENDPOINTS.USER.DELETE_ACCOUNT).toBe("/user/delete-account");
      });
    });

    describe("RECIPES endpoints", () => {
      it("should define recipe endpoints", () => {
        expect(ENDPOINTS.RECIPES.LIST).toBe("/recipes");
        expect(ENDPOINTS.RECIPES.CREATE).toBe("/recipes");
        expect(ENDPOINTS.RECIPES.PUBLIC).toBe("/recipes/public");
        expect(ENDPOINTS.RECIPES.CALCULATE_PREVIEW).toBe(
          "/recipes/calculate-metrics-preview"
        );
      });

      it("should generate parameterized recipe endpoints", () => {
        expect(ENDPOINTS.RECIPES.DETAIL("123")).toBe("/recipes/123");
        expect(ENDPOINTS.RECIPES.UPDATE("456")).toBe("/recipes/456");
        expect(ENDPOINTS.RECIPES.DELETE("789")).toBe("/recipes/789");
        expect(ENDPOINTS.RECIPES.CLONE("abc")).toBe("/recipes/abc/clone");
        expect(ENDPOINTS.RECIPES.CLONE_PUBLIC("def")).toBe(
          "/recipes/def/clone-public"
        );
        expect(ENDPOINTS.RECIPES.METRICS("ghi")).toBe("/recipes/ghi/metrics");
        expect(ENDPOINTS.RECIPES.VERSIONS("jkl")).toBe("/recipes/jkl/versions");
        expect(ENDPOINTS.RECIPES.BREW_SESSIONS("mno")).toBe(
          "/recipes/mno/brew-sessions"
        );
      });
    });

    describe("BEER_STYLES endpoints", () => {
      it("should define beer styles endpoints", () => {
        expect(ENDPOINTS.BEER_STYLES.LIST).toBe("/beer-styles");
        expect(ENDPOINTS.BEER_STYLES.SEARCH).toBe("/beer-styles/search");
      });

      it("should generate parameterized beer styles endpoints", () => {
        expect(ENDPOINTS.BEER_STYLES.DETAIL("1A")).toBe("/beer-styles/1A");
        expect(ENDPOINTS.BEER_STYLES.SUGGESTIONS("recipe123")).toBe(
          "/beer-styles/suggestions/recipe123"
        );
        expect(ENDPOINTS.BEER_STYLES.ANALYSIS("recipe456")).toBe(
          "/beer-styles/analysis/recipe456"
        );
      });
    });

    describe("INGREDIENTS endpoints", () => {
      it("should define ingredients endpoints", () => {
        expect(ENDPOINTS.INGREDIENTS.LIST).toBe("/ingredients");
        expect(ENDPOINTS.INGREDIENTS.CREATE).toBe("/ingredients");
      });

      it("should generate parameterized ingredients endpoints", () => {
        expect(ENDPOINTS.INGREDIENTS.DETAIL("ingredient123")).toBe(
          "/ingredients/ingredient123"
        );
        expect(ENDPOINTS.INGREDIENTS.UPDATE("ingredient456")).toBe(
          "/ingredients/ingredient456"
        );
        expect(ENDPOINTS.INGREDIENTS.DELETE("ingredient789")).toBe(
          "/ingredients/ingredient789"
        );
        expect(ENDPOINTS.INGREDIENTS.RECIPES("ingredient000")).toBe(
          "/ingredients/ingredient000/recipes"
        );
      });
    });

    describe("BREW_SESSIONS endpoints", () => {
      it("should define brew sessions endpoints", () => {
        expect(ENDPOINTS.BREW_SESSIONS.LIST).toBe("/brew-sessions");
        expect(ENDPOINTS.BREW_SESSIONS.CREATE).toBe("/brew-sessions");
      });

      it("should generate parameterized brew sessions endpoints", () => {
        expect(ENDPOINTS.BREW_SESSIONS.DETAIL("session123")).toBe(
          "/brew-sessions/session123"
        );
        expect(ENDPOINTS.BREW_SESSIONS.UPDATE("session456")).toBe(
          "/brew-sessions/session456"
        );
        expect(ENDPOINTS.BREW_SESSIONS.DELETE("session789")).toBe(
          "/brew-sessions/session789"
        );
        expect(ENDPOINTS.BREW_SESSIONS.FERMENTATION("session000")).toBe(
          "/brew-sessions/session000/fermentation"
        );
        expect(
          ENDPOINTS.BREW_SESSIONS.FERMENTATION_ENTRY("session111", 5)
        ).toBe("/brew-sessions/session111/fermentation/5");
        expect(ENDPOINTS.BREW_SESSIONS.FERMENTATION_STATS("session222")).toBe(
          "/brew-sessions/session222/fermentation/stats"
        );
        expect(ENDPOINTS.BREW_SESSIONS.ANALYZE_COMPLETION("session333")).toBe(
          "/brew-sessions/session333/fermentation/analyze-completion"
        );
      });
    });

    describe("BEERXML endpoints", () => {
      it("should define BeerXML endpoints", () => {
        expect(ENDPOINTS.BEERXML.PARSE).toBe("/beerxml/parse");
        expect(ENDPOINTS.BEERXML.MATCH_INGREDIENTS).toBe(
          "/beerxml/match-ingredients"
        );
        expect(ENDPOINTS.BEERXML.CREATE_INGREDIENTS).toBe(
          "/beerxml/create-ingredients"
        );
      });

      it("should generate parameterized BeerXML endpoints", () => {
        expect(ENDPOINTS.BEERXML.EXPORT("recipe123")).toBe(
          "/beerxml/export/recipe123"
        );
      });
    });

    describe("AI endpoints", () => {
      it("should define AI endpoints", () => {
        expect(ENDPOINTS.AI.ANALYZE_RECIPE).toBe("/ai/analyze-recipe");
        expect(ENDPOINTS.AI.HEALTH).toBe("/ai/health");
      });
    });

    describe("DASHBOARD endpoints", () => {
      it("should define dashboard endpoints", () => {
        expect(ENDPOINTS.DASHBOARD.DATA).toBe("/dashboard");
      });
    });
  });
});

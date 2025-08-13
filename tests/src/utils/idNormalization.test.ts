import {
  BACKEND_ID_FIELD_MAPPING,
  FRONTEND_TO_BACKEND_MAPPING,
  extractEntityId,
  normalizeEntityId,
  normalizeEntityIds,
  denormalizeEntityId,
  detectEntityTypeFromUrl,
  normalizeResponseData,
  debugEntityIds,
  denormalizeEntityIdDeep,
} from "@utils/idNormalization";

describe("idNormalization", () => {
  describe("BACKEND_ID_FIELD_MAPPING", () => {
    it("should have correct mapping for all entity types", () => {
      expect(BACKEND_ID_FIELD_MAPPING.recipe).toBe("recipe_id");
      expect(BACKEND_ID_FIELD_MAPPING.ingredient).toBe("ingredient_id");
      expect(BACKEND_ID_FIELD_MAPPING.brewSession).toBe("session_id");
      expect(BACKEND_ID_FIELD_MAPPING.user).toBe("user_id");
      expect(BACKEND_ID_FIELD_MAPPING.fermentationEntry).toBe("entry_id");
      expect(BACKEND_ID_FIELD_MAPPING.style).toBe("style_guide_id");
    });
  });

  describe("FRONTEND_TO_BACKEND_MAPPING", () => {
    it("should have correct reverse mapping", () => {
      expect(FRONTEND_TO_BACKEND_MAPPING.recipe_id).toBe("recipe");
      expect(FRONTEND_TO_BACKEND_MAPPING.ingredient_id).toBe("ingredient");
      expect(FRONTEND_TO_BACKEND_MAPPING.session_id).toBe("brewSession");
      expect(FRONTEND_TO_BACKEND_MAPPING.user_id).toBe("user");
      expect(FRONTEND_TO_BACKEND_MAPPING.entry_id).toBe("fermentationEntry");
      expect(FRONTEND_TO_BACKEND_MAPPING.style_guide_id).toBe("style");
    });
  });

  describe("extractEntityId", () => {
    it("should return null for invalid inputs", () => {
      expect(extractEntityId(null, "recipe")).toBeNull();
      expect(extractEntityId(undefined, "recipe")).toBeNull();
      expect(extractEntityId("string", "recipe")).toBeNull();
      expect(extractEntityId(123, "recipe")).toBeNull();
    });

    it("should extract ID from backend-specific field", () => {
      const recipeEntity = { recipe_id: "recipe-123", name: "Test Recipe" };
      expect(extractEntityId(recipeEntity, "recipe")).toBe("recipe-123");

      const ingredientEntity = {
        ingredient_id: "ing-456",
        name: "Test Ingredient",
      };
      expect(extractEntityId(ingredientEntity, "ingredient")).toBe("ing-456");
    });

    it("should fallback to generic id field", () => {
      const entity = { id: "generic-123", name: "Test" };
      expect(extractEntityId(entity, "recipe")).toBe("generic-123");
    });

    it("should fallback to _id field", () => {
      const entity = { _id: "mongo-123", name: "Test" };
      expect(extractEntityId(entity, "recipe")).toBe("mongo-123");
    });

    it("should prioritize backend field over generic fields", () => {
      const entity = {
        recipe_id: "recipe-123",
        id: "generic-456",
        _id: "mongo-789",
        name: "Test Recipe",
      };
      expect(extractEntityId(entity, "recipe")).toBe("recipe-123");
    });

    it("should return null when no ID fields exist", () => {
      const entity = { name: "Test", description: "No ID here" };
      expect(extractEntityId(entity, "recipe")).toBeNull();
    });

    it("should handle null/undefined values in ID fields", () => {
      const entity = {
        recipe_id: null,
        id: undefined,
        _id: "mongo-123",
        name: "Test",
      };
      expect(extractEntityId(entity, "recipe")).toBe("mongo-123");
    });
  });

  describe("normalizeEntityId", () => {
    it("should throw error for invalid inputs", () => {
      expect(() => normalizeEntityId(null as any, "recipe")).toThrow(
        "Invalid entity provided for normalization"
      );
      expect(() => normalizeEntityId("string" as any, "recipe")).toThrow(
        "Invalid entity provided for normalization"
      );
    });

    it("should throw error when no valid ID is found", () => {
      const entity = { name: "Test", description: "No ID" };

      // Suppress expected console warning
      const consoleSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      expect(() => normalizeEntityId(entity, "recipe")).toThrow(
        "No valid ID found for recipe entity"
      );

      consoleSpy.mockRestore();
    });

    it("should normalize backend ID to generic id field", () => {
      const recipeEntity = {
        recipe_id: "recipe-123",
        name: "Test Recipe",
        style: "IPA",
      };

      const normalized = normalizeEntityId(recipeEntity, "recipe");

      expect(normalized).toEqual({
        id: "recipe-123",
        name: "Test Recipe",
        style: "IPA",
      });
      expect(normalized).not.toHaveProperty("recipe_id");
    });

    it("should preserve original ID when preserveOriginalId is true", () => {
      const recipeEntity = {
        recipe_id: "recipe-123",
        name: "Test Recipe",
      };

      const normalized = normalizeEntityId(recipeEntity, "recipe", true);

      expect(normalized).toEqual({
        id: "recipe-123",
        recipe_id: "recipe-123",
        name: "Test Recipe",
      });
    });

    it("should work with different entity types", () => {
      const ingredientEntity = {
        ingredient_id: "ing-456",
        name: "Test Hop",
        type: "hop",
      };

      const normalized = normalizeEntityId(ingredientEntity, "ingredient");

      expect(normalized).toEqual({
        id: "ing-456",
        name: "Test Hop",
        type: "hop",
      });
    });

    it("should handle entities that already have generic id field", () => {
      const entity = {
        id: "generic-123",
        name: "Test",
      };

      const normalized = normalizeEntityId(entity, "recipe");

      expect(normalized).toEqual({
        id: "generic-123",
        name: "Test",
      });
    });
  });

  describe("normalizeEntityIds", () => {
    it("should return empty array for non-array input", () => {
      // Suppress expected console error
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(normalizeEntityIds(null as any, "recipe")).toEqual([]);
      expect(normalizeEntityIds("string" as any, "recipe")).toEqual([]);
      expect(normalizeEntityIds({} as any, "recipe")).toEqual([]);

      consoleSpy.mockRestore();
    });

    it("should normalize array of entities", () => {
      const entities = [
        { recipe_id: "recipe-1", name: "Recipe 1" },
        { recipe_id: "recipe-2", name: "Recipe 2" },
      ];

      const normalized = normalizeEntityIds(entities, "recipe");

      expect(normalized).toEqual([
        { id: "recipe-1", name: "Recipe 1" },
        { id: "recipe-2", name: "Recipe 2" },
      ]);
    });

    it("should handle empty array", () => {
      expect(normalizeEntityIds([], "recipe")).toEqual([]);
    });

    it("should preserve original IDs when preserveOriginalId is true", () => {
      const entities = [{ recipe_id: "recipe-1", name: "Recipe 1" }];

      const normalized = normalizeEntityIds(entities, "recipe", true);

      expect(normalized).toEqual([
        { id: "recipe-1", recipe_id: "recipe-1", name: "Recipe 1" },
      ]);
    });
  });

  describe("denormalizeEntityId", () => {
    it("should convert generic id back to backend-specific field", () => {
      const normalizedEntity = {
        id: "recipe-123",
        name: "Test Recipe",
        style: "IPA",
      };

      const denormalized = denormalizeEntityId(normalizedEntity, "recipe");

      expect(denormalized).toEqual({
        recipe_id: "recipe-123",
        name: "Test Recipe",
        style: "IPA",
      });
      expect(denormalized).not.toHaveProperty("id");
    });

    it("should work with different entity types", () => {
      const normalizedIngredient = {
        id: "ing-456",
        name: "Test Hop",
        type: "hop",
      };

      const denormalized = denormalizeEntityId(
        normalizedIngredient,
        "ingredient"
      );

      expect(denormalized).toEqual({
        ingredient_id: "ing-456",
        name: "Test Hop",
        type: "hop",
      });
    });
  });

  describe("detectEntityTypeFromUrl", () => {
    it("should detect recipe endpoints", () => {
      expect(detectEntityTypeFromUrl("/api/recipes")).toBe("recipe");
      expect(detectEntityTypeFromUrl("/api/recipes/123")).toBe("recipe");
      expect(detectEntityTypeFromUrl("/api/recipes?page=1")).toBe("recipe");
      expect(detectEntityTypeFromUrl("/API/RECIPES")).toBe("recipe");
    });

    it("should detect ingredient endpoints", () => {
      expect(detectEntityTypeFromUrl("/api/ingredients")).toBe("ingredient");
      expect(detectEntityTypeFromUrl("/api/ingredients/456")).toBe(
        "ingredient"
      );
      expect(detectEntityTypeFromUrl("/api/ingredients?type=hop")).toBe(
        "ingredient"
      );
    });

    it("should detect brew session endpoints", () => {
      expect(detectEntityTypeFromUrl("/api/brew-sessions")).toBe("brewSession");
      expect(detectEntityTypeFromUrl("/api/brew-sessions/789")).toBe(
        "brewSession"
      );
      expect(detectEntityTypeFromUrl("/api/brew-sessions?status=active")).toBe(
        "brewSession"
      );
    });

    it("should detect user endpoints", () => {
      expect(detectEntityTypeFromUrl("/api/users")).toBe("user");
      expect(detectEntityTypeFromUrl("/api/users/profile")).toBe("user");
    });

    it("should detect fermentation endpoints", () => {
      expect(detectEntityTypeFromUrl("/api/fermentation")).toBe(
        "fermentationEntry"
      );
      expect(detectEntityTypeFromUrl("/api/fermentation/entries")).toBe(
        "fermentationEntry"
      );
    });

    it("should detect style endpoints", () => {
      expect(detectEntityTypeFromUrl("/api/styles")).toBe("style");
      expect(detectEntityTypeFromUrl("/api/styles?category=ale")).toBe("style");
    });

    it("should return null for unknown endpoints", () => {
      expect(detectEntityTypeFromUrl("/api/unknown")).toBeNull();
      expect(detectEntityTypeFromUrl("/api/other/endpoint")).toBeNull();
      expect(detectEntityTypeFromUrl("")).toBeNull();
      expect(detectEntityTypeFromUrl("/")).toBeNull();
    });

    it("should prioritize specific patterns over general ones", () => {
      // fermentation should be detected before general pattern matching
      expect(detectEntityTypeFromUrl("/api/fermentation/data")).toBe(
        "fermentationEntry"
      );
    });
  });

  describe("normalizeResponseData", () => {
    it("should return null/undefined unchanged", () => {
      expect(normalizeResponseData(null, "recipe")).toBeNull();
      expect(normalizeResponseData(undefined, "recipe")).toBeUndefined();
    });

    it("should normalize direct array response", () => {
      const data = [
        { recipe_id: "recipe-1", name: "Recipe 1" },
        { recipe_id: "recipe-2", name: "Recipe 2" },
      ];

      const normalized = normalizeResponseData(data, "recipe");

      expect(normalized).toEqual([
        { id: "recipe-1", name: "Recipe 1" },
        { id: "recipe-2", name: "Recipe 2" },
      ]);
    });

    it("should normalize wrapped ingredients response", () => {
      const data = {
        ingredients: [
          { ingredient_id: "ing-1", name: "Hop 1" },
          { ingredient_id: "ing-2", name: "Grain 1" },
        ],
        unit_system: "metric",
      };

      const normalized = normalizeResponseData(data, "recipe");

      expect(normalized).toEqual({
        ingredients: [
          { id: "ing-1", name: "Hop 1" },
          { id: "ing-2", name: "Grain 1" },
        ],
        unit_system: "metric",
      });
    });

    it("should normalize wrapped recipes response", () => {
      const data = {
        recipes: [{ recipe_id: "recipe-1", name: "Recipe 1" }],
        total: 1,
        page: 1,
      };

      const normalized = normalizeResponseData(data, "recipe");

      expect(normalized).toEqual({
        recipes: [{ id: "recipe-1", name: "Recipe 1" }],
        total: 1,
        page: 1,
      });
    });

    it("should normalize wrapped brew sessions response", () => {
      const data = {
        brew_sessions: [{ session_id: "session-1", name: "Brew 1" }],
        total: 1,
      };

      const normalized = normalizeResponseData(data, "brewSession");

      expect(normalized).toEqual({
        brew_sessions: [{ id: "session-1", name: "Brew 1" }],
        total: 1,
      });
    });

    it("should normalize wrapped data field response", () => {
      const data = {
        data: [{ recipe_id: "recipe-1", name: "Recipe 1" }],
        meta: { total: 1 },
      };

      const normalized = normalizeResponseData(data, "recipe");

      expect(normalized).toEqual({
        data: [{ id: "recipe-1", name: "Recipe 1" }],
        meta: { total: 1 },
      });
    });

    it("should normalize single entity response", () => {
      const data = {
        recipe_id: "recipe-123",
        name: "Single Recipe",
        style: "IPA",
      };

      const normalized = normalizeResponseData(data, "recipe");

      expect(normalized).toEqual({
        id: "recipe-123",
        name: "Single Recipe",
        style: "IPA",
      });
    });

    it("should return unchanged data that doesn't need normalization", () => {
      const data = {
        message: "Success",
        status: 200,
      };

      const normalized = normalizeResponseData(data, "recipe");

      expect(normalized).toEqual(data);
    });
  });

  describe("debugEntityIds", () => {
    it("should handle invalid inputs silently", () => {
      // These should not throw errors
      debugEntityIds(null);
      debugEntityIds(undefined);
      debugEntityIds("string");
      debugEntityIds(123);
    });

    it("should extract ID fields from entity", () => {
      const entity = {
        recipe_id: "recipe-123",
        id: "generic-456",
        _id: "mongo-789",
        name: "Test Recipe",
        otherId: "other-123",
        description: "Not an ID field",
      };

      // Function should complete without error
      expect(() => debugEntityIds(entity, "Test Recipe")).not.toThrow();
    });

    it("should handle entities with no ID fields", () => {
      const entity = {
        name: "Test",
        description: "No IDs here",
      };

      expect(() => debugEntityIds(entity)).not.toThrow();
    });
  });

  describe("denormalizeEntityIdDeep", () => {
    it("should handle null and undefined", () => {
      expect(denormalizeEntityIdDeep(null, "recipe")).toBeNull();
      expect(denormalizeEntityIdDeep(undefined, "recipe")).toBeUndefined();
    });

    it("should handle primitive values", () => {
      expect(denormalizeEntityIdDeep("string", "recipe")).toBe("string");
      expect(denormalizeEntityIdDeep(123, "recipe")).toBe(123);
      expect(denormalizeEntityIdDeep(true, "recipe")).toBe(true);
    });

    it("should denormalize array of entities", () => {
      const data = [
        { id: "recipe-1", name: "Recipe 1" },
        { id: "recipe-2", name: "Recipe 2" },
      ];

      const denormalized = denormalizeEntityIdDeep(data, "recipe");

      expect(denormalized).toEqual([
        { recipe_id: "recipe-1", name: "Recipe 1" },
        { recipe_id: "recipe-2", name: "Recipe 2" },
      ]);
    });

    it("should denormalize nested objects", () => {
      const data = {
        recipe: { id: "recipe-123", name: "Test Recipe" },
        ingredients: [{ id: "ing-1", name: "Hop 1", type: "hop" }],
        metadata: { total: 1 },
      };

      const denormalized = denormalizeEntityIdDeep(data, "recipe");

      expect(denormalized.recipe).toEqual({
        recipe_id: "recipe-123",
        name: "Test Recipe",
      });
    });

    it("should detect entity type from properties", () => {
      const data = {
        // Should be detected as ingredient based on properties
        id: "ing-123",
        name: "Test Hop",
        type: "hop",
        alpha_acid: 5.5,
      };

      const denormalized = denormalizeEntityIdDeep(data, "recipe");

      expect(denormalized).toEqual({
        ingredient_id: "ing-123",
        name: "Test Hop",
        type: "hop",
        alpha_acid: 5.5,
      });
    });

    it("should handle circular references", () => {
      const obj1: any = { id: "obj1" };
      const obj2: any = { id: "obj2" };
      obj1.ref = obj2;
      obj2.ref = obj1; // Circular reference

      // Suppress expected console warning
      const consoleSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const result = denormalizeEntityIdDeep(obj1, "recipe");

      // Should not throw and should handle circular reference
      expect(result.recipe_id).toBe("obj1");
      expect(result.ref.recipe_id).toBe("obj2");

      consoleSpy.mockRestore();
    });

    it("should handle deep nesting with recursion limit", () => {
      // Create a deeply nested object
      let deepObj: any = { id: "deep" };
      for (let i = 0; i < 60; i++) {
        // Exceeds MAX_DEPTH of 50
        deepObj = { nested: deepObj, id: `level-${i}` };
      }

      // Suppress expected console warning about max depth
      const consoleSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const result = denormalizeEntityIdDeep(deepObj, "recipe");

      // Should not throw and should return some denormalized data
      expect(result).toBeDefined();

      consoleSpy.mockRestore();
    });

    it("should preserve non-entity objects without ID", () => {
      const data = {
        name: "Test",
        description: "No ID here",
        metadata: {
          created: "2024-01-01",
          version: 1,
        },
      };

      const result = denormalizeEntityIdDeep(data, "recipe");

      expect(result).toEqual(data);
    });
  });
});

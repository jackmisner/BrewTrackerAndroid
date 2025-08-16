import type {
  IngredientType,
  BatchSizeUnit,
  IngredientUnit,
  RecipeIngredient,
  RecipeMetrics,
  Recipe,
  RecipeFormData,
  RecipeSearchFilters,
  IngredientsByType,
  RecipeAnalysis,
  CreateRecipeIngredientData,
} from "@src/types/recipe";
import type { ID } from "@src/types/common";

describe("Recipe Types", () => {
  describe("IngredientType enum", () => {
    it("should include all valid ingredient types", () => {
      const grain: IngredientType = "grain";
      const hop: IngredientType = "hop";
      const yeast: IngredientType = "yeast";
      const other: IngredientType = "other";

      expect(grain).toBe("grain");
      expect(hop).toBe("hop");
      expect(yeast).toBe("yeast");
      expect(other).toBe("other");
    });

    it("should be used in brewing context", () => {
      const getIngredientIcon = (type: IngredientType): string => {
        switch (type) {
          case "grain":
            return "🌾";
          case "hop":
            return "🌿";
          case "yeast":
            return "🧪";
          case "other":
            return "📦";
          default:
            return "❓";
        }
      };

      expect(getIngredientIcon("grain")).toBe("🌾");
      expect(getIngredientIcon("hop")).toBe("🌿");
      expect(getIngredientIcon("yeast")).toBe("🧪");
      expect(getIngredientIcon("other")).toBe("📦");
    });
  });

  describe("BatchSizeUnit type", () => {
    it("should accept valid batch size units", () => {
      const gallons: BatchSizeUnit = "gal";
      const liters: BatchSizeUnit = "l";

      expect(gallons).toBe("gal");
      expect(liters).toBe("l");
    });

    it("should be used in volume calculations", () => {
      const convertToLiters = (value: number, unit: BatchSizeUnit): number => {
        return unit === "gal" ? value * 3.78541 : value;
      };

      expect(convertToLiters(5, "gal")).toBeCloseTo(18.93, 1);
      expect(convertToLiters(20, "l")).toBe(20);
    });
  });

  describe("IngredientUnit type", () => {
    it("should include all valid ingredient units", () => {
      const validUnits: IngredientUnit[] = [
        "lb",
        "kg",
        "g",
        "oz",
        "pkg",
        "tsp",
        "tbsp",
        "cup",
        "ml",
        "l",
      ];

      validUnits.forEach(unit => {
        expect(typeof unit).toBe("string");
        expect(unit.length).toBeGreaterThan(0);
      });
    });

    it("should categorize weight vs volume units", () => {
      const isWeightUnit = (unit: IngredientUnit): boolean => {
        return ["lb", "kg", "g", "oz"].includes(unit);
      };

      const isVolumeUnit = (unit: IngredientUnit): boolean => {
        return ["tsp", "tbsp", "cup", "ml", "l"].includes(unit);
      };

      expect(isWeightUnit("lb")).toBe(true);
      expect(isWeightUnit("kg")).toBe(true);
      expect(isVolumeUnit("ml")).toBe(true);
      expect(isVolumeUnit("tsp")).toBe(true);
      expect(isWeightUnit("pkg")).toBe(false);
    });
  });

  describe("RecipeIngredient interface", () => {
    const createMockIngredient = (
      overrides: Partial<RecipeIngredient> = {}
    ): RecipeIngredient => ({
      id: "ingredient-123",
      name: "Test Ingredient",
      type: "grain",
      amount: 5,
      unit: "lb",
      ...overrides,
    });

    it("should have required basic properties", () => {
      const ingredient = createMockIngredient();

      expect(ingredient.id).toBe("ingredient-123");
      expect(ingredient.name).toBe("Test Ingredient");
      expect(ingredient.type).toBe("grain");
      expect(ingredient.amount).toBe(5);
      expect(ingredient.unit).toBe("lb");
    });

    it("should support grain-specific properties", () => {
      const grain = createMockIngredient({
        type: "grain",
        potential: 1.036,
        color: 2,
        grain_type: "base malt",
      });

      expect(grain.potential).toBe(1.036);
      expect(grain.color).toBe(2);
      expect(grain.grain_type).toBe("base malt");
    });

    it("should support hop-specific properties", () => {
      const hop = createMockIngredient({
        type: "hop",
        unit: "oz",
        alpha_acid: 5.5,
        use: "boil",
        time: 60,
        hop_type: "bittering",
      });

      expect(hop.alpha_acid).toBe(5.5);
      expect(hop.use).toBe("boil");
      expect(hop.time).toBe(60);
      expect(hop.hop_type).toBe("bittering");
    });

    it("should support yeast-specific properties", () => {
      const yeast = createMockIngredient({
        type: "yeast",
        unit: "pkg",
        attenuation: 75,
        yeast_type: "ale",
        manufacturer: "Wyeast",
        code: "1056",
      });

      expect(yeast.attenuation).toBe(75);
      expect(yeast.yeast_type).toBe("ale");
      expect(yeast.manufacturer).toBe("Wyeast");
      expect(yeast.code).toBe("1056");
    });

    it("should support other ingredient properties", () => {
      const other = createMockIngredient({
        type: "other",
        description: "Irish moss for clarity",
        notes: "Add 15 minutes before end of boil",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      });

      expect(other.description).toBe("Irish moss for clarity");
      expect(other.notes).toBe("Add 15 minutes before end of boil");
      expect(other.created_at).toBe("2024-01-01T00:00:00Z");
      expect(other.updated_at).toBe("2024-01-02T00:00:00Z");
    });

    it("should handle optional properties as undefined", () => {
      const minimal = createMockIngredient();

      expect(minimal.potential).toBeUndefined();
      expect(minimal.alpha_acid).toBeUndefined();
      expect(minimal.attenuation).toBeUndefined();
      expect(minimal.description).toBeUndefined();
      expect(minimal.notes).toBeUndefined();
    });
  });

  describe("RecipeMetrics interface", () => {
    it("should have all required brewing metrics", () => {
      const metrics: RecipeMetrics = {
        og: 1.055,
        fg: 1.012,
        abv: 5.6,
        ibu: 35,
        srm: 8,
      };

      expect(metrics.og).toBe(1.055);
      expect(metrics.fg).toBe(1.012);
      expect(metrics.abv).toBe(5.6);
      expect(metrics.ibu).toBe(35);
      expect(metrics.srm).toBe(8);
    });

    it("should validate realistic brewing values", () => {
      const metrics: RecipeMetrics = {
        og: 1.045, // Light beer
        fg: 1.01,
        abv: 4.6,
        ibu: 20, // Mild bitterness
        srm: 3, // Light color
      };

      expect(metrics.og).toBeGreaterThan(1.0);
      expect(metrics.fg).toBeLessThan(metrics.og);
      expect(metrics.abv).toBeGreaterThan(0);
      expect(metrics.ibu).toBeGreaterThanOrEqual(0);
      expect(metrics.srm).toBeGreaterThanOrEqual(0);
    });

    it("should handle strong beer metrics", () => {
      const strongBeer: RecipeMetrics = {
        og: 1.095, // Imperial stout
        fg: 1.02,
        abv: 9.8,
        ibu: 65,
        srm: 45,
      };

      expect(strongBeer.og).toBeGreaterThan(1.08);
      expect(strongBeer.abv).toBeGreaterThan(8);
      expect(strongBeer.srm).toBeGreaterThan(30); // Dark beer
    });
  });

  describe("Recipe interface", () => {
    const createMockRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
      id: "recipe-123",
      name: "Test IPA",
      style: "American IPA",
      description: "A hoppy American IPA",
      batch_size: 5,
      batch_size_unit: "gal",
      unit_system: "imperial",
      boil_time: 60,
      efficiency: 75,
      mash_temperature: 152,
      mash_temp_unit: "F",
      is_public: false,
      notes: "Test recipe notes",
      ingredients: [],
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      ...overrides,
    });

    it("should have required recipe properties", () => {
      const recipe = createMockRecipe();

      expect(recipe.id).toBe("recipe-123");
      expect(recipe.name).toBe("Test IPA");
      expect(recipe.style).toBe("American IPA");
      expect(recipe.batch_size).toBe(5);
      expect(recipe.batch_size_unit).toBe("gal");
      expect(recipe.unit_system).toBe("imperial");
      expect(recipe.boil_time).toBe(60);
      expect(recipe.efficiency).toBe(75);
    });

    it("should support estimated brewing metrics", () => {
      const recipe = createMockRecipe({
        estimated_og: 1.055,
        estimated_fg: 1.012,
        estimated_abv: 5.6,
        estimated_ibu: 45,
        estimated_srm: 8,
      });

      expect(recipe.estimated_og).toBe(1.055);
      expect(recipe.estimated_fg).toBe(1.012);
      expect(recipe.estimated_abv).toBe(5.6);
      expect(recipe.estimated_ibu).toBe(45);
      expect(recipe.estimated_srm).toBe(8);
    });

    it("should support version control properties", () => {
      const versionedRecipe = createMockRecipe({
        version: 2,
        parent_recipe_id: "parent-recipe-456",
        original_author: "original_brewer",
      });

      expect(versionedRecipe.version).toBe(2);
      expect(versionedRecipe.parent_recipe_id).toBe("parent-recipe-456");
      expect(versionedRecipe.original_author).toBe("original_brewer");
    });

    it("should support user context properties", () => {
      const userRecipe = createMockRecipe({
        username: "test_user",
        user_id: "user-789",
        is_owner: true,
        clone_count: 5,
        brew_count: 3,
      });

      expect(userRecipe.username).toBe("test_user");
      expect(userRecipe.user_id).toBe("user-789");
      expect(userRecipe.is_owner).toBe(true);
      expect(userRecipe.clone_count).toBe(5);
      expect(userRecipe.brew_count).toBe(3);
    });

    it("should handle metric vs imperial units", () => {
      const metricRecipe = createMockRecipe({
        unit_system: "metric",
        batch_size_unit: "l",
        mash_temp_unit: "C",
      });

      expect(metricRecipe.unit_system).toBe("metric");
      expect(metricRecipe.batch_size_unit).toBe("l");
      expect(metricRecipe.mash_temp_unit).toBe("C");
    });

    it("should contain ingredients array", () => {
      const recipeWithIngredients = createMockRecipe({
        ingredients: [
          {
            id: "grain-1",
            name: "Pale Ale Malt",
            type: "grain",
            amount: 9,
            unit: "lb",
            potential: 1.036,
            color: 2,
          },
          {
            id: "hop-1",
            name: "Cascade",
            type: "hop",
            amount: 1,
            unit: "oz",
            alpha_acid: 5.5,
            use: "boil",
            time: 60,
          },
        ],
      });

      expect(Array.isArray(recipeWithIngredients.ingredients)).toBe(true);
      expect(recipeWithIngredients.ingredients).toHaveLength(2);
      expect(recipeWithIngredients.ingredients[0].type).toBe("grain");
      expect(recipeWithIngredients.ingredients[1].type).toBe("hop");
    });
  });

  describe("RecipeFormData interface", () => {
    it("should match Recipe interface structure for form fields", () => {
      const formData: RecipeFormData = {
        name: "New IPA",
        style: "American IPA",
        description: "A hoppy new IPA",
        batch_size: 5,
        batch_size_unit: "gal",
        unit_system: "imperial",
        boil_time: 60,
        efficiency: 75,
        mash_temperature: 152,
        mash_temp_unit: "F",
        is_public: false,
        notes: "Form data notes",
        ingredients: [],
      };

      // Verify it has all required form fields
      expect(formData.name).toBe("New IPA");
      expect(formData.style).toBe("American IPA");
      expect(formData.ingredients).toEqual([]);
      expect(formData.is_public).toBe(false);
    });

    it("should support optional mash time", () => {
      const formWithMashTime: RecipeFormData = {
        name: "Test Recipe",
        style: "Porter",
        description: "Test description",
        batch_size: 20,
        batch_size_unit: "l",
        unit_system: "metric",
        boil_time: 90,
        efficiency: 72,
        mash_temperature: 65,
        mash_temp_unit: "C",
        mash_time: 60,
        is_public: true,
        notes: "Test notes",
        ingredients: [],
      };

      expect(formWithMashTime.mash_time).toBe(60);
      expect(formWithMashTime.unit_system).toBe("metric");
    });
  });

  describe("RecipeSearchFilters interface", () => {
    it("should support various search criteria", () => {
      const filters: RecipeSearchFilters = {
        style: "American IPA",
        search: "hoppy",
        author: "brewmaster",
        min_abv: 5.0,
        max_abv: 7.0,
        min_ibu: 30,
        max_ibu: 70,
        min_srm: 5,
        max_srm: 15,
        is_public: true,
      };

      expect(filters.style).toBe("American IPA");
      expect(filters.search).toBe("hoppy");
      expect(filters.min_abv).toBe(5.0);
      expect(filters.max_abv).toBe(7.0);
      expect(filters.is_public).toBe(true);
    });

    it("should allow partial filter criteria", () => {
      const minimalFilters: RecipeSearchFilters = {
        style: "Stout",
      };

      expect(minimalFilters.style).toBe("Stout");
      expect(minimalFilters.search).toBeUndefined();
      expect(minimalFilters.min_abv).toBeUndefined();
    });

    it("should handle numeric ranges", () => {
      const rangeFilters: RecipeSearchFilters = {
        min_abv: 4.0,
        max_abv: 6.0,
        min_ibu: 20,
        max_ibu: 40,
      };

      expect(rangeFilters.max_abv).toBeDefined();
      expect(rangeFilters.max_ibu).toBeDefined();
      expect(rangeFilters.min_abv).toBeLessThan(rangeFilters.max_abv!);
      expect(rangeFilters.min_ibu).toBeLessThan(rangeFilters.max_ibu!);
    });
  });

  describe("IngredientsByType interface", () => {
    it("should organize ingredients by type", () => {
      const ingredientsByType: IngredientsByType = {
        grain: [
          {
            id: "grain-1",
            name: "Pale Ale Malt",
            type: "grain",
            amount: 9,
            unit: "lb",
            potential: 1.036,
            color: 2,
          },
        ],
        hop: [
          {
            id: "hop-1",
            name: "Cascade",
            type: "hop",
            amount: 1,
            unit: "oz",
            alpha_acid: 5.5,
            use: "boil",
            time: 60,
          },
        ],
        yeast: [
          {
            id: "yeast-1",
            name: "American Ale Yeast",
            type: "yeast",
            amount: 1,
            unit: "pkg",
            attenuation: 75,
          },
        ],
        other: [],
      };

      expect(ingredientsByType.grain).toHaveLength(1);
      expect(ingredientsByType.hop).toHaveLength(1);
      expect(ingredientsByType.yeast).toHaveLength(1);
      expect(ingredientsByType.other).toHaveLength(0);

      expect(ingredientsByType.grain[0].type).toBe("grain");
      expect(ingredientsByType.hop[0].type).toBe("hop");
      expect(ingredientsByType.yeast[0].type).toBe("yeast");
    });

    it("should support empty ingredient categories", () => {
      const emptyIngredients: IngredientsByType = {
        grain: [],
        hop: [],
        yeast: [],
        other: [],
      };

      Object.values(emptyIngredients).forEach(ingredientList => {
        expect(Array.isArray(ingredientList)).toBe(true);
        expect(ingredientList).toHaveLength(0);
      });
    });
  });

  describe("RecipeAnalysis interface", () => {
    it("should provide comprehensive style compliance analysis", () => {
      const analysis: RecipeAnalysis = {
        style_compliance: {
          og_in_range: true,
          fg_in_range: true,
          abv_in_range: false,
          ibu_in_range: true,
          srm_in_range: true,
          overall_compliance: 80,
        },
        grain_bill_analysis: {
          base_malt_percentage: 75,
          specialty_malt_percentage: 25,
          dominant_grain: "Pale Ale Malt",
        },
        hop_analysis: {
          total_ibu: 45,
          bittering_ratio: 70,
          aroma_ratio: 30,
          hop_varieties: ["Cascade", "Centennial"],
        },
        yeast_analysis: {
          expected_attenuation: 75,
          temperature_range: "65-72°F",
          yeast_character: "clean, neutral",
        },
      };

      // Style compliance
      expect(analysis.style_compliance.overall_compliance).toBe(80);
      expect(analysis.style_compliance.og_in_range).toBe(true);
      expect(analysis.style_compliance.abv_in_range).toBe(false);

      // Grain bill analysis
      expect(analysis.grain_bill_analysis.base_malt_percentage).toBe(75);
      expect(analysis.grain_bill_analysis.dominant_grain).toBe("Pale Ale Malt");

      // Hop analysis
      expect(analysis.hop_analysis.total_ibu).toBe(45);
      expect(analysis.hop_analysis.hop_varieties).toContain("Cascade");

      // Yeast analysis
      expect(analysis.yeast_analysis.expected_attenuation).toBe(75);
      expect(analysis.yeast_analysis.temperature_range).toContain("°F");
    });

    it("should validate percentage values", () => {
      const analysis: RecipeAnalysis = {
        style_compliance: {
          og_in_range: true,
          fg_in_range: true,
          abv_in_range: true,
          ibu_in_range: true,
          srm_in_range: true,
          overall_compliance: 95,
        },
        grain_bill_analysis: {
          base_malt_percentage: 80,
          specialty_malt_percentage: 20,
          dominant_grain: "Munich Malt",
        },
        hop_analysis: {
          total_ibu: 25,
          bittering_ratio: 60,
          aroma_ratio: 40,
          hop_varieties: ["Hallertau"],
        },
        yeast_analysis: {
          expected_attenuation: 80,
          temperature_range: "18-24°C",
          yeast_character: "fruity esters",
        },
      };

      // Percentages should add up correctly
      const grainTotal =
        analysis.grain_bill_analysis.base_malt_percentage +
        analysis.grain_bill_analysis.specialty_malt_percentage;
      expect(grainTotal).toBe(100);

      const hopTotal =
        analysis.hop_analysis.bittering_ratio +
        analysis.hop_analysis.aroma_ratio;
      expect(hopTotal).toBe(100);

      expect(analysis.style_compliance.overall_compliance).toBeLessThanOrEqual(
        100
      );
      expect(analysis.yeast_analysis.expected_attenuation).toBeLessThanOrEqual(
        100
      );
    });
  });

  describe("CreateRecipeIngredientData interface", () => {
    it("should support creating new ingredients", () => {
      const newGrain: CreateRecipeIngredientData = {
        name: "Munich Malt",
        type: "grain",
        amount: 2,
        unit: "lb",
        potential: 1.037,
        color: 10,
        grain_type: "base malt",
      };

      expect(newGrain.name).toBe("Munich Malt");
      expect(newGrain.type).toBe("grain");
      expect(newGrain.potential).toBe(1.037);
    });

    it("should handle all ingredient types", () => {
      const newHop: CreateRecipeIngredientData = {
        name: "Simcoe",
        type: "hop",
        amount: 0.5,
        unit: "oz",
        alpha_acid: 12.0,
        use: "aroma",
        time: 5,
        hop_type: "aroma",
      };

      const newYeast: CreateRecipeIngredientData = {
        name: "SafAle US-05",
        type: "yeast",
        amount: 1,
        unit: "pkg",
        attenuation: 78,
        yeast_type: "dry ale",
        manufacturer: "Fermentis",
      };

      const newOther: CreateRecipeIngredientData = {
        name: "Irish Moss",
        type: "other",
        amount: 1,
        unit: "tsp",
        description: "Clarifying agent",
        notes: "Add 15 minutes before end of boil",
      };

      expect(newHop.type).toBe("hop");
      expect(newYeast.type).toBe("yeast");
      expect(newOther.type).toBe("other");

      expect(newHop.alpha_acid).toBe(12.0);
      expect(newYeast.attenuation).toBe(78);
      expect(newOther.description).toBe("Clarifying agent");
    });

    it("should handle optional properties", () => {
      const minimalIngredient: CreateRecipeIngredientData = {
        name: "Base Ingredient",
        type: "grain",
        amount: 1,
        unit: "lb",
      };

      expect(minimalIngredient.potential).toBeUndefined();
      expect(minimalIngredient.color).toBeUndefined();
      expect(minimalIngredient.alpha_acid).toBeUndefined();
      expect(minimalIngredient.attenuation).toBeUndefined();
    });
  });

  describe("Type integration and validation", () => {
    it("should work together in brewing calculations", () => {
      const recipe: Recipe = {
        id: "integration-test" as ID,
        name: "Integration Test IPA",
        style: "American IPA",
        description: "Test recipe for type integration",
        batch_size: 5,
        batch_size_unit: "gal",
        unit_system: "imperial",
        boil_time: 60,
        efficiency: 75,
        mash_temperature: 152,
        mash_temp_unit: "F",
        is_public: false,
        notes: "",
        ingredients: [
          {
            id: "grain-1" as ID,
            name: "Pale Ale Malt",
            type: "grain",
            amount: 9,
            unit: "lb",
            potential: 1.036,
            color: 2,
          },
          {
            id: "hop-1" as ID,
            name: "Cascade",
            type: "hop",
            amount: 1,
            unit: "oz",
            alpha_acid: 5.5,
            use: "boil",
            time: 60,
          },
        ],
        estimated_og: 1.055,
        estimated_fg: 1.012,
        estimated_abv: 5.6,
        estimated_ibu: 35,
        estimated_srm: 8,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      // Verify the recipe structure
      expect(recipe.ingredients).toHaveLength(2);
      expect(recipe.ingredients[0].type).toBe("grain");
      expect(recipe.ingredients[1].type).toBe("hop");
      expect(recipe.estimated_og).toBeGreaterThan(1.0);
    });

    it("should support search filtering", () => {
      const searchFilters: RecipeSearchFilters = {
        style: "American IPA",
        min_abv: 5.0,
        max_abv: 7.0,
        is_public: true,
      };

      const mockRecipe: Recipe = {
        id: "search-test" as ID,
        name: "Searchable IPA",
        style: "American IPA",
        description: "Public IPA recipe",
        batch_size: 5,
        batch_size_unit: "gal",
        unit_system: "imperial",
        boil_time: 60,
        efficiency: 75,
        mash_temperature: 152,
        mash_temp_unit: "F",
        is_public: true,
        notes: "",
        ingredients: [],
        estimated_abv: 6.2,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      // Recipe should match search criteria
      expect(mockRecipe.style).toBe(searchFilters.style);
      expect(mockRecipe.is_public).toBe(searchFilters.is_public);

      // Guard against null/undefined values before comparison
      expect(searchFilters.min_abv).toBeDefined();
      expect(searchFilters.max_abv).toBeDefined();
      expect(mockRecipe.estimated_abv).toBeDefined();

      if (searchFilters.min_abv != null && mockRecipe.estimated_abv != null) {
        expect(mockRecipe.estimated_abv).toBeGreaterThanOrEqual(
          searchFilters.min_abv
        );
      }
      if (searchFilters.max_abv != null && mockRecipe.estimated_abv != null) {
        expect(mockRecipe.estimated_abv).toBeLessThanOrEqual(
          searchFilters.max_abv
        );
      }
    });
  });
});

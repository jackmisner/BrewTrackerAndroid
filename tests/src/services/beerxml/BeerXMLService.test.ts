/**
 * Tests for BeerXMLService
 *
 * Tests the mobile BeerXML service functionality including:
 * - Export recipe to BeerXML
 * - Import BeerXML file from device
 * - Parse BeerXML content
 * - Match ingredients
 * - Create missing ingredients
 */

import BeerXMLService from "@services/beerxml/BeerXMLService";
import ApiService from "@services/api/apiService";
import { BeerXMLService as StorageBeerXMLService } from "@services/storageService";

// Mock the dependencies
jest.mock("@services/api/apiService");
jest.mock("@services/storageService", () => ({
  BeerXMLService: {
    exportBeerXML: jest.fn(),
    importBeerXML: jest.fn(),
  },
}));

const mockApiService = ApiService as jest.Mocked<typeof ApiService>;
const mockStorageService = StorageBeerXMLService as jest.Mocked<
  typeof StorageBeerXMLService
>;

describe("BeerXMLService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("exportRecipe", () => {
    it("should export recipe successfully", async () => {
      // Mock API response
      const mockXmlContent =
        '<?xml version="1.0"?><RECIPES><RECIPE><NAME>Test Recipe</NAME></RECIPE></RECIPES>';
      const mockFilename = "test_recipe.xml";

      mockApiService.beerxml.export = jest.fn().mockResolvedValue({
        data: {
          xml: mockXmlContent,
          filename: mockFilename,
        },
      });

      mockStorageService.exportBeerXML = jest.fn().mockResolvedValue({
        success: true,
      });

      // Test export
      const result = await BeerXMLService.exportRecipe("recipe-123");

      expect(result.success).toBe(true);
      expect(result.filename).toBe("test"); // Processed filename: "test_recipe.xml" -> "test"
      expect(mockApiService.beerxml.export).toHaveBeenCalledWith("recipe-123");
      expect(mockStorageService.exportBeerXML).toHaveBeenCalledWith(
        mockXmlContent,
        "test" // The filename processing removes "_recipe.xml" and replaces "_" with " "
      );
    });

    it("should handle export errors", async () => {
      mockApiService.beerxml.export = jest
        .fn()
        .mockRejectedValue(new Error("API Error"));

      const result = await BeerXMLService.exportRecipe("recipe-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("API Error");
    });
  });

  describe("importBeerXMLFile", () => {
    it("should import file successfully", async () => {
      const mockContent =
        '<?xml version="1.0"?><RECIPES><RECIPE><NAME>Imported Recipe</NAME></RECIPE></RECIPES>';
      const mockFilename = "imported.xml";

      mockStorageService.importBeerXML = jest.fn().mockResolvedValue({
        success: true,
        content: mockContent,
        filename: mockFilename,
      });

      const result = await BeerXMLService.importBeerXMLFile();

      expect(result.success).toBe(true);
      expect(result.content).toBe(mockContent);
      expect(result.filename).toBe(mockFilename);
    });

    it("should handle import errors", async () => {
      mockStorageService.importBeerXML = jest.fn().mockResolvedValue({
        success: false,
        error: "File not found",
      });

      const result = await BeerXMLService.importBeerXMLFile();

      expect(result.success).toBe(false);
      expect(result.error).toBe("File not found");
    });
  });

  describe("parseBeerXML", () => {
    it("should parse BeerXML content successfully", async () => {
      const mockXmlContent =
        '<?xml version="1.0"?><RECIPES><RECIPE><NAME>Test Recipe</NAME></RECIPE></RECIPES>';
      const mockParsedRecipes = [
        {
          name: "Test Recipe",
          style: "IPA",
          ingredients: [
            { name: "Pale Malt", type: "grain", amount: 10, unit: "lb" },
          ],
        },
      ];

      mockApiService.beerxml.parse = jest.fn().mockResolvedValue({
        data: {
          recipes: [
            {
              recipe: { name: "Test Recipe", style: "IPA" },
              ingredients: [
                { name: "Pale Malt", type: "grain", amount: 10, unit: "lb" },
              ],
            },
          ],
        },
      });

      const result = await BeerXMLService.parseBeerXML(mockXmlContent);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Test Recipe");
      expect(result[0].style).toBe("IPA");
      expect(mockApiService.beerxml.parse).toHaveBeenCalledWith({
        xml_content: mockXmlContent,
      });
    });

    it("should handle parsing errors", async () => {
      mockApiService.beerxml.parse = jest
        .fn()
        .mockRejectedValue(new Error("Invalid XML"));

      await expect(BeerXMLService.parseBeerXML("invalid xml")).rejects.toThrow(
        "Failed to parse BeerXML: Invalid BeerXML format - missing RECIPES element"
      );
    });

    it("should validate XML content", async () => {
      await expect(BeerXMLService.parseBeerXML("")).rejects.toThrow(
        "Failed to parse BeerXML: XML content is empty"
      );
    });
  });

  describe("matchIngredients", () => {
    it("should match ingredients successfully", async () => {
      const mockIngredients = [
        {
          name: "Pale Malt",
          type: "grain" as const,
          amount: 10,
          unit: "lb",
          use: "mash",
          time: 0,
        },
        {
          name: "Cascade",
          type: "hop" as const,
          amount: 1,
          unit: "oz",
          use: "boil",
          time: 60,
        },
      ] as any[];

      const mockMatchingResults = [
        {
          imported: mockIngredients[0],
          best_match: {
            ingredient: { id: "grain-1", name: "Pale Ale Malt" },
            confidence: 0.85,
          },
          confidence: 0.85,
        },
        {
          imported: mockIngredients[1],
          best_match: {
            ingredient: { id: "hop-1", name: "Cascade" },
            confidence: 0.95,
          },
          confidence: 0.95,
        },
      ];

      mockApiService.beerxml.matchIngredients = jest.fn().mockResolvedValue({
        data: {
          matching_results: mockMatchingResults,
        },
      });

      const result = await BeerXMLService.matchIngredients(mockIngredients);

      expect(result).toEqual(mockMatchingResults);
      expect(mockApiService.beerxml.matchIngredients).toHaveBeenCalledWith({
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain",
            amount: 10,
            unit: "lb",
            use: "mash",
            time: 0,
            potential: undefined,
            color: undefined,
            grain_type: undefined,
          },
          {
            name: "Cascade",
            type: "hop",
            amount: 1,
            unit: "oz",
            use: "boil",
            time: 60,
            alpha_acid: undefined,
          },
        ],
      });
    });
  });

  describe("createIngredients", () => {
    it("should create ingredients successfully", async () => {
      const mockIngredientsData = [
        {
          name: "New Grain",
          type: "grain",
          description: "Imported from BeerXML",
          grain_type: "base_malt",
          potential: 38,
          color: 2,
        },
      ];

      const mockCreatedIngredients = [
        {
          id: "new-grain-1",
          name: "New Grain",
          type: "grain",
        },
      ];

      mockApiService.beerxml.createIngredients = jest.fn().mockResolvedValue({
        data: {
          created_ingredients: mockCreatedIngredients,
        },
      });

      const result =
        await BeerXMLService.createIngredients(mockIngredientsData);

      expect(result).toEqual(mockCreatedIngredients);
      expect(mockApiService.beerxml.createIngredients).toHaveBeenCalledWith({
        ingredients: mockIngredientsData,
      });
    });
  });

  describe("validateFile", () => {
    it("should validate file successfully", () => {
      const mockFile = {
        name: "recipe.xml",
        size: 5000,
      };

      const result = BeerXMLService.validateFile(mockFile);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid file types", () => {
      const mockFile = {
        name: "recipe.txt",
        size: 5000,
      };

      const result = BeerXMLService.validateFile(mockFile);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Unsupported file type. Supported types: .xml"
      );
    });

    it("should reject files that are too large", () => {
      const mockFile = {
        name: "recipe.xml",
        size: 15 * 1024 * 1024, // 15MB
      };

      const result = BeerXMLService.validateFile(mockFile);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("File too large. Maximum size is 10MB");
    });
  });

  describe("generateImportSummary", () => {
    it("should generate import summary correctly", () => {
      const mockRecipes = [
        {
          name: "Recipe 1",
          ingredients: [
            { type: "grain" as const, name: "Pale", amount: 1, unit: "lb" },
            { type: "grain" as const, name: "Munich", amount: 1, unit: "lb" },
            { type: "hop" as const, name: "Cascade", amount: 1, unit: "oz" },
            { type: "yeast" as const, name: "US-05", amount: 1, unit: "pkg" },
          ],
        },
        {
          name: "Recipe 2",
          ingredients: [
            { type: "grain" as const, name: "Maris", amount: 1, unit: "lb" },
            { type: "hop" as const, name: "Centennial", amount: 1, unit: "oz" },
            { type: "hop" as const, name: "Citra", amount: 1, unit: "oz" },
            {
              type: "other" as const,
              name: "Whirlfloc",
              amount: 1,
              unit: "tsp",
            },
          ],
        },
      ] as any[];

      const result = BeerXMLService.generateImportSummary(mockRecipes);

      expect(result.totalRecipes).toBe(2);
      expect(result.totalIngredients).toBe(8);
      expect(result.ingredientsByType.grain).toBe(3);
      expect(result.ingredientsByType.hop).toBe(3);
      expect(result.ingredientsByType.yeast).toBe(1);
      expect(result.ingredientsByType.other).toBe(1);
    });
  });

  describe("calculateMatchingStats", () => {
    it("should calculate matching statistics correctly", () => {
      const mockMatchingResults = [
        {
          best_match: {
            ingredient: { id: "1", name: "Test" },
            confidence: 0.9,
          },
          confidence: 0.9,
          imported: {} as any,
          requires_new: false,
        },
        {
          best_match: {
            ingredient: { id: "2", name: "Test2" },
            confidence: 0.7,
          },
          confidence: 0.7,
          imported: {} as any,
          requires_new: false,
        },
        {
          best_match: null,
          confidence: 0.3,
          imported: {} as any,
          requires_new: true,
        },
        {
          best_match: null,
          confidence: 0.2,
          imported: {} as any,
          requires_new: true,
        },
      ] as any[];

      const result = BeerXMLService.calculateMatchingStats(mockMatchingResults);

      expect(result.matched).toBe(2);
      expect(result.newRequired).toBe(2);
      expect(result.highConfidence).toBe(1);
    });
  });
});

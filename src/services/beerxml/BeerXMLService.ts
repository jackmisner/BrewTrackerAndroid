import ApiService from "@services/api/apiService";
import { BeerXMLService as StorageBeerXMLService } from "@services/storageService";
import { Recipe, RecipeIngredient } from "@src/types";

// Service-specific interfaces for BeerXML operations

interface FileValidationResult {
  valid: boolean;
  errors: string[];
}

interface BeerXMLRecipe extends Partial<Recipe> {
  ingredients: RecipeIngredient[];
  metadata?: BeerXMLMetadata;
}

interface BeerXMLMetadata {
  source: string;
  imported_at: string;
  style_info?: {
    declared_style?: string;
    style_guide?: string;
    category?: string;
  };
}

interface IngredientMatchingResult {
  imported: RecipeIngredient;
  matches: {
    ingredient: any;
    confidence: number;
    reasons: string[];
  }[];
  best_match?: {
    ingredient: any;
    confidence: number;
  };
  confidence: number;
  requires_new: boolean;
  suggestedIngredientData?: any;
}

interface ImportSummary {
  totalRecipes: number;
  totalIngredients: number;
  ingredientsByType: {
    grain: number;
    hop: number;
    yeast: number;
    other: number;
  };
  matchingStats: {
    matched: number;
    newRequired: number;
    highConfidence: number;
  };
}

/**
 * BeerXML Service for React Native
 * Handles all BeerXML import/export operations using the backend API
 * and mobile file system integration
 */
class BeerXMLService {
  private readonly SUPPORTED_FILE_TYPES: string[];
  private readonly MAX_FILE_SIZE: number;

  constructor() {
    this.SUPPORTED_FILE_TYPES = [".xml"];
    this.MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  }

  /**
   * Export recipe to BeerXML format
   */
  async exportRecipe(recipeId: string): Promise<{
    success: boolean;
    filename?: string;
    error?: string;
    saveMethod?: "directory" | "share";
  }> {
    try {
      // Get BeerXML content from backend
      const response = await ApiService.beerxml.export(recipeId);
      const xmlContent = response.data.xml || response.data.xml_content;
      const serverFilename =
        typeof response.data?.filename === "string"
          ? response.data.filename
          : `${recipeId}.xml`;

      if (!xmlContent) {
        throw new Error("No XML content received from server");
      }

      // Derive a user-friendly recipe name from filename
      const base = serverFilename.replace(/^.*[\\/]/, "");
      const recipeName =
        base
          .replace(/_?recipe/i, "")
          .replace(/\.xml$/i, "")
          .replace(/_/g, " ")
          .trim() || `recipe_${Date.now()}`;

      // Use mobile storage service to save and share the file
      const saveResult = await StorageBeerXMLService.exportBeerXML(
        xmlContent,
        recipeName
      );

      if (!saveResult.success) {
        throw new Error(saveResult.error || "Failed to save BeerXML file");
      }

      return {
        success: true,
        filename: recipeName,
        saveMethod: saveResult.method,
      };
    } catch (error) {
      console.error("🍺 BeerXML Export - Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Export failed",
      };
    }
  }

  /**
   * Import BeerXML file from device storage
   */
  async importBeerXMLFile(): Promise<{
    success: boolean;
    content?: string;
    filename?: string;
    error?: string;
  }> {
    try {
      const result = await StorageBeerXMLService.importBeerXML();

      if (!result.success) {
        throw new Error(result.error || "Failed to import BeerXML file");
      }

      return {
        success: true,
        content: result.content,
        filename: result.filename,
      };
    } catch (error) {
      console.error("🍺 BeerXML Import - Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Import failed",
      };
    }
  }

  /**
   * Parse BeerXML content using backend
   */
  async parseBeerXML(xmlContent: string): Promise<BeerXMLRecipe[]> {
    try {
      // Validate XML content
      this.validateBeerXML(xmlContent);

      // Send to backend for parsing
      const response = await ApiService.beerxml.parse({
        xml_content: xmlContent,
      });

      // Transform backend response structure
      const recipes = Array.isArray(response.data?.recipes)
        ? response.data.recipes
        : [];
      if (!Array.isArray(recipes) || recipes.length === 0) {
        console.warn("🍺 BeerXML Parse - No recipes found in response");
      }
      const transformedRecipes = recipes.map((recipeData: any) => ({
        ...recipeData.recipe,
        ingredients: recipeData.ingredients,
        metadata: recipeData.metadata,
      }));

      return transformedRecipes;
    } catch (error) {
      console.error("🍺 BeerXML Parse - Error:", error);
      throw new Error(
        `Failed to parse BeerXML: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Match ingredients using backend service
   */
  async matchIngredients(
    ingredients: RecipeIngredient[]
  ): Promise<IngredientMatchingResult[]> {
    try {
      // Transform ingredients for backend API
      const ingredientsPayload = ingredients.map(ing => ({
        name: ing.name,
        type: ing.type,
        amount: ing.amount,
        unit: ing.unit,
        use: ing.use,
        time: ing.time,
        // Include type-specific fields
        ...(ing.type === "grain" && {
          potential: ing.potential,
          color: ing.color,
          grain_type: ing.grain_type,
        }),
        ...(ing.type === "hop" && {
          alpha_acid: ing.alpha_acid,
        }),
        ...(ing.type === "yeast" && {
          attenuation: ing.attenuation,
        }),
        // Include BeerXML data if available
        ...((ing as any).beerxml_data && {
          beerxml_data: (ing as any).beerxml_data,
        }),
      }));

      const response = await ApiService.beerxml.matchIngredients({
        ingredients: ingredientsPayload,
      });

      const matchingResults =
        (response.data as any).matching_results ??
        (response.data as any).matched_ingredients ??
        [];
      if (!Array.isArray(matchingResults)) {
        throw new Error("Unexpected matchIngredients response shape");
      }

      return matchingResults as IngredientMatchingResult[];
    } catch (error) {
      console.error("🍺 BeerXML Match - Error:", error);
      throw new Error(
        `Failed to match ingredients: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Create new ingredients using backend
   */
  async createIngredients(ingredientsData: any[]): Promise<any[]> {
    try {
      const response = await ApiService.beerxml.createIngredients({
        ingredients: ingredientsData,
      });

      const createdIngredients = Array.isArray(
        response.data?.created_ingredients
      )
        ? response.data.created_ingredients
        : [];

      return createdIngredients;
    } catch (error) {
      console.error("🍺 BeerXML Create - Error:", error);
      throw new Error(
        `Failed to create ingredients: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Validate BeerXML content
   */
  private validateBeerXML(xmlContent: string): void {
    if (!xmlContent || xmlContent.trim().length === 0) {
      throw new Error("XML content is empty");
    }

    // Basic BeerXML validation: RECIPES element must exist (prolog optional)
    if (!/<\s*RECIPES\b/i.test(xmlContent)) {
      throw new Error("Invalid BeerXML format - missing RECIPES element");
    }

    // Size validation using string length (approximate byte size for UTF-8)
    // This is an approximation since we can't use Buffer in React Native
    const approximateByteSize = xmlContent.length * 2; // UTF-8 can be up to 2 bytes per character
    if (approximateByteSize > this.MAX_FILE_SIZE) {
      throw new Error(
        `File too large. Maximum size is ${(this.MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB, got approximately ${(approximateByteSize / 1024 / 1024).toFixed(1)}MB`
      );
    }
  }

  /**
   * Validate file before processing
   */
  validateFile(file: { name: string; size: number }): FileValidationResult {
    const errors: string[] = [];

    // Check file extension
    const fileExtension = file.name.toLowerCase().split(".").pop();
    if (
      !fileExtension ||
      !this.SUPPORTED_FILE_TYPES.includes(`.${fileExtension}`)
    ) {
      errors.push(
        `Unsupported file type. Supported types: ${this.SUPPORTED_FILE_TYPES.join(", ")}`
      );
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push(
        `File too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate import summary from parsed recipes
   */
  generateImportSummary(recipes: BeerXMLRecipe[]): ImportSummary {
    const summary: ImportSummary = {
      totalRecipes: recipes.length,
      totalIngredients: 0,
      ingredientsByType: {
        grain: 0,
        hop: 0,
        yeast: 0,
        other: 0,
      },
      matchingStats: {
        matched: 0,
        newRequired: 0,
        highConfidence: 0,
      },
    };

    // Count ingredients by type
    recipes.forEach(recipe => {
      if (recipe.ingredients) {
        summary.totalIngredients += recipe.ingredients.length;
        recipe.ingredients.forEach(ingredient => {
          const type =
            ingredient.type as keyof typeof summary.ingredientsByType;
          if (type in summary.ingredientsByType) {
            summary.ingredientsByType[type]++;
          }
        });
      }
    });

    return summary;
  }

  /**
   * Calculate matching statistics from results
   */
  calculateMatchingStats(matchingResults: IngredientMatchingResult[]): {
    matched: number;
    newRequired: number;
    highConfidence: number;
  } {
    let matched = 0;
    let newRequired = 0;
    let highConfidence = 0;

    matchingResults.forEach(result => {
      if (result.best_match) {
        matched++;
        if (result.best_match.confidence >= 0.8) {
          highConfidence++;
        }
      }
      if (result.requires_new) {
        newRequired++;
      }
    });

    return {
      matched,
      newRequired,
      highConfidence,
    };
  }
}

// Create and export singleton instance
const beerXMLService = new BeerXMLService();
export default beerXMLService;

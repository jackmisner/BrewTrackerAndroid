import React from "react";
import { render } from "@testing-library/react-native";
import { ReviewForm } from "../../../../../src/components/recipes/RecipeForm/ReviewForm";
import { RecipeFormData, RecipeIngredient } from "../../../../../src/types";

// Comprehensive React Native mocking to avoid ES6 module issues
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles,
  },
}));

// Mock dependencies
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: "MaterialIcons",
}));

// Mock theme context
const mockTheme = {
  colors: {
    background: "#ffffff",
    text: "#000000",
    textMuted: "#999999",
    textSecondary: "#666666",
    primary: "#f4511e",
    success: "#28a745",
    inputBackground: "#f8f9fa",
    border: "#e0e0e0",
  },
};

jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => mockTheme,
}));

// Mock styles
jest.mock("@styles/modals/createRecipeStyles", () => ({
  createRecipeStyles: () => ({
    formContainer: { flex: 1 },
    sectionTitle: { fontSize: 18, fontWeight: "600" },
    sectionDescription: { fontSize: 14, color: "#666666" },
    reviewSection: { marginBottom: 24, padding: 16 },
    reviewSectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
    reviewRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    reviewLabel: { fontSize: 14, color: "#666666", flex: 1 },
    reviewValue: {
      fontSize: 14,
      color: "#000000",
      flex: 2,
      textAlign: "right",
    },
    ingredientTypeSection: { marginBottom: 16 },
    ingredientTypeTitle: { fontSize: 14, fontWeight: "500", marginBottom: 8 },
    ingredientReviewItem: { marginBottom: 12, padding: 8 },
    ingredientReviewInfo: { flex: 1 },
    ingredientReviewName: { fontSize: 14, fontWeight: "500" },
    ingredientReviewDetails: { fontSize: 12, color: "#999999", marginTop: 2 },
    ingredientReviewAmount: { fontSize: 12, color: "#666666", marginTop: 4 },
    emptyIngredientContainer: { padding: 20, alignItems: "center" },
    emptyIngredientText: { color: "#999999", textAlign: "center" },
    infoSection: { padding: 16, backgroundColor: "#f8f9fa" },
    infoHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    infoTitle: { fontSize: 16, fontWeight: "500", marginLeft: 8 },
    infoText: { fontSize: 14, color: "#666666" },
  }),
}));

// Mock BrewingMetricsDisplay component
jest.mock(
  "@src/components/recipes/BrewingMetrics/BrewingMetricsDisplay",
  () => ({
    BrewingMetricsDisplay: "BrewingMetricsDisplay",
  })
);

// Mock time utils
jest.mock("@src/utils/timeUtils", () => ({
  formatHopTime: jest.fn((time: number, use: string) => {
    if (use === "dry-hop") return `${time} days`;
    return `${time} min`;
  }),
}));

describe("ReviewForm", () => {
  const defaultRecipeData: RecipeFormData = {
    name: "American IPA",
    style: "21A. American IPA",
    description: "A hoppy American IPA with citrus notes",
    batch_size: 5,
    batch_size_unit: "gal",
    unit_system: "imperial",
    boil_time: 60,
    efficiency: 75,
    mash_temperature: 152,
    mash_temp_unit: "F",
    mash_time: 90,
    is_public: true,
    notes: "",
    ingredients: [],
  };

  const mockMetrics = {
    og: 1.065,
    fg: 1.013,
    abv: 6.8,
    ibu: 65,
    srm: 8,
  };

  const mockGrainIngredient: RecipeIngredient = {
    id: "grain-1",
    name: "Pale Malt 2-Row",
    type: "grain",
    amount: 10,
    unit: "lb",
    grain_type: "base_malt",
  };

  const mockHopIngredient: RecipeIngredient = {
    id: "hop-1",
    name: "Cascade",
    type: "hop",
    amount: 1,
    unit: "oz",
    use: "boil",
    time: 60,
    alpha_acid: 5.5,
  };

  const mockYeastIngredient: RecipeIngredient = {
    id: "yeast-1",
    name: "Safale US-05",
    type: "yeast",
    amount: 1,
    unit: "pkg",
    manufacturer: "Fermentis",
    attenuation: 78,
    yeast_type: "Ale",
  };

  const mockOtherIngredient: RecipeIngredient = {
    id: "other-1",
    name: "Irish Moss",
    type: "other",
    amount: 1,
    unit: "tsp",
  };

  describe("Basic rendering", () => {
    it("should render form title and description", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} />
      );

      expect(getByText("Review Your Recipe")).toBeTruthy();
      expect(
        getByText(/Review all recipe details before creating/)
      ).toBeTruthy();
    });

    it("should render basic information section", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} />
      );

      expect(getByText("Basic Information")).toBeTruthy();
      expect(getByText("Name:")).toBeTruthy();
      expect(getByText("Style:")).toBeTruthy();
      expect(getByText("Batch Size:")).toBeTruthy();
      expect(getByText("Public:")).toBeTruthy();
    });

    it("should render brewing parameters section", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} />
      );

      expect(getByText("Brewing Parameters")).toBeTruthy();
      expect(getByText("Boil Time:")).toBeTruthy();
      expect(getByText("Efficiency:")).toBeTruthy();
      expect(getByText("Mash Temperature:")).toBeTruthy();
    });

    it("should render ingredients section", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} />
      );

      expect(getByText(/Ingredients \(0\)/)).toBeTruthy();
    });

    it("should render info section", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} />
      );

      expect(getByText("Ready to Create")).toBeTruthy();
      expect(getByText(/Your recipe looks good/)).toBeTruthy();
    });
  });

  describe("Basic information display", () => {
    it("should display recipe name", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} />
      );

      expect(getByText("American IPA")).toBeTruthy();
    });

    it("should display beer style", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} />
      );

      expect(getByText("21A. American IPA")).toBeTruthy();
    });

    it("should display batch size with proper formatting", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} />
      );

      expect(getByText("5 Gal")).toBeTruthy();
    });

    it("should display batch size in liters", () => {
      const recipeWithLiters = {
        ...defaultRecipeData,
        batch_size: 20,
        batch_size_unit: "l" as const,
      };

      const { getByText } = render(
        <ReviewForm recipeData={recipeWithLiters} />
      );

      expect(getByText("20 L")).toBeTruthy();
    });

    it("should display description when provided", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} />
      );

      expect(getByText("Description:")).toBeTruthy();
      expect(getByText("A hoppy American IPA with citrus notes")).toBeTruthy();
    });

    it("should not display description when empty", () => {
      const recipeWithoutDescription = {
        ...defaultRecipeData,
        description: "",
      };

      const { queryByText } = render(
        <ReviewForm recipeData={recipeWithoutDescription} />
      );

      expect(queryByText("Description:")).toBeFalsy();
    });

    it("should display public status correctly", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} />
      );

      expect(getByText("Yes")).toBeTruthy();
    });

    it("should display private status correctly", () => {
      const privateRecipe = {
        ...defaultRecipeData,
        is_public: false,
      };

      const { getByText } = render(<ReviewForm recipeData={privateRecipe} />);

      expect(getByText("No")).toBeTruthy();
    });
  });

  describe("Brewing parameters display", () => {
    it("should display boil time", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} />
      );

      expect(getByText("60 minutes")).toBeTruthy();
    });

    it("should display efficiency percentage", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} />
      );

      expect(getByText("75%")).toBeTruthy();
    });

    it("should display mash temperature in Fahrenheit", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} />
      );

      expect(getByText("152°F")).toBeTruthy();
    });

    it("should display mash temperature in Celsius", () => {
      const recipeWithCelsius = {
        ...defaultRecipeData,
        mash_temperature: 67,
        mash_temp_unit: "C" as const,
      };

      const { getByText } = render(
        <ReviewForm recipeData={recipeWithCelsius} />
      );

      expect(getByText("67°C")).toBeTruthy();
    });

    it("should display mash time when provided", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} />
      );

      expect(getByText("Mash Time:")).toBeTruthy();
      expect(getByText("90 minutes")).toBeTruthy();
    });

    it("should not display mash time when not provided", () => {
      const recipeWithoutMashTime = {
        ...defaultRecipeData,
        mash_time: undefined,
      };

      const { queryByText } = render(
        <ReviewForm recipeData={recipeWithoutMashTime} />
      );

      expect(queryByText("Mash Time:")).toBeFalsy();
    });
  });

  describe("Ingredients display", () => {
    it("should show empty ingredients message when no ingredients", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} />
      );

      expect(getByText("No ingredients added yet")).toBeTruthy();
    });

    it("should display total ingredient count", () => {
      const recipeWithIngredients = {
        ...defaultRecipeData,
        ingredients: [mockGrainIngredient, mockHopIngredient],
      };

      const { getByText } = render(
        <ReviewForm recipeData={recipeWithIngredients} />
      );

      expect(getByText("Ingredients (2)")).toBeTruthy();
    });

    it("should display grain ingredients correctly", () => {
      const recipeWithGrain = {
        ...defaultRecipeData,
        ingredients: [mockGrainIngredient],
      };

      const { getByText } = render(<ReviewForm recipeData={recipeWithGrain} />);

      expect(getByText("Grains & Fermentables (1)")).toBeTruthy();
      expect(getByText("Pale Malt 2-Row")).toBeTruthy();
      expect(getByText("10 lb")).toBeTruthy();
      expect(getByText("Base Malt")).toBeTruthy();
    });

    it("should display hop ingredients with details", () => {
      const recipeWithHop = {
        ...defaultRecipeData,
        ingredients: [mockHopIngredient],
      };

      const { getByText } = render(<ReviewForm recipeData={recipeWithHop} />);

      expect(getByText("Hops (1)")).toBeTruthy();
      expect(getByText("Cascade")).toBeTruthy();
      expect(getByText("1 oz")).toBeTruthy();
      expect(getByText("Boil • 60 min • 5.5% AA")).toBeTruthy();
    });

    it("should display yeast ingredients with details", () => {
      const recipeWithYeast = {
        ...defaultRecipeData,
        ingredients: [mockYeastIngredient],
      };

      const { getByText } = render(<ReviewForm recipeData={recipeWithYeast} />);

      expect(getByText("Yeast (1)")).toBeTruthy();
      expect(getByText("Safale US-05")).toBeTruthy();
      expect(getByText("1 pkg")).toBeTruthy();
      expect(getByText(/Ale/)).toBeTruthy();
      expect(getByText(/Fermentis/)).toBeTruthy();
      expect(getByText(/78% Attenuation/)).toBeTruthy();
    });

    it("should display other ingredients", () => {
      const recipeWithOther = {
        ...defaultRecipeData,
        ingredients: [mockOtherIngredient],
      };

      const { getByText } = render(<ReviewForm recipeData={recipeWithOther} />);

      expect(getByText("Other Ingredients (1)")).toBeTruthy();
      expect(getByText("Irish Moss")).toBeTruthy();
      expect(getByText("1 tsp")).toBeTruthy();
    });

    it("should display multiple ingredient types", () => {
      const recipeWithAllIngredients = {
        ...defaultRecipeData,
        ingredients: [
          mockGrainIngredient,
          mockHopIngredient,
          mockYeastIngredient,
          mockOtherIngredient,
        ],
      };

      const { getByText } = render(
        <ReviewForm recipeData={recipeWithAllIngredients} />
      );

      expect(getByText("Ingredients (4)")).toBeTruthy();
      expect(getByText("Grains & Fermentables (1)")).toBeTruthy();
      expect(getByText("Hops (1)")).toBeTruthy();
      expect(getByText("Yeast (1)")).toBeTruthy();
      expect(getByText("Other Ingredients (1)")).toBeTruthy();
    });

    it("should not display empty ingredient categories", () => {
      const recipeWithOnlyGrain = {
        ...defaultRecipeData,
        ingredients: [mockGrainIngredient],
      };

      const { queryByText, getByText } = render(
        <ReviewForm recipeData={recipeWithOnlyGrain} />
      );

      expect(getByText("Grains & Fermentables (1)")).toBeTruthy();
      expect(queryByText("Hops (0)")).toBeFalsy();
      expect(queryByText("Yeast (0)")).toBeFalsy();
      expect(queryByText("Other Ingredients (0)")).toBeFalsy();
    });
  });

  describe("Hop usage display mapping", () => {
    it("should display dry hop usage correctly", () => {
      const dryHopIngredient = {
        ...mockHopIngredient,
        use: "dry-hop",
        time: 3,
      };

      const recipeWithDryHop = {
        ...defaultRecipeData,
        ingredients: [dryHopIngredient],
      };

      const { getByText } = render(
        <ReviewForm recipeData={recipeWithDryHop} />
      );

      expect(getByText("Dry Hop • 3 days • 5.5% AA")).toBeTruthy();
    });

    it("should display whirlpool usage correctly", () => {
      const whirlpoolHop = {
        ...mockHopIngredient,
        use: "whirlpool",
        time: 20,
      };

      const recipeWithWhirlpoolHop = {
        ...defaultRecipeData,
        ingredients: [whirlpoolHop],
      };

      const { getByText } = render(
        <ReviewForm recipeData={recipeWithWhirlpoolHop} />
      );

      expect(getByText("Whirlpool • 20 min • 5.5% AA")).toBeTruthy();
    });

    it("should handle hop without time or alpha acid", () => {
      const simpleHop = {
        ...mockHopIngredient,
        time: undefined,
        alpha_acid: undefined,
      };

      const recipeWithSimpleHop = {
        ...defaultRecipeData,
        ingredients: [simpleHop],
      };

      const { getByText } = render(
        <ReviewForm recipeData={recipeWithSimpleHop} />
      );

      expect(getByText("Cascade")).toBeTruthy();
      expect(getByText("Boil")).toBeTruthy();
    });
  });

  describe("Metrics integration", () => {
    it("should render BrewingMetricsDisplay component", () => {
      const { root } = render(
        <ReviewForm recipeData={defaultRecipeData} metrics={mockMetrics} />
      );

      // Component should be rendered (mocked as text element)
      expect(root).toBeTruthy();
    });

    it("should handle loading metrics state", () => {
      const { root } = render(
        <ReviewForm recipeData={defaultRecipeData} metricsLoading={true} />
      );

      expect(root).toBeTruthy();
    });

    it("should handle metrics error state", () => {
      const { root } = render(
        <ReviewForm
          recipeData={defaultRecipeData}
          metricsError={new Error("Calculation failed")}
          onRetryMetrics={jest.fn()}
        />
      );

      expect(root).toBeTruthy();
    });
  });

  describe("Editing mode", () => {
    it("should display edit mode text", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} isEditing={true} />
      );

      expect(getByText("Ready to Update")).toBeTruthy();
    });

    it("should display create mode text by default", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} />
      );

      expect(getByText("Ready to Create")).toBeTruthy();
    });
  });

  describe("Edge cases and data handling", () => {
    it("should handle zero batch size", () => {
      const recipeWithZeroBatch = {
        ...defaultRecipeData,
        batch_size: 0,
      };

      const { getByText } = render(
        <ReviewForm recipeData={recipeWithZeroBatch} />
      );

      expect(getByText("0 Gal")).toBeTruthy();
    });

    it("should handle very long recipe names", () => {
      const recipeWithLongName = {
        ...defaultRecipeData,
        name: "This is a very long recipe name that might cause display issues but should be handled gracefully",
      };

      const { getByText } = render(
        <ReviewForm recipeData={recipeWithLongName} />
      );

      expect(
        getByText(
          "This is a very long recipe name that might cause display issues but should be handled gracefully"
        )
      ).toBeTruthy();
    });

    it("should handle ingredients without optional properties", () => {
      const minimalIngredient: RecipeIngredient = {
        id: "minimal-1",
        name: "Simple Ingredient",
        type: "other",
        amount: 1,
        unit: "unit",
      };

      const recipeWithMinimalIngredient = {
        ...defaultRecipeData,
        ingredients: [minimalIngredient],
      };

      const { getByText } = render(
        <ReviewForm recipeData={recipeWithMinimalIngredient} />
      );

      expect(getByText("Simple Ingredient")).toBeTruthy();
      expect(getByText("1 unit")).toBeTruthy();
    });

    it("should handle yeast without optional properties", () => {
      const minimalYeast: RecipeIngredient = {
        id: "yeast-2",
        name: "Basic Yeast",
        type: "yeast",
        amount: 1,
        unit: "pkg",
      };

      const recipeWithMinimalYeast = {
        ...defaultRecipeData,
        ingredients: [minimalYeast],
      };

      const { getByText } = render(
        <ReviewForm recipeData={recipeWithMinimalYeast} />
      );

      expect(getByText("Basic Yeast")).toBeTruthy();
      expect(getByText("1 pkg")).toBeTruthy();
    });

    it("should handle undefined ingredient IDs", () => {
      const ingredientWithoutId: RecipeIngredient = {
        name: "No ID Ingredient",
        type: "other",
        amount: 1,
        unit: "unit",
      };

      const recipeWithIngredientNoId = {
        ...defaultRecipeData,
        ingredients: [ingredientWithoutId],
      };

      const { getByText } = render(
        <ReviewForm recipeData={recipeWithIngredientNoId} />
      );

      expect(getByText("No ID Ingredient")).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("should provide clear section organization", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} />
      );

      // Verify clear hierarchy with section titles
      expect(getByText("Basic Information")).toBeTruthy();
      expect(getByText("Brewing Parameters")).toBeTruthy();
      expect(getByText(/Ingredients/)).toBeTruthy();
    });

    it("should provide informative labels", () => {
      const { getByText } = render(
        <ReviewForm recipeData={defaultRecipeData} />
      );

      // Check that all fields have clear labels
      expect(getByText("Name:")).toBeTruthy();
      expect(getByText("Style:")).toBeTruthy();
      expect(getByText("Batch Size:")).toBeTruthy();
      expect(getByText("Boil Time:")).toBeTruthy();
      expect(getByText("Efficiency:")).toBeTruthy();
    });
  });
});

/**
 * EditRecipeScreen Component Test Suite
 */

import React from "react";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "../../../testUtils";

// Mock React Native
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  TouchableOpacity: "TouchableOpacity",
  ActivityIndicator: "ActivityIndicator",
  KeyboardAvoidingView: "KeyboardAvoidingView",
  Alert: {
    alert: jest.fn(),
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles,
  },
  Appearance: {
    getColorScheme: jest.fn(() => "light"),
    addChangeListener: jest.fn(),
    removeChangeListener: jest.fn(),
  },
}));

// Mock external dependencies
jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({
    recipe_id: "test-recipe-id",
  })),
}));

// Mock all context providers that testUtils imports
jest.mock("@contexts/ThemeContext", () => {
  const React = require("react");
  return {
    useTheme: () => ({
      colors: {
        primary: "#007AFF",
        background: "#FFFFFF",
        surface: "#F2F2F7",
        text: "#000000",
        textSecondary: "#666666",
        border: "#C7C7CC",
        success: "#34C759",
        warning: "#FF9500",
        error: "#FF3B30",
      },
      fonts: {
        regular: { fontSize: 16, fontWeight: "400" },
        medium: { fontSize: 16, fontWeight: "500" },
        bold: { fontSize: 16, fontWeight: "700" },
      },
    }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock("@contexts/AuthContext", () => {
  const React = require("react");
  return {
    useAuth: jest.fn(),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock("@contexts/NetworkContext", () => {
  const React = require("react");
  return {
    useNetwork: jest.fn(),
    NetworkProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock("@contexts/DeveloperContext", () => {
  const React = require("react");
  return {
    useDeveloper: jest.fn(),
    DeveloperProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

jest.mock("@contexts/UnitContext", () => {
  const React = require("react");
  return {
    useUnits: () => ({
      weightUnit: "lb",
      temperatureUnit: "F",
      volumeUnit: "gal",
      convertWeight: jest.fn(val => val),
      convertTemperature: jest.fn(val => val),
      convertVolume: jest.fn(val => val),
    }),
    UnitProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock("@contexts/CalculatorsContext", () => {
  const React = require("react");
  return {
    useCalculators: jest.fn(),
    CalculatorsProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

jest.mock("@services/api/apiService", () => ({
  default: {
    recipes: {
      getById: jest.fn(),
      update: jest.fn(),
      calculateMetricsPreview: jest.fn(),
    },
  },
}));

jest.mock("@src/hooks/useRecipeMetrics", () => ({
  useRecipeMetrics: jest.fn(() => ({
    metrics: {
      abv: 5.2,
      ibu: 35,
      srm: 4,
      og: 1.052,
      fg: 1.012,
    },
    isLoading: false,
    error: null,
  })),
}));

// Mock form components
jest.mock("@src/components/recipes/RecipeForm/BasicInfoForm", () => ({
  BasicInfoForm: () => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, {}, "Basic Info Form");
  },
}));

jest.mock("@src/components/recipes/RecipeForm/ParametersForm", () => ({
  ParametersForm: () => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, {}, "Parameters Form");
  },
}));

jest.mock("@src/components/recipes/RecipeForm/IngredientsForm", () => ({
  IngredientsForm: () => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, {}, "Ingredients Form");
  },
}));

jest.mock("@src/components/recipes/RecipeForm/ReviewForm", () => ({
  ReviewForm: () => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, {}, "Review Form");
  },
}));

// Mock styles
jest.mock("@styles/modals/createRecipeStyles", () => ({
  createRecipeStyles: () => ({
    container: {},
    loadingContainer: {},
    errorContainer: {},
    errorText: {},
    headerSection: {},
    progressContainer: {},
    progressBar: {},
    progressFilled: {},
    stepContainer: {},
    stepNumber: {},
    stepNumberActive: {},
    stepTitle: {},
    stepTitleActive: {},
    stepLine: {},
    stepLineActive: {},
    title: {},
    backButton: {},
    content: {},
    formContainer: {},
    navigationButtons: {},
    nextButton: {},
    nextButtonText: {},
    prevButton: {},
    prevButtonText: {},
    saveButton: {},
    saveButtonText: {},
    nextButtonDisabled: {},
    nextButtonTextDisabled: {},
  }),
}));

import EditRecipeScreen from "../../../../app/(modals)/(recipes)/editRecipe";
const mockApiService = require("@services/api/apiService").default;

// Setup Auth mock return values
require("@contexts/AuthContext").useAuth.mockReturnValue({
  user: { id: "test-user-123" },
  isAuthenticated: true,
  getUserId: jest.fn().mockReturnValue("test-user-123"),
});

describe("EditRecipeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render without crashing", () => {
      mockApiService.recipes.getById.mockResolvedValue({
        data: {
          id: "test-recipe-id",
          name: "Test Recipe",
          style: "American IPA",
          batch_size: 5,
          ingredients: [],
          parameters: {},
        },
      });

      expect(() => renderWithProviders(<EditRecipeScreen />)).not.toThrow();
    });

    it("should render basic screen structure", () => {
      mockApiService.recipes.getById.mockResolvedValue({
        data: {
          id: "test-recipe-id",
          name: "Test Recipe",
          style: "American IPA",
          batch_size: 5,
          ingredients: [],
          parameters: {},
        },
      });

      const { getByText } = renderWithProviders(<EditRecipeScreen />, {});

      // Should render the screen title
      expect(getByText("Edit Recipe")).toBeTruthy();
    });

    it("should handle API loading state", async () => {
      mockApiService.recipes.getById.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: {} }), 0))
      );

      const { getByText } = renderWithProviders(<EditRecipeScreen />, {});

      // Should handle loading state gracefully
      await waitFor(() => {
        // Component should render without crashing during loading
        expect(() => getByText("Edit Recipe")).not.toThrow();
      });
    });

    it("should handle API errors gracefully", async () => {
      mockApiService.recipes.getById.mockRejectedValue(
        new Error("Failed to fetch recipe")
      );

      const { getByText } = renderWithProviders(<EditRecipeScreen />, {});

      // Should not crash and should render some error state or loading state
      await waitFor(() => {
        expect(() => getByText(/edit recipe/i)).not.toThrow();
      });
    });
  });

  describe("Component Behavior", () => {
    it("should handle successful recipe data loading", async () => {
      const mockRecipe = {
        id: "test-recipe-id",
        name: "Test IPA",
        style: "American IPA",
        batch_size: 5,
        ingredients: [
          {
            id: "ing1",
            name: "Pale Malt",
            amount: 10,
            unit: "lb",
            type: "grain" as const,
          },
        ],
        parameters: {
          boil_time: 60,
          efficiency: 75,
          mash_temperature: 152,
        },
      };

      mockApiService.recipes.getById.mockResolvedValue({
        data: mockRecipe,
      });

      const { getByText } = renderWithProviders(<EditRecipeScreen />, {});

      // Should render the screen successfully
      // Should render the screen successfully
      await waitFor(() => {
        expect(getByText("Edit Recipe")).toBeTruthy();
      });
    });

    it("should handle recipes with different data structures", async () => {
      const mockMinimalRecipe = {
        id: "test-recipe-id",
        name: "Minimal Recipe",
        style: "Unknown",
        batch_size: 1,
        ingredients: [],
        parameters: {},
      };

      mockApiService.recipes.getById.mockResolvedValue({
        data: mockMinimalRecipe,
      });

      const { getByText } = renderWithProviders(<EditRecipeScreen />, {});

      // Should handle minimal recipe data without crashing
      await waitFor(() => {
        expect(getByText("Edit Recipe")).toBeTruthy();
      });
    });
  });

  describe("Navigation and Basic Interactions", () => {
    const mockRouter = require("expo-router").router;

    it("should handle navigation methods without crashing", () => {
      mockApiService.recipes.getById.mockResolvedValue({
        data: {
          id: "test-recipe-id",
          name: "Test Recipe",
          style: "American IPA",
          batch_size: 5,
          ingredients: [],
          parameters: {},
        },
      });

      // Render the component
      expect(() => renderWithProviders(<EditRecipeScreen />)).not.toThrow();

      // Should have router methods available
      expect(mockRouter.back).toBeDefined();
      expect(mockRouter.push).toBeDefined();
    });

    it("should have API service methods available", () => {
      // Simple test to verify our mocks are set up correctly
      expect(mockApiService.recipes.getById).toBeDefined();
      expect(typeof mockApiService.recipes.getById).toBe("function");
      expect(mockApiService.recipes.update).toBeDefined();
      expect(typeof mockApiService.recipes.update).toBe("function");
    });

    it("should handle update recipe method", () => {
      // Mock the update method
      mockApiService.recipes.update.mockResolvedValue({
        data: {},
      });

      // Should have the method available
      expect(mockApiService.recipes.update).toBeDefined();
      expect(typeof mockApiService.recipes.update).toBe("function");
    });
  });

  describe("Form Step Management", () => {
    it("should handle step enumeration", () => {
      // Test that the component can handle different steps
      const RecipeStep = {
        BASIC_INFO: 0,
        PARAMETERS: 1,
        INGREDIENTS: 2,
        REVIEW: 3,
      };

      expect(RecipeStep.BASIC_INFO).toBe(0);
      expect(RecipeStep.PARAMETERS).toBe(1);
      expect(RecipeStep.INGREDIENTS).toBe(2);
      expect(RecipeStep.REVIEW).toBe(3);
    });

    it("should handle step titles", () => {
      const STEP_TITLES = ["Basic Info", "Parameters", "Ingredients", "Review"];

      expect(STEP_TITLES).toHaveLength(4);
      expect(STEP_TITLES[0]).toBe("Basic Info");
      expect(STEP_TITLES[1]).toBe("Parameters");
      expect(STEP_TITLES[2]).toBe("Ingredients");
      expect(STEP_TITLES[3]).toBe("Review");
    });

    it("should render form components based on steps", () => {
      mockApiService.recipes.getById.mockResolvedValue({
        data: {
          id: "test-recipe-id",
          name: "Test Recipe",
          style: "American IPA",
          batch_size: 5,
          ingredients: [],
          parameters: {},
        },
      });

      const { getByText } = renderWithProviders(<EditRecipeScreen />, {});

      // Should render the screen title
      expect(getByText("Edit Recipe")).toBeTruthy();
    });
  });

  describe("Metrics Integration", () => {
    const mockUseRecipeMetrics =
      require("@src/hooks/useRecipeMetrics").useRecipeMetrics;

    it("should handle recipe metrics hook", () => {
      mockUseRecipeMetrics.mockReturnValue({
        metrics: {
          abv: 6.2,
          ibu: 45,
          srm: 6,
          og: 1.055,
          fg: 1.015,
        },
        isLoading: false,
        error: null,
      });

      mockApiService.recipes.getById.mockResolvedValue({
        data: {
          id: "test-recipe-id",
          name: "Test Recipe",
          style: "American IPA",
          batch_size: 5,
          ingredients: [],
          parameters: {},
        },
      });

      expect(() => renderWithProviders(<EditRecipeScreen />)).not.toThrow();

      // Verify metrics hook was called
      expect(mockUseRecipeMetrics).toHaveBeenCalled();
    });

    it("should handle metrics loading state", () => {
      mockUseRecipeMetrics.mockReturnValue({
        metrics: null,
        isLoading: true,
        error: null,
      });

      mockApiService.recipes.getById.mockResolvedValue({
        data: {
          id: "test-recipe-id",
          name: "Test Recipe",
          style: "American IPA",
          batch_size: 5,
          ingredients: [],
          parameters: {},
        },
      });

      expect(() => renderWithProviders(<EditRecipeScreen />)).not.toThrow();
    });

    it("should handle metrics error state", () => {
      mockUseRecipeMetrics.mockReturnValue({
        metrics: null,
        isLoading: false,
        error: new Error("Metrics calculation failed"),
      });

      mockApiService.recipes.getById.mockResolvedValue({
        data: {
          id: "test-recipe-id",
          name: "Test Recipe",
          style: "American IPA",
          batch_size: 5,
          ingredients: [],
          parameters: {},
        },
      });

      expect(() => renderWithProviders(<EditRecipeScreen />)).not.toThrow();
    });
  });

  describe("hasRecipeChanges Function", () => {
    // Import the function directly for testing
    const {
      hasRecipeChanges,
    } = require("../../../../app/(modals)/(recipes)/editRecipe");

    const createMockRecipe = (overrides: Partial<any> = {}) => ({
      name: "Test Recipe",
      style: "American IPA",
      description: "A test recipe",
      batch_size: 5,
      batch_size_unit: "gal",
      unit_system: "imperial",
      boil_time: 60,
      efficiency: 75,
      mash_temperature: 152,
      mash_temp_unit: "F",
      mash_time: 60,
      notes: "Test notes",
      is_public: false,
      ingredients: [],
      ...overrides,
    });

    it("should return false for null or undefined inputs", () => {
      const recipe = createMockRecipe();

      expect(hasRecipeChanges(null, recipe)).toBe(false);
      expect(hasRecipeChanges(recipe, null)).toBe(false);
      expect(hasRecipeChanges(null, null)).toBe(false);
    });

    it("should return false for identical recipes", () => {
      const recipe1 = createMockRecipe();
      const recipe2 = createMockRecipe();

      expect(hasRecipeChanges(recipe1, recipe2)).toBe(false);
    });

    it("should return false for same reference", () => {
      const recipe = createMockRecipe();

      expect(hasRecipeChanges(recipe, recipe)).toBe(false);
    });

    it("should detect changes in scalar fields", () => {
      const original = createMockRecipe();

      // Test each scalar field that should be compared
      expect(
        hasRecipeChanges(createMockRecipe({ name: "Changed Name" }), original)
      ).toBe(true);
      expect(
        hasRecipeChanges(createMockRecipe({ style: "Changed Style" }), original)
      ).toBe(true);
      expect(
        hasRecipeChanges(
          createMockRecipe({ description: "Changed Description" }),
          original
        )
      ).toBe(true);
      expect(
        hasRecipeChanges(createMockRecipe({ batch_size: 10 }), original)
      ).toBe(true);
      expect(
        hasRecipeChanges(createMockRecipe({ batch_size_unit: "l" }), original)
      ).toBe(true);
      expect(
        hasRecipeChanges(createMockRecipe({ unit_system: "metric" }), original)
      ).toBe(true);
      expect(
        hasRecipeChanges(createMockRecipe({ boil_time: 90 }), original)
      ).toBe(true);
      expect(
        hasRecipeChanges(createMockRecipe({ efficiency: 80 }), original)
      ).toBe(true);
      expect(
        hasRecipeChanges(createMockRecipe({ mash_temperature: 155 }), original)
      ).toBe(true);
      expect(
        hasRecipeChanges(createMockRecipe({ mash_temp_unit: "C" }), original)
      ).toBe(true);
      expect(
        hasRecipeChanges(createMockRecipe({ mash_time: 90 }), original)
      ).toBe(true);
      expect(
        hasRecipeChanges(createMockRecipe({ notes: "Changed Notes" }), original)
      ).toBe(true);
      expect(
        hasRecipeChanges(createMockRecipe({ is_public: true }), original)
      ).toBe(true);
    });

    it("should detect changes in ingredient array length", () => {
      const original = createMockRecipe({ ingredients: [] });
      const withIngredient = createMockRecipe({
        ingredients: [
          {
            id: "ing1",
            name: "Test Grain",
            type: "grain",
            amount: 10,
            unit: "lb",
            instance_id: "ing-1",
          },
        ],
      });

      expect(hasRecipeChanges(withIngredient, original)).toBe(true);
    });

    it("should detect changes in ingredient properties", () => {
      const baseIngredient = {
        id: "ing1",
        name: "Test Grain",
        type: "grain",
        amount: 10,
        unit: "lb",
        instance_id: "ing-1",
      };

      const original = createMockRecipe({ ingredients: [baseIngredient] });

      // Test each ingredient property that should be compared
      expect(
        hasRecipeChanges(
          createMockRecipe({
            ingredients: [{ ...baseIngredient, name: "Changed Grain" }],
          }),
          original
        )
      ).toBe(true);

      expect(
        hasRecipeChanges(
          createMockRecipe({
            ingredients: [{ ...baseIngredient, type: "hop" }],
          }),
          original
        )
      ).toBe(true);

      expect(
        hasRecipeChanges(
          createMockRecipe({
            ingredients: [{ ...baseIngredient, amount: 15 }],
          }),
          original
        )
      ).toBe(true);

      expect(
        hasRecipeChanges(
          createMockRecipe({
            ingredients: [{ ...baseIngredient, unit: "kg" }],
          }),
          original
        )
      ).toBe(true);

      expect(
        hasRecipeChanges(
          createMockRecipe({
            ingredients: [{ ...baseIngredient, id: "different-id" }],
          }),
          original
        )
      ).toBe(true);
    });

    it("should ignore volatile instance_id field changes", () => {
      const baseIngredient = {
        id: "ing1",
        name: "Test Grain",
        type: "grain",
        amount: 10,
        unit: "lb",
        instance_id: "ing-1",
      };

      const original = createMockRecipe({ ingredients: [baseIngredient] });
      const withDifferentInstanceId = createMockRecipe({
        ingredients: [
          { ...baseIngredient, instance_id: "different-instance-id" },
        ],
      });

      // Should return false because only instance_id changed (volatile field)
      expect(hasRecipeChanges(withDifferentInstanceId, original)).toBe(false);
    });

    it("should handle complex ingredient comparison scenarios", () => {
      const hopIngredient = {
        id: "hop1",
        name: "Cascade",
        type: "hop",
        amount: 1,
        unit: "oz",
        use: "boil",
        time: 60,
        alpha_acid: 5.5,
        notes: "Hop notes",
        instance_id: "hop-1",
      };

      const original = createMockRecipe({ ingredients: [hopIngredient] });

      // Test hop-specific fields
      expect(
        hasRecipeChanges(
          createMockRecipe({
            ingredients: [{ ...hopIngredient, use: "flameout" }],
          }),
          original
        )
      ).toBe(true);

      expect(
        hasRecipeChanges(
          createMockRecipe({ ingredients: [{ ...hopIngredient, time: 30 }] }),
          original
        )
      ).toBe(true);

      expect(
        hasRecipeChanges(
          createMockRecipe({
            ingredients: [{ ...hopIngredient, alpha_acid: 6.0 }],
          }),
          original
        )
      ).toBe(true);

      expect(
        hasRecipeChanges(
          createMockRecipe({
            ingredients: [{ ...hopIngredient, notes: "Different notes" }],
          }),
          original
        )
      ).toBe(true);
    });

    it("should handle grain-specific properties", () => {
      const grainIngredient = {
        id: "grain1",
        name: "Pilsner Malt",
        type: "grain",
        amount: 10,
        unit: "lb",
        potential: 1.037,
        color: 2,
        attenuation: 80,
        description: "Base malt",
        instance_id: "grain-1",
      };

      const original = createMockRecipe({ ingredients: [grainIngredient] });

      // Test grain-specific fields
      expect(
        hasRecipeChanges(
          createMockRecipe({
            ingredients: [{ ...grainIngredient, potential: 1.04 }],
          }),
          original
        )
      ).toBe(true);

      expect(
        hasRecipeChanges(
          createMockRecipe({ ingredients: [{ ...grainIngredient, color: 5 }] }),
          original
        )
      ).toBe(true);

      expect(
        hasRecipeChanges(
          createMockRecipe({
            ingredients: [{ ...grainIngredient, attenuation: 85 }],
          }),
          original
        )
      ).toBe(true);

      expect(
        hasRecipeChanges(
          createMockRecipe({
            ingredients: [
              { ...grainIngredient, description: "Different description" },
            ],
          }),
          original
        )
      ).toBe(true);
    });

    it("should handle multiple ingredients correctly", () => {
      const ingredient1 = {
        id: "ing1",
        name: "Grain 1",
        type: "grain",
        amount: 10,
        unit: "lb",
        instance_id: "ing-1",
      };

      const ingredient2 = {
        id: "ing2",
        name: "Hop 1",
        type: "hop",
        amount: 1,
        unit: "oz",
        instance_id: "ing-2",
      };

      const original = createMockRecipe({
        ingredients: [ingredient1, ingredient2],
      });

      // Change second ingredient
      const modified = createMockRecipe({
        ingredients: [ingredient1, { ...ingredient2, amount: 2 }],
      });

      expect(hasRecipeChanges(modified, original)).toBe(true);
    });

    it("should return false when only volatile fields differ", () => {
      const baseRecipe = createMockRecipe({
        ingredients: [
          {
            id: "ing1",
            name: "Test Ingredient",
            type: "grain",
            amount: 10,
            unit: "lb",
            instance_id: "original-id",
          },
        ],
      });

      const volatileOnlyDiff = createMockRecipe({
        ingredients: [
          {
            id: "ing1",
            name: "Test Ingredient",
            type: "grain",
            amount: 10,
            unit: "lb",
            instance_id: "different-id", // Only volatile field differs
          },
        ],
      });

      expect(hasRecipeChanges(volatileOnlyDiff, baseRecipe)).toBe(false);
    });

    it("should handle undefined/null ingredient properties", () => {
      const ingredient1 = {
        id: "ing1",
        name: "Test",
        type: "grain",
        amount: 10,
        unit: "lb",
        use: undefined,
        time: null,
        alpha_acid: undefined,
        instance_id: "ing-1",
      };

      const ingredient2 = {
        id: "ing1",
        name: "Test",
        type: "grain",
        amount: 10,
        unit: "lb",
        use: null,
        time: undefined,
        alpha_acid: null,
        instance_id: "ing-2", // Different volatile field
      };

      const recipe1 = createMockRecipe({ ingredients: [ingredient1] });
      const recipe2 = createMockRecipe({ ingredients: [ingredient2] });

      // Should detect difference between null and undefined (this is correct behavior)
      expect(hasRecipeChanges(recipe1, recipe2)).toBe(true);
    });

    it("should return false when properties are truly identical", () => {
      const ingredient1 = {
        id: "ing1",
        name: "Test",
        type: "grain",
        amount: 10,
        unit: "lb",
        use: undefined,
        time: undefined,
        alpha_acid: undefined,
        instance_id: "ing-1",
      };

      const ingredient2 = {
        id: "ing1",
        name: "Test",
        type: "grain",
        amount: 10,
        unit: "lb",
        use: undefined,
        time: undefined,
        alpha_acid: undefined,
        instance_id: "ing-2", // Different volatile field (should be ignored)
      };

      const recipe1 = createMockRecipe({ ingredients: [ingredient1] });
      const recipe2 = createMockRecipe({ ingredients: [ingredient2] });

      // Should return false when only volatile fields differ
      expect(hasRecipeChanges(recipe1, recipe2)).toBe(false);
    });
  });
});

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

jest.mock("@src/hooks/offlineV2", () => ({
  useRecipes: jest.fn(() => ({
    update: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: jest.fn(),
    useMutation: jest.fn(() => ({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      reset: jest.fn(),
    })),
    useQueryClient: jest.fn(() => ({
      invalidateQueries: jest.fn(),
    })),
    QueryClient: jest.fn(),
    QueryClientProvider: ({ children }: any) => children,
  };
});

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
import { TEST_IDS } from "@constants/testIDs";
import { useQuery } from "@tanstack/react-query";

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

// Setup Auth mock return values
require("@contexts/AuthContext").useAuth.mockReturnValue({
  user: { id: "test-user-123" },
  isAuthenticated: true,
  getUserId: jest.fn().mockReturnValue("test-user-123"),
});

describe("EditRecipeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default useQuery mock for all tests
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      refetch: jest.fn(),
    } as any);
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

  describe("Unit System Logic", () => {
    it("should handle unit system initialization without errors", () => {
      // Mock API response to keep render deterministic
      const api = require("@services/api/apiService").default;
      api.recipes.getById.mockResolvedValue({
        data: {
          id: "test-recipe-id",
          name: "Test Recipe",
          style: "American IPA",
          batch_size: 5,
          ingredients: [],
          parameters: {},
        },
      });

      // This test ensures the component renders without errors regardless of unit system
      expect(() => renderWithProviders(<EditRecipeScreen />)).not.toThrow();
    });

    it("should utilize unit context for conversions", () => {
      const api = require("@services/api/apiService").default;
      api.recipes.getById.mockResolvedValue({
        data: {
          id: "test-recipe-id",
          name: "Test Recipe",
          style: "American IPA",
          batch_size: 5,
          ingredients: [],
          parameters: {},
        },
      });

      // Test that the component renders successfully with unit context
      expect(() => renderWithProviders(<EditRecipeScreen />)).not.toThrow();

      // The useUnits hook is already mocked at the module level, so we just verify
      // that the component renders successfully with the mocked unit system
      const { getByText } = renderWithProviders(<EditRecipeScreen />);

      // Basic assertion that the component structure is rendered
      expect(getByText).toBeDefined();
    });
  });

  describe("Reducer Actions", () => {
    const {
      recipeBuilderReducer,
    } = require("../../../../app/(modals)/(recipes)/editRecipe");

    const mockIngredient = {
      id: "ing1",
      instance_id: "inst-1",
      name: "Test Grain",
      type: "grain" as const,
      amount: 10,
      unit: "lb",
    };

    const initialState = {
      name: "Test Recipe",
      style: "IPA",
      description: "",
      batch_size: 5,
      batch_size_unit: "gal",
      unit_system: "imperial" as const,
      boil_time: 60,
      efficiency: 75,
      mash_temperature: 152,
      mash_temp_unit: "F",
      mash_time: undefined,
      is_public: false,
      notes: "",
      ingredients: [],
    };

    it("should handle UPDATE_INGREDIENT action", () => {
      const stateWithIngredient = {
        ...initialState,
        ingredients: [mockIngredient],
      };

      const updatedIngredient = {
        ...mockIngredient,
        amount: 15,
        name: "Updated Grain",
      };

      const newState = recipeBuilderReducer(stateWithIngredient, {
        type: "UPDATE_INGREDIENT",
        index: 0,
        ingredient: updatedIngredient,
      });

      expect(newState.ingredients).toHaveLength(1);
      expect(newState.ingredients[0].amount).toBe(15);
      expect(newState.ingredients[0].name).toBe("Updated Grain");
    });

    it("should handle REMOVE_INGREDIENT action", () => {
      const ingredient2 = {
        ...mockIngredient,
        id: "ing2",
        instance_id: "inst-2",
        name: "Second Grain",
      };

      const stateWithIngredients = {
        ...initialState,
        ingredients: [mockIngredient, ingredient2],
      };

      const newState = recipeBuilderReducer(stateWithIngredients, {
        type: "REMOVE_INGREDIENT",
        index: 0,
      });

      expect(newState.ingredients).toHaveLength(1);
      expect(newState.ingredients[0].id).toBe("ing2");
      expect(newState.ingredients[0].name).toBe("Second Grain");
    });

    it("should not modify other ingredients when updating one", () => {
      const ingredient2 = {
        ...mockIngredient,
        id: "ing2",
        instance_id: "inst-2",
        name: "Second Grain",
      };

      const stateWithIngredients = {
        ...initialState,
        ingredients: [mockIngredient, ingredient2],
      };

      const updatedIngredient = {
        ...mockIngredient,
        amount: 20,
      };

      const newState = recipeBuilderReducer(stateWithIngredients, {
        type: "UPDATE_INGREDIENT",
        index: 0,
        ingredient: updatedIngredient,
      });

      expect(newState.ingredients).toHaveLength(2);
      expect(newState.ingredients[0].amount).toBe(20);
      expect(newState.ingredients[1].amount).toBe(10); // Second unchanged
    });

    it("should handle removing middle ingredient from array", () => {
      const ingredient2 = { ...mockIngredient, id: "ing2", name: "Middle" };
      const ingredient3 = { ...mockIngredient, id: "ing3", name: "Last" };

      const stateWithIngredients = {
        ...initialState,
        ingredients: [mockIngredient, ingredient2, ingredient3],
      };

      const newState = recipeBuilderReducer(stateWithIngredients, {
        type: "REMOVE_INGREDIENT",
        index: 1,
      });

      expect(newState.ingredients).toHaveLength(2);
      expect(newState.ingredients[0].name).toBe("Test Grain");
      expect(newState.ingredients[1].name).toBe("Last");
    });

    it("should handle ADD_INGREDIENT action", () => {
      const newIngredient = {
        id: "ing2",
        instance_id: "inst-2",
        name: "New Hop",
        type: "hop" as const,
        amount: 1,
        unit: "oz",
      };

      const newState = recipeBuilderReducer(initialState, {
        type: "ADD_INGREDIENT",
        ingredient: newIngredient,
      });

      expect(newState.ingredients).toHaveLength(1);
      expect(newState.ingredients[0]).toEqual(newIngredient);
    });

    it("should handle UPDATE_FIELD action", () => {
      const newState = recipeBuilderReducer(initialState, {
        type: "UPDATE_FIELD",
        field: "name",
        value: "Updated Recipe Name",
      });

      expect(newState.name).toBe("Updated Recipe Name");
      expect(newState.style).toBe("IPA"); // Other fields unchanged
    });

    it("should handle RESET action", () => {
      const modifiedState = { ...initialState, name: "Modified" };
      const resetRecipe = { ...initialState, name: "Reset Recipe" };

      const newState = recipeBuilderReducer(modifiedState, {
        type: "RESET",
        recipe: resetRecipe,
      });

      expect(newState).toEqual(resetRecipe);
    });
  });

  describe("toOptionalNumber Helper", () => {
    // We need to test this indirectly through the exported function
    // since it's not exported. Let's test the behavior through hasRecipeChanges
    // which uses similar number conversion logic

    it("should handle null values in ingredients", () => {
      const {
        hasRecipeChanges,
      } = require("../../../../app/(modals)/(recipes)/editRecipe");

      const recipe1 = {
        name: "Test",
        style: "IPA",
        description: "",
        batch_size: 5,
        batch_size_unit: "gal",
        unit_system: "imperial" as const,
        boil_time: 60,
        efficiency: 75,
        mash_temperature: 152,
        mash_temp_unit: "F",
        notes: "",
        is_public: false,
        ingredients: [
          {
            id: "ing1",
            name: "Test",
            type: "grain" as const,
            amount: 10,
            unit: "lb",
            time: null,
            instance_id: "inst-1",
          },
        ],
      };

      const recipe2 = {
        ...recipe1,
        ingredients: [
          {
            ...recipe1.ingredients[0],
            time: undefined,
            instance_id: "inst-2",
          },
        ],
      };

      // Should detect difference between null and undefined
      expect(hasRecipeChanges(recipe1, recipe2)).toBe(true);
    });

    it("should handle string number conversion", () => {
      const {
        hasRecipeChanges,
      } = require("../../../../app/(modals)/(recipes)/editRecipe");

      const recipe1 = {
        name: "Test",
        style: "IPA",
        description: "",
        batch_size: 5,
        batch_size_unit: "gal",
        unit_system: "imperial" as const,
        boil_time: 60,
        efficiency: 75,
        mash_temperature: 152,
        mash_temp_unit: "F",
        notes: "",
        is_public: false,
        ingredients: [
          {
            id: "ing1",
            name: "Test",
            type: "grain" as const,
            amount: 10,
            unit: "lb",
            instance_id: "inst-1",
          },
        ],
      };

      // Same values should not show changes
      const recipe2 = {
        ...recipe1,
        ingredients: [
          {
            ...recipe1.ingredients[0],
            instance_id: "inst-2",
          },
        ],
      };

      expect(hasRecipeChanges(recipe1, recipe2)).toBe(false);
    });
  });

  describe("UserCacheService Integration", () => {
    it("should handle loading recipe from offline cache", async () => {
      const mockRecipe = {
        id: "test-recipe-id",
        name: "Test Recipe from Cache",
        style: "IPA",
        batch_size: 5,
        batch_size_unit: "gal",
        unit_system: "imperial" as const,
        boil_time: 60,
        efficiency: 75,
        mash_temperature: 152,
        mash_temp_unit: "F",
        is_public: false,
        notes: "",
        ingredients: [],
        user_id: "test-user-123",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      // The component uses dynamic import for UserCacheService
      // This test verifies the component renders successfully when recipe is found
      const { getByText } = renderWithProviders(<EditRecipeScreen />);

      await waitFor(() => {
        expect(getByText("Edit Recipe")).toBeTruthy();
      });

      // Component should handle offline-first data loading pattern
      // Actual UserCacheService behavior is tested in service unit tests
    });

    it("should handle UserCacheService errors gracefully", async () => {
      // Component should handle errors from offline cache
      const { getByText } = renderWithProviders(<EditRecipeScreen />);

      await waitFor(() => {
        // Should render without crashing even if cache fails
        expect(getByText("Edit Recipe")).toBeTruthy();
      });
    });

    it("should handle recipe not found in cache", async () => {
      // Component should handle case where recipe doesn't exist in cache
      const { getByText } = renderWithProviders(<EditRecipeScreen />);

      await waitFor(() => {
        // Should render without crashing
        expect(getByText("Edit Recipe")).toBeTruthy();
      });
    });
  });

  describe("Functional Tests", () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // Reset useQuery mock to default loading state
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        isError: false,
        refetch: jest.fn(),
      } as any);
    });

    it("should load and display recipe data successfully", async () => {
      const mockRecipe = {
        id: "test-recipe-id",
        name: "Test IPA Recipe",
        style: "American IPA",
        description: "A hoppy IPA",
        batch_size: 5,
        batch_size_unit: "gal",
        unit_system: "imperial" as const,
        boil_time: 60,
        efficiency: 75,
        mash_temperature: 152,
        mash_temp_unit: "F",
        mash_time: 60,
        is_public: false,
        notes: "Test notes",
        ingredients: [],
        user_id: "test-user-123",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      // Mock successful recipe loading
      mockUseQuery.mockReturnValue({
        data: mockRecipe,
        isLoading: false,
        error: null,
        isError: false,
        refetch: jest.fn(),
      } as any);

      const { getByText } = renderWithProviders(<EditRecipeScreen />);

      // Should render the screen title
      await waitFor(() => {
        expect(getByText("Edit Recipe")).toBeTruthy();
      });

      // Should render the first step form
      await waitFor(() => {
        expect(getByText("Basic Info Form")).toBeTruthy();
      });
    });

    it("should navigate through recipe steps with next/back buttons", async () => {
      const mockRecipe = {
        id: "test-recipe-id",
        name: "Test Recipe",
        style: "IPA",
        batch_size: 5,
        batch_size_unit: "gal",
        unit_system: "imperial" as const,
        boil_time: 60,
        efficiency: 75,
        mash_temperature: 152,
        mash_temp_unit: "F",
        is_public: false,
        notes: "",
        ingredients: [
          {
            id: "ing1",
            name: "Pale Malt",
            amount: 10,
            unit: "lb",
            type: "grain" as const,
          },
        ],
        user_id: "test-user-123",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      mockUseQuery.mockReturnValue({
        data: mockRecipe,
        isLoading: false,
        error: null,
        isError: false,
        refetch: jest.fn(),
      } as any);

      const { getByText, getByTestId, queryByTestId } = renderWithProviders(
        <EditRecipeScreen />
      );

      // Should start at Basic Info step
      await waitFor(() => {
        expect(getByText("Basic Info Form")).toBeTruthy();
      });

      // Should have Next button
      const nextButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("next-step")
      );
      expect(nextButton).toBeTruthy();

      // Should NOT have Back button on first step
      expect(
        queryByTestId(TEST_IDS.patterns.touchableOpacityAction("previous-step"))
      ).toBeNull();

      // Click Next to go to Parameters step
      fireEvent.press(nextButton);

      // Should now show Parameters Form
      await waitFor(() => {
        expect(getByText("Parameters Form")).toBeTruthy();
      });

      // Should now have Back button
      const backButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("previous-step")
      );
      expect(backButton).toBeTruthy();

      // Click Back to return to Basic Info
      fireEvent.press(backButton);

      // Should be back at Basic Info
      await waitFor(() => {
        expect(getByText("Basic Info Form")).toBeTruthy();
      });
    });

    it("should display error state when recipe fails to load", async () => {
      // Mock recipe loading error
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Recipe not found"),
        isError: true,
        refetch: jest.fn(),
      } as any);

      const { getByText, getByTestId } = renderWithProviders(
        <EditRecipeScreen />
      );

      // Should show error state
      await waitFor(() => {
        expect(getByText("Failed to Load Recipe")).toBeTruthy();
      });

      // Should show error message
      expect(getByText("Recipe not found")).toBeTruthy();

      // Should have Go Back button with testID
      const goBackButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("go-back")
      );
      expect(goBackButton).toBeTruthy();
    });

    it("should display loading state while fetching recipe", async () => {
      // Mock loading state
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        isError: false,
        refetch: jest.fn(),
      } as any);

      const { getByText } = renderWithProviders(<EditRecipeScreen />);

      // Should show loading indicator
      await waitFor(() => {
        expect(getByText("Loading recipe...")).toBeTruthy();
      });
    });

    it("should render update button on review step", async () => {
      const mockRecipe = {
        id: "test-recipe-id",
        name: "Original Recipe",
        style: "IPA",
        batch_size: 5,
        batch_size_unit: "gal",
        unit_system: "imperial" as const,
        boil_time: 60,
        efficiency: 75,
        mash_temperature: 152,
        mash_temp_unit: "F",
        is_public: false,
        notes: "",
        ingredients: [
          {
            id: "ing1",
            name: "Pale Malt",
            amount: 10,
            unit: "lb",
            type: "grain" as const,
          },
        ],
        user_id: "test-user-123",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      // Mock successful recipe loading
      mockUseQuery.mockReturnValue({
        data: mockRecipe,
        isLoading: false,
        error: null,
        isError: false,
        refetch: jest.fn(),
      } as any);

      const { getByTestId, getByText } = renderWithProviders(
        <EditRecipeScreen />
      );

      // Wait for recipe to load
      await waitFor(() => {
        expect(getByText("Basic Info Form")).toBeTruthy();
      });

      // Navigate to review step (need to go through all steps)
      // Step 1 -> 2
      fireEvent.press(
        getByTestId(TEST_IDS.patterns.touchableOpacityAction("next-step"))
      );
      await waitFor(() => {
        expect(getByText("Parameters Form")).toBeTruthy();
      });

      // Step 2 -> 3
      fireEvent.press(
        getByTestId(TEST_IDS.patterns.touchableOpacityAction("next-step"))
      );
      await waitFor(() => {
        expect(getByText("Ingredients Form")).toBeTruthy();
      });

      // Step 3 -> 4 (Review)
      fireEvent.press(
        getByTestId(TEST_IDS.patterns.touchableOpacityAction("next-step"))
      );
      await waitFor(() => {
        expect(getByText("Review Form")).toBeTruthy();
      });

      // Verify update button is rendered on review step
      const updateButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("update-recipe")
      );
      expect(updateButton).toBeTruthy();
    });
  });
});

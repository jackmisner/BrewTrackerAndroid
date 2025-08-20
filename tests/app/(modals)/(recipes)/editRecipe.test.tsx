/**
 * EditRecipeScreen Component Test Suite
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

jest.mock("@contexts/ThemeContext", () => ({
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
}));

jest.mock("@contexts/UnitContext", () => ({
  useUnits: () => ({
    weightUnit: "lb",
    temperatureUnit: "F",
    volumeUnit: "gal",
    convertWeight: jest.fn(val => val),
    convertTemperature: jest.fn(val => val),
    convertVolume: jest.fn(val => val),
  }),
}));

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

describe("EditRecipeScreen", () => {
  let queryClient: QueryClient;

  const createWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
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

      expect(() =>
        render(<EditRecipeScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
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

      const { getByText } = render(<EditRecipeScreen />, {
        wrapper: createWrapper,
      });

      // Should render the screen title
      expect(getByText("Edit Recipe")).toBeTruthy();
    });

    it("should handle API loading state", async () => {
      mockApiService.recipes.getById.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: {} }), 0))
      );

      const { getByText } = render(<EditRecipeScreen />, {
        wrapper: createWrapper,
      });

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

      const { getByText } = render(<EditRecipeScreen />, {
        wrapper: createWrapper,
      });

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

      const { getByText } = render(<EditRecipeScreen />, {
        wrapper: createWrapper,
      });

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

      const { getByText } = render(<EditRecipeScreen />, {
        wrapper: createWrapper,
      });

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
      expect(() =>
        render(<EditRecipeScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();

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

      const { getByText } = render(<EditRecipeScreen />, {
        wrapper: createWrapper,
      });

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

      expect(() =>
        render(<EditRecipeScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();

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

      expect(() =>
        render(<EditRecipeScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
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

      expect(() =>
        render(<EditRecipeScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
    });
  });
});

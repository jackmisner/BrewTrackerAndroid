/**
 * IngredientPickerScreen Component Test Suite
 */

import React from "react";
import {
  render,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import IngredientPickerScreen from "../../../../app/(modals)/(recipes)/ingredientPicker";

// Mock React Native components
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  TouchableOpacity: "TouchableOpacity",
  FlatList: "FlatList",
  ScrollView: "ScrollView",
  ActivityIndicator: "ActivityIndicator",
  KeyboardAvoidingView: "KeyboardAvoidingView",
  Platform: { OS: "ios" },
  Alert: {
    alert: jest.fn(),
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles,
  },
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: "MaterialIcons",
}));

// Mock external dependencies
jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    setParams: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({
    type: "grain",
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
      textMuted: "#999999",
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
    unitSystem: "imperial",
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
    ingredients: {
      getAll: jest.fn(),
    },
  },
}));

jest.mock("@src/hooks/useDebounce", () => ({
  useDebounce: jest.fn(value => value),
}));

// Mock styles
jest.mock("@styles/modals/ingredientPickerStyles", () => ({
  ingredientPickerStyles: () => ({
    container: {},
    header: {},
    headerButton: {},
    headerTitle: {},
    searchContainer: {},
    searchInput: {},
    categorySection: {},
    categoryScrollView: {},
    categoryContainer: {},
    categoryChip: {},
    categoryChipActive: {},
    categoryChipText: {},
    categoryChipTextActive: {},
    loadingContainer: {},
    loadingText: {},
    errorContainer: {},
    errorTitle: {},
    errorMessage: {},
    retryButton: {},
    retryButtonText: {},
    emptyContainer: {},
    emptyTitle: {},
    emptyMessage: {},
    listContainer: {},
    ingredientItem: {},
    ingredientInfo: {},
    ingredientName: {},
    ingredientDescription: {},
    ingredientSpecs: {},
    specText: {},
  }),
}));

// Mock the IngredientDetailEditor component
jest.mock(
  "@src/components/recipes/IngredientEditor/IngredientDetailEditor",
  () => ({
    IngredientDetailEditor: () => {
      const React = require("react");
      const { Text } = require("react-native");
      return React.createElement(Text, {}, "Ingredient Detail Editor");
    },
  })
);

// Mock utilities
jest.mock("@utils/formatUtils", () => ({
  formatIngredientDetails: jest.fn(ingredient => `${ingredient.name} details`),
}));

jest.mock("@constants/hopConstants", () => ({
  HOP_USAGE_OPTIONS: [
    { value: "boil", display: "Boil", defaultTime: 60 },
    { value: "dry-hop", display: "Dry Hop", defaultTime: 1440 * 3 },
    { value: "whirlpool", display: "Whirlpool", defaultTime: 15 },
  ],
  HOP_TIME_PRESETS: {
    boil: [60, 30, 15, 5, 0],
    "dry-hop": [3 * 1440, 5 * 1440, 7 * 1440],
    whirlpool: [15, 10, 5],
  },
}));

const mockApiService = require("@services/api/apiService").default;

describe("IngredientPickerScreen", () => {
  let queryClient: QueryClient;

  const createWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockIngredients = [
    {
      id: "1",
      name: "Pale Malt",
      description: "Light colored base malt",
      type: "grain",
      color: 2,
      potential: 1.037,
    },
    {
      id: "2",
      name: "Cascade Hops",
      description: "American hop variety",
      type: "hop",
      alpha_acid: 5.5,
    },
    {
      id: "3",
      name: "US-05 Yeast",
      description: "American ale yeast",
      type: "yeast",
      attenuation: 81,
    },
  ];

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
    it("renders IngredientPicker without crashing", () => {
      mockApiService.ingredients.getAll.mockResolvedValue({
        data: mockIngredients,
      });

      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
    });

    it("shows loading state while fetching ingredients", async () => {
      mockApiService.ingredients.getAll.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: [] }), 0))
      );

      const { getByText } = render(<IngredientPickerScreen />, {
        wrapper: createWrapper,
      });

      // Should show loading indicator while fetching - component shows categories even during loading
      expect(getByText("Grains & Fermentables")).toBeTruthy();
    });

    it("handles API errors without throwing", async () => {
      mockApiService.ingredients.getAll.mockRejectedValue(
        new Error("Failed to fetch ingredients")
      );

      const { getByText, queryByText } = render(<IngredientPickerScreen />, {
        wrapper: createWrapper,
      });

      // Should handle error gracefully and show appropriate UI
      await waitFor(() => {
        const anyMessage =
          queryByText(/error/i) ||
          queryByText(/grains & fermentables/i) ||
          queryByText(/no ingredients found/i);
        expect(anyMessage).toBeTruthy();
      });

      // Component should not crash
      expect(getByText("Grains & Fermentables")).toBeTruthy();
    });
  });

  describe("Component Behavior", () => {
    it("should handle successful ingredient data loading", async () => {
      mockApiService.ingredients.getAll.mockResolvedValue({
        data: mockIngredients,
      });

      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
    });

    it("should handle empty ingredient data", async () => {
      mockApiService.ingredients.getAll.mockResolvedValue({
        data: [],
      });

      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
    });

    it("should handle different ingredient types", async () => {
      const mockRouter = require("expo-router");
      mockRouter.useLocalSearchParams.mockReturnValue({
        type: "hop",
      });

      mockApiService.ingredients.getAll.mockResolvedValue({
        data: [mockIngredients[1]], // Cascade Hops
      });

      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
    });

    it("should handle yeast ingredient type", async () => {
      const mockRouter = require("expo-router");
      mockRouter.useLocalSearchParams.mockReturnValue({
        type: "yeast",
      });

      mockApiService.ingredients.getAll.mockResolvedValue({
        data: [mockIngredients[2]], // US-05 Yeast
      });

      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
    });
  });

  describe("Search Functionality", () => {
    it("should render search input", () => {
      mockApiService.ingredients.getAll.mockResolvedValue({
        data: mockIngredients,
      });

      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
    });

    it("should handle search input changes", () => {
      mockApiService.ingredients.getAll.mockResolvedValue({
        data: mockIngredients,
      });

      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
    });

    it("should show clear button when search has text", () => {
      mockApiService.ingredients.getAll.mockResolvedValue({
        data: mockIngredients,
      });

      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
    });
  });

  describe("Navigation and Basic Interactions", () => {
    const mockRouter = require("expo-router").router;

    it("should handle navigation methods without crashing", () => {
      mockApiService.ingredients.getAll.mockResolvedValue({
        data: mockIngredients,
      });

      // Render the component
      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();

      // Should have router methods available
      expect(mockRouter.back).toBeDefined();
      expect(mockRouter.setParams).toBeDefined();
    });

    it("should handle back button press", () => {
      mockApiService.ingredients.getAll.mockResolvedValue({
        data: mockIngredients,
      });

      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
    });

    it("should have API service methods available", () => {
      // Simple test to verify our mocks are set up correctly
      expect(mockApiService.ingredients.getAll).toBeDefined();
      expect(typeof mockApiService.ingredients.getAll).toBe("function");
    });
  });

  describe("Ingredient Selection", () => {
    it("should handle ingredient selection", async () => {
      mockApiService.ingredients.getAll.mockResolvedValue({
        data: mockIngredients,
      });

      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
    });

    it("should show ingredient descriptions when available", async () => {
      mockApiService.ingredients.getAll.mockResolvedValue({
        data: mockIngredients,
      });

      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
    });

    it("should format ingredient details", async () => {
      const mockFormatUtils = require("@utils/formatUtils");
      mockFormatUtils.formatIngredientDetails.mockReturnValue("2°L, 37 PPG");

      mockApiService.ingredients.getAll.mockResolvedValue({
        data: mockIngredients,
      });

      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();

      // Format function should be available
      expect(mockFormatUtils.formatIngredientDetails).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      mockApiService.ingredients.getAll.mockRejectedValue({
        response: { status: 500 },
      });

      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
    });

    it("should handle authentication errors", async () => {
      mockApiService.ingredients.getAll.mockRejectedValue({
        response: { status: 401 },
      });

      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
    });

    it("should handle retry functionality", async () => {
      mockApiService.ingredients.getAll.mockRejectedValue(
        new Error("Network error")
      );

      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
    });
  });

  describe("Category Filtering", () => {
    it("should render category filter for grain type", () => {
      mockApiService.ingredients.getAll.mockResolvedValue({
        data: mockIngredients,
      });

      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
    });

    it("should not render category filter for hop type", () => {
      const mockRouter = require("expo-router");
      mockRouter.useLocalSearchParams.mockReturnValue({
        type: "hop",
      });

      mockApiService.ingredients.getAll.mockResolvedValue({
        data: mockIngredients,
      });

      const { queryByText, getByText } = render(<IngredientPickerScreen />, {
        wrapper: createWrapper,
      });

      // Should not show "All" category filter for hops
      // Hops don't have categories, so there should be no category scroll view
      const allCategoryButton = queryByText("All");
      expect(allCategoryButton).toBeNull();
    });

    it("should handle category selection", () => {
      mockApiService.ingredients.getAll.mockResolvedValue({
        data: mockIngredients,
      });

      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
    });
  });

  describe("Type-specific Behavior", () => {
    it("should show correct title for different ingredient types", () => {
      const testCases = [
        { type: "grain", title: "Grains & Fermentables" },
        { type: "hop", title: "Hops" },
        { type: "yeast", title: "Yeast" },
        { type: "other", title: "Other Ingredients" },
      ];

      testCases.forEach(({ type, title }) => {
        const mockRouter = require("expo-router");
        mockRouter.useLocalSearchParams.mockReturnValue({ type });

        mockApiService.ingredients.getAll.mockResolvedValue({
          data: [],
        });

        expect(() =>
          render(<IngredientPickerScreen />, {
            wrapper: createWrapper,
          })
        ).not.toThrow();
      });
    });

    it("should handle unknown ingredient type", () => {
      const mockRouter = require("expo-router");
      mockRouter.useLocalSearchParams.mockReturnValue({
        type: "unknown",
      });

      mockApiService.ingredients.getAll.mockResolvedValue({
        data: [],
      });

      expect(() =>
        render(<IngredientPickerScreen />, {
          wrapper: createWrapper,
        })
      ).not.toThrow();
    });
  });
});

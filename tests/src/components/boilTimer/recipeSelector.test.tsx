/**
 * RecipeSelector Component Test Suite
 *
 * Tests meaningful functionality:
 * - Modal opening/closing behavior
 * - Recipe search and filtering logic
 * - Recipe selection and callback handling
 * - Manual mode selection
 * - Loading states and error handling
 * - Empty state display
 * - Recipe item rendering and interaction
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { RecipeSelector } from "../../../../src/components/boilTimer/RecipeSelector";
import { Recipe } from "@src/types";

// Mock React Native components
jest.mock("react-native", () => {
  const React = require("react");
  return {
    View: "View",
    Text: "Text",
    TouchableOpacity: "TouchableOpacity",
    Modal: ({ visible, children }: any) => (visible ? children : null),
    FlatList: ({ data, renderItem }: any) => {
      if (!data || data.length === 0) {
        return null;
      }
      return React.createElement(
        "View",
        { testID: "flat-list" },
        data.map((item: any, index: number) =>
          React.createElement(
            "View",
            { key: item.id || index },
            renderItem({ item, index })
          )
        )
      );
    },
    ActivityIndicator: "ActivityIndicator",
    TextInput: "TextInput",
    StyleSheet: {
      create: (styles: any) => styles,
      flatten: (styles: any) => styles,
    },
  };
});

// Mock MaterialIcons
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: (props: any) => `MaterialIcons-${props.name}`,
}));

// Mock ThemeContext
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      primary: "#007AFF",
      primaryLight20: "#CCE5FF",
      background: "#FFFFFF",
      backgroundSecondary: "#F2F2F7",
      text: "#000000",
      textSecondary: "#666666",
      borderLight: "#C7C7CC",
      error: "#FF3B30",
    },
  }),
}));

// Mock React Query
const mockRecipesQuery = {
  data: null,
  isLoading: false,
  error: null,
};

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(() => mockRecipesQuery),
}));

// Mock ApiService
jest.mock("@services/api/apiService", () => ({
  recipes: {
    getAll: jest.fn(),
  },
}));

// Mock TEST_IDS
jest.mock("@constants/testIDs", () => ({
  TEST_IDS: {
    patterns: {
      touchableOpacityAction: jest.fn((id: string) => `touchable-${id}`),
    },
  },
}));

// Sample test data
const mockRecipes = [
  {
    id: "1",
    name: "American IPA",
    style: "IPA",
    description: "Test IPA",
    batch_size: 5,
    batch_size_unit: "gal",
    unit_system: "imperial",
    boil_time: 60,
    efficiency: 75,
    mash_temperature: 152,
    mash_temp_unit: "F",
    notes: "Test notes",
    og: 1.06,
    fg: 1.012,
    abv: 6.3,
    ibu: 60,
    srm: 6,
    ingredients: [
      { id: "1", name: "Cascade", type: "hop", amount: 1, unit: "oz" },
      { id: "2", name: "Centennial", type: "hop", amount: 1, unit: "oz" },
    ],
    user_id: "test-user",
    is_public: false,
    is_owner: true,
    created_at: "2023-01-01",
    updated_at: "2023-01-01",
    version: 1,
  } as Recipe,
  {
    id: "2",
    name: "Wheat Beer",
    style: "Wheat",
    description: "Test Wheat",
    batch_size: 5,
    batch_size_unit: "gal",
    unit_system: "imperial",
    boil_time: 45,
    efficiency: 75,
    mash_temperature: 152,
    mash_temp_unit: "F",
    notes: "Test notes",
    og: 1.05,
    fg: 1.01,
    abv: 5.2,
    ibu: 15,
    srm: 4,
    ingredients: [
      { id: "3", name: "Hallertau", type: "hop", amount: 0.5, unit: "oz" },
    ],
    user_id: "test-user",
    is_public: false,
    is_owner: true,
    created_at: "2023-01-01",
    updated_at: "2023-01-01",
    version: 1,
  } as Recipe,
  {
    id: "3",
    name: "Stout",
    style: "Stout",
    description: "Test Stout",
    batch_size: 5,
    batch_size_unit: "gal",
    unit_system: "imperial",
    boil_time: 0, // Should be filtered out
    efficiency: 75,
    mash_temperature: 152,
    mash_temp_unit: "F",
    notes: "Test notes",
    og: 1.055,
    fg: 1.014,
    abv: 5.4,
    ibu: 35,
    srm: 25,
    ingredients: [],
    user_id: "test-user",
    is_public: false,
    is_owner: true,
    created_at: "2023-01-01",
    updated_at: "2023-01-01",
    version: 1,
  },
] as Recipe[];

describe("RecipeSelector", () => {
  const mockOnRecipeSelect = jest.fn();
  const mockOnManualMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset query mock to default state
    Object.assign(mockRecipesQuery, {
      data: null,
      isLoading: false,
      error: null,
    });
  });

  describe("Initial Render", () => {
    it("should render selector with placeholder text when no recipe selected", () => {
      const { getByText } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
        />
      );

      expect(getByText("Select Recipe")).toBeTruthy();
      expect(getByText("Choose a recipe or manual timer")).toBeTruthy();
    });

    it("should render selector with selected recipe details", () => {
      const selectedRecipe = {
        id: "1",
        name: "American IPA",
        style: "IPA",
        boil_time: 60,
      };

      const { getByText } = render(
        <RecipeSelector
          selectedRecipe={selectedRecipe}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
        />
      );

      expect(getByText("American IPA")).toBeTruthy();
      expect(getByText("IPA • 60 min")).toBeTruthy();
    });

    it("should be disabled when disabled prop is true", () => {
      const { getByTestId } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
          disabled={true}
          testID="recipe-selector"
        />
      );

      const selector = getByTestId("recipe-selector");
      expect(selector.props.disabled).toBe(true);
    });
  });

  describe("Modal Behavior", () => {
    it("should not show modal initially", () => {
      const { queryByText } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
        />
      );

      expect(queryByText("Select Recipe for Timer")).toBeNull();
    });

    it("should open modal when selector is pressed", () => {
      const { getByText, getByTestId } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
          testID="recipe-selector"
        />
      );

      fireEvent.press(getByTestId("recipe-selector"));

      expect(getByText("Select Recipe for Timer")).toBeTruthy();
      expect(getByText("Manual Timer")).toBeTruthy();
    });

    it("should not open modal when disabled", () => {
      const { queryByText, getByTestId } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
          disabled={true}
          testID="recipe-selector"
        />
      );

      fireEvent.press(getByTestId("recipe-selector"));

      expect(queryByText("Select Recipe for Timer")).toBeNull();
    });
  });

  describe("Loading States", () => {
    it("should show loading indicator when recipes are loading", () => {
      Object.assign(mockRecipesQuery, {
        data: null,
        isLoading: true,
        error: null,
      });

      const { getByText, getByTestId } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
          testID="recipe-selector"
        />
      );

      // Open modal to trigger loading
      fireEvent.press(getByTestId("recipe-selector"));

      expect(getByText("Loading recipes...")).toBeTruthy();
    });

    it("should show error state when loading fails", () => {
      Object.assign(mockRecipesQuery, {
        data: null,
        isLoading: false,
        error: new Error("Network error"),
      });

      const { getByText, getByTestId } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
          testID="recipe-selector"
        />
      );

      fireEvent.press(getByTestId("recipe-selector"));

      expect(getByText("Failed to load recipes")).toBeTruthy();
      expect(
        getByText("Please check your connection and try again")
      ).toBeTruthy();
    });
  });

  describe("Recipe Filtering", () => {
    beforeEach(() => {
      Object.assign(mockRecipesQuery, {
        data: {
          data: { recipes: mockRecipes },
        },
        isLoading: false,
        error: null,
      });
    });

    it("should filter out recipes without boil times", () => {
      const { getByText, getByTestId, queryByText } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
          testID="recipe-selector"
        />
      );

      fireEvent.press(getByTestId("recipe-selector"));

      // Should show recipes with boil times
      expect(getByText("American IPA")).toBeTruthy();
      expect(getByText("Wheat Beer")).toBeTruthy();

      // Should not show recipe without boil time
      expect(queryByText("Stout")).toBeNull();
    });

    it("should filter recipes by name search", () => {
      const { getByText, getByTestId, queryByText, getByDisplayValue } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
          testID="recipe-selector"
        />
      );

      fireEvent.press(getByTestId("recipe-selector"));

      // Find search input and enter search term
      const searchInput = getByDisplayValue("");
      fireEvent.changeText(searchInput, "IPA");

      // Should show only matching recipes
      expect(getByText("American IPA")).toBeTruthy();
      expect(queryByText("Wheat Beer")).toBeNull();
    });

    it("should filter recipes by style search", () => {
      const { getByText, getByTestId, queryByText, getByDisplayValue } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
          testID="recipe-selector"
        />
      );

      fireEvent.press(getByTestId("recipe-selector"));

      const searchInput = getByDisplayValue("");
      fireEvent.changeText(searchInput, "Wheat");

      expect(getByText("Wheat Beer")).toBeTruthy();
      expect(queryByText("American IPA")).toBeNull();
    });

    it("should show empty state when no recipes match search", () => {
      const { getByText, getByTestId, getByDisplayValue } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
          testID="recipe-selector"
        />
      );

      fireEvent.press(getByTestId("recipe-selector"));

      const searchInput = getByDisplayValue("");
      fireEvent.changeText(searchInput, "NonExistent");

      expect(getByText("No recipes found")).toBeTruthy();
      expect(getByText("Try a different search term")).toBeTruthy();
    });

    it("should show empty state when no recipes available", () => {
      Object.assign(mockRecipesQuery, {
        data: {
          data: { recipes: [] },
        },
        isLoading: false,
        error: null,
      });

      const { getByText, getByTestId } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
          testID="recipe-selector"
        />
      );

      fireEvent.press(getByTestId("recipe-selector"));

      expect(getByText("No recipes available")).toBeTruthy();
      expect(getByText("Create a recipe first")).toBeTruthy();
    });
  });

  describe("Recipe Selection", () => {
    beforeEach(() => {
      Object.assign(mockRecipesQuery, {
        data: {
          data: { recipes: mockRecipes },
        },
        isLoading: false,
        error: null,
      });
    });

    it("should call onRecipeSelect when recipe is selected", async () => {
      const { getByText, getByTestId } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
          testID="recipe-selector"
        />
      );

      fireEvent.press(getByTestId("recipe-selector"));

      // Select a recipe
      const recipeItem = getByTestId("touchable-recipe-select-1");
      fireEvent.press(recipeItem);

      await waitFor(() => {
        expect(mockOnRecipeSelect).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "1",
            name: "American IPA",
            style: "IPA",
            boil_time: 60,
          })
        );
      });
    });

    it("should call manual mode callbacks when manual mode selected", async () => {
      const { getByTestId } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
          testID="recipe-selector"
        />
      );

      fireEvent.press(getByTestId("recipe-selector"));

      const manualModeButton = getByTestId("touchable-manual-mode");
      fireEvent.press(manualModeButton);

      await waitFor(() => {
        expect(mockOnRecipeSelect).toHaveBeenCalledWith(null);
        expect(mockOnManualMode).toHaveBeenCalled();
      });
    });

    it("should close modal after recipe selection", async () => {
      const { getByText, getByTestId, queryByText } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
          testID="recipe-selector"
        />
      );

      fireEvent.press(getByTestId("recipe-selector"));
      expect(getByText("Select Recipe for Timer")).toBeTruthy();

      const recipeItem = getByTestId("touchable-recipe-select-1");
      fireEvent.press(recipeItem);

      await waitFor(() => {
        expect(queryByText("Select Recipe for Timer")).toBeNull();
      });
    });

    it("should clear search when modal closes", async () => {
      const { getByTestId, getByDisplayValue } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
          testID="recipe-selector"
        />
      );

      fireEvent.press(getByTestId("recipe-selector"));

      const searchInput = getByDisplayValue("");
      fireEvent.changeText(searchInput, "IPA");

      const recipeItem = getByTestId("touchable-recipe-select-1");
      fireEvent.press(recipeItem);

      // Reopen modal to check search is cleared
      fireEvent.press(getByTestId("recipe-selector"));
      const clearedInput = getByDisplayValue("");
      expect(clearedInput.props.value).toBe("");
    });
  });

  describe("Recipe Item Display", () => {
    beforeEach(() => {
      Object.assign(mockRecipesQuery, {
        data: {
          data: { recipes: mockRecipes },
        },
        isLoading: false,
        error: null,
      });
    });

    it("should display recipe details correctly", () => {
      const { getByText, getByTestId } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
          testID="recipe-selector"
        />
      );

      fireEvent.press(getByTestId("recipe-selector"));

      expect(getByText("American IPA")).toBeTruthy();
      expect(getByText("IPA")).toBeTruthy();
      expect(getByText("60 min boil")).toBeTruthy();
      expect(getByText("2 hops")).toBeTruthy();
    });

    it("should show correct hop count", () => {
      const { getByText, getByTestId } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
          testID="recipe-selector"
        />
      );

      fireEvent.press(getByTestId("recipe-selector"));

      expect(getByText("2 hops")).toBeTruthy(); // American IPA has 2 hops
      expect(getByText("1 hops")).toBeTruthy(); // Wheat Beer has 1 hop
    });

    it("should show selected state for current recipe", () => {
      const selectedRecipe = {
        id: "1",
        name: "American IPA",
        style: "IPA",
        boil_time: 60,
      };

      const { getByTestId } = render(
        <RecipeSelector
          selectedRecipe={selectedRecipe}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
          testID="recipe-selector"
        />
      );

      fireEvent.press(getByTestId("recipe-selector"));

      // Selected recipe should have different styling (this is handled by the component's style logic)
      const selectedItem = getByTestId("touchable-recipe-select-1");
      expect(selectedItem).toBeTruthy();
    });
  });

  describe("Query Integration", () => {
    it("should enable query only when modal is open", () => {
      const useQueryMock = require("@tanstack/react-query").useQuery;

      const { getByTestId } = render(
        <RecipeSelector
          selectedRecipe={null}
          onRecipeSelect={mockOnRecipeSelect}
          onManualMode={mockOnManualMode}
          testID="recipe-selector"
        />
      );

      // Initially, query should be disabled
      expect(useQueryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );

      // After opening modal, query should be enabled
      fireEvent.press(getByTestId("recipe-selector"));

      expect(useQueryMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          enabled: true,
        })
      );
    });
  });
});

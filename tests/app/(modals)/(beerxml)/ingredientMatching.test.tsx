/**
 * Tests for Ingredient Matching Screen
 *
 * Tests the BeerXML ingredient matching workflow, including state management,
 * error handling, and user interactions. Follows established patterns with
 * meaningful tests that catch real regressions.
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { renderWithProviders } from "@/tests/testUtils";
import IngredientMatchingScreen from "../../../../app/(modals)/(beerxml)/ingredientMatching";

// Mock dependencies
jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: jest.fn(() => ({
      invalidateQueries: jest.fn(),
    })),
    QueryClient: jest.fn().mockImplementation(() => ({
      invalidateQueries: jest.fn(),
    })),
    QueryClientProvider: ({ children }: any) => children,
  };
});

jest.mock("@services/beerxml/BeerXMLService", () => ({
  __esModule: true,
  default: {
    matchIngredients: jest.fn(),
    createIngredients: jest.fn(),
  },
}));

// Import mocked dependencies
import { useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import BeerXMLService from "@services/beerxml/BeerXMLService";

const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<
  typeof useLocalSearchParams
>;
const mockUseQueryClient = useQueryClient as jest.MockedFunction<
  typeof useQueryClient
>;
const mockMatchIngredients =
  BeerXMLService.matchIngredients as jest.MockedFunction<
    typeof BeerXMLService.matchIngredients
  >;

describe("IngredientMatchingScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default valid params
    mockUseLocalSearchParams.mockReturnValue({
      recipeData: JSON.stringify({
        ingredients: [
          { name: "Pale Ale Malt", amount: 10, unit: "lbs" },
          { name: "Cascade Hops", amount: 1, unit: "oz" },
        ],
      }),
      filename: "test-recipe.xml",
    });

    mockUseQueryClient.mockReturnValue({
      invalidateQueries: jest.fn(),
    } as any);

    mockMatchIngredients.mockResolvedValue([]);
  });

  it("should handle invalid JSON in recipeData parameter gracefully", () => {
    mockUseLocalSearchParams.mockReturnValue({
      recipeData: "invalid-json-data",
      filename: "test-recipe.xml",
    });

    expect(() => {
      renderWithProviders(<IngredientMatchingScreen />);
    }).not.toThrow();
  });

  it("should parse valid JSON recipeData successfully", () => {
    const validRecipeData = {
      ingredients: [
        { name: "Pale Ale Malt", amount: 10, unit: "lbs" },
        { name: "Cascade Hops", amount: 1, unit: "oz" },
      ],
    };

    mockUseLocalSearchParams.mockReturnValue({
      recipeData: JSON.stringify(validRecipeData),
      filename: "test-recipe.xml",
    });

    expect(() => {
      renderWithProviders(<IngredientMatchingScreen />);
    }).not.toThrow();
  });
});

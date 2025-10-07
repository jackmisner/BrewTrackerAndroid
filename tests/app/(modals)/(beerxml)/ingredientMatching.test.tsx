/* eslint-disable import/first */
/**
 * Tests for Ingredient Matching Screen
 *
 * Tests the BeerXML ingredient matching workflow, including state management,
 * error handling, and user interactions. Follows established patterns with
 * meaningful tests that catch real regressions.
 */

import React from "react";
import { fireEvent, waitFor } from "@testing-library/react-native";
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
import { useLocalSearchParams, router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import BeerXMLService from "@services/beerxml/BeerXMLService";
import { TEST_IDS } from "@constants/testIDs";
import { matches } from "@testing-library/react-native/build/matches";
import { IngredientUnit } from "@/src/types";

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
const mockCreateIngredients =
  BeerXMLService.createIngredients as jest.MockedFunction<
    typeof BeerXMLService.createIngredients
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

  it("should show error when recipe data has no ingredients", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      recipeData: JSON.stringify({ name: "Test Recipe" }), // No ingredients
      filename: "test-recipe.xml",
    });

    const { findByText } = renderWithProviders(<IngredientMatchingScreen />);

    // Should show error message after state update
    const errorText = await findByText("Invalid recipe data provided");
    expect(errorText).toBeTruthy();
  });

  it("should successfully match ingredients and show reviewing state", async () => {
    const matchingResults = [
      {
        imported: {
          id: "ing-1",
          name: "Pale Ale Malt",
          amount: 10,
          unit: "lb" as const,
          type: "grain" as const,
          potential: 1.037,
          color: 3,
        },
        best_match: {
          ingredient: {
            id: "123",
            name: "Pale Ale Malt",
            type: "grain",
          },
          confidence: 0.95,
          reasons: ["Exact name match"],
        },
        confidence: 0.95,
        matches: [],
        requires_new: false,
      },
    ];

    mockMatchIngredients.mockResolvedValue(matchingResults);

    const { findByText, findAllByText } = renderWithProviders(
      <IngredientMatchingScreen />
    );

    // Should show progress indicator
    const progressText = await findByText("Ingredient 1 of 1");
    expect(progressText).toBeTruthy();

    // Should show ingredient name (multiple times - imported and matched)
    const ingredientNames = await findAllByText("Pale Ale Malt");
    expect(ingredientNames.length).toBeGreaterThan(0);

    // Should show confidence score
    const confidence = await findByText("95% confidence");
    expect(confidence).toBeTruthy();
  });

  it("should show error state with retry button when matching fails", async () => {
    mockMatchIngredients.mockRejectedValue(
      new Error("Network error - failed to match ingredients")
    );

    const { findByText, getByTestId } = renderWithProviders(
      <IngredientMatchingScreen />
    );

    // Should show error message
    const errorText = await findByText(
      "Network error - failed to match ingredients"
    );
    expect(errorText).toBeTruthy();

    // Should show retry button
    const retryButton = getByTestId(
      TEST_IDS.patterns.touchableOpacityAction("try-again")
    );
    expect(retryButton).toBeTruthy();

    // Should show go back button
    const goBackButton = getByTestId(
      TEST_IDS.patterns.touchableOpacityAction("go-back")
    );
    expect(goBackButton).toBeTruthy();
  });

  it("should allow user to switch between use_existing and create_new options", async () => {
    const matchingResults = [
      {
        imported: {
          id: "ing-1",
          name: "Cascade",
          amount: 2,
          unit: "oz" as const,
          type: "hop" as const,
          alpha_acid: 5.5,
        },
        best_match: {
          ingredient: {
            id: "123",
            name: "Cascade",
            type: "hop",
          },
          confidence: 0.95,
          reasons: ["Exact name match"],
        },
        confidence: 0.95,
        matches: [],
        requires_new: false,
      },
    ];

    mockMatchIngredients.mockResolvedValue(matchingResults);

    const { findByText, getByTestId } = renderWithProviders(
      <IngredientMatchingScreen />
    );

    // Wait for matching to complete
    await findByText("Ingredient 1 of 1");

    // Should initially have "use_existing" selected (best match found)
    const useExistingButton = getByTestId(
      TEST_IDS.patterns.touchableOpacityAction("use-existing-ingredient")
    );
    expect(useExistingButton).toBeTruthy();

    // Click create new button
    const createNewButton = getByTestId(
      TEST_IDS.patterns.touchableOpacityAction("create-new-ingredient")
    );
    fireEvent.press(createNewButton);

    // Should show "Create New Ingredient" text
    const createNewText = await findByText("Create New Ingredient");
    expect(createNewText).toBeTruthy();

    // Should show what will be created
    const willCreateText = await findByText("Will create: Cascade");
    expect(willCreateText).toBeTruthy();
  });

  it("should navigate between multiple ingredients using next/previous buttons", async () => {
    const matchingResults = [
      {
        imported: {
          id: "ing-1",
          name: "Pale Ale Malt",
          amount: 10,
          unit: "lb" as const,
          type: "grain" as const,
        },
        best_match: {
          ingredient: { id: "123", name: "Pale Ale Malt", type: "grain" },
          confidence: 0.95,
          reasons: ["Exact name match"],
        },
        confidence: 0.95,
        requires_new: false,
        matches: [],
      },
      {
        imported: {
          id: "ing-2",
          name: "Cascade",
          amount: 2,
          unit: "oz" as const,
          type: "hop" as const,
          alpha_acid: 5.5,
        },
        best_match: {
          ingredient: { id: "456", name: "Cascade Hops", type: "hop" },
          confidence: 0.9,
          reasons: ["Exact name match"],
        },
        confidence: 0.9,
        requires_new: false,
        matches: [],
      },
    ];

    mockMatchIngredients.mockResolvedValue(matchingResults);

    const { findByText, findAllByText, getByTestId } = renderWithProviders(
      <IngredientMatchingScreen />
    );

    // Should start at first ingredient
    await findByText("Ingredient 1 of 2");
    const paleAleMaltElements = await findAllByText("Pale Ale Malt");
    expect(paleAleMaltElements.length).toBeGreaterThan(0);

    // Click next button
    const nextButton = getByTestId(
      TEST_IDS.patterns.touchableOpacityAction("next-ingredient")
    );
    fireEvent.press(nextButton);

    // Should show second ingredient
    await findByText("Ingredient 2 of 2");
    const cascadeHopsElements = await findAllByText("Cascade Hops");
    expect(cascadeHopsElements.length).toBeGreaterThan(0);

    // Click previous button
    const previousButton = getByTestId(
      TEST_IDS.patterns.touchableOpacityAction("previous-ingredient")
    );
    fireEvent.press(previousButton);

    // Should be back at first ingredient
    await findByText("Ingredient 1 of 2");
  });

  it("should complete matching and navigate to import review", async () => {
    const matchingResults = [
      {
        imported: {
          id: "ing-3",
          name: "Custom Yeast",
          amount: 1,
          unit: "pkg" as IngredientUnit,
          type: "yeast" as const,
          attenuation: 75,
        },
        best_match: undefined, // No match - will create new
        suggestedIngredientData: {
          name: "Custom Yeast",
          type: "yeast",
          attenuation: 75,
          description: "Imported from BeerXML",
        },
        confidence: 0,
        matches: [],
        requires_new: true,
      },
    ];

    const createdIngredient = {
      id: "new-123",
      ingredient_id: "new-123",
      name: "Custom Yeast",
      type: "yeast",
    };

    mockMatchIngredients.mockResolvedValue(matchingResults);
    mockCreateIngredients.mockResolvedValue([createdIngredient]);

    const mockInvalidateQueries = jest.fn();
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    } as any);

    const { findByText, getByTestId } = renderWithProviders(
      <IngredientMatchingScreen />
    );

    // Wait for matching to complete
    await findByText("Ingredient 1 of 1");

    // Should show "no match" message
    const noMatchText = await findByText(
      "No matching ingredient found. A new ingredient will be created."
    );
    expect(noMatchText).toBeTruthy();

    // Click complete import button
    const completeButton = getByTestId(
      TEST_IDS.patterns.touchableOpacityAction("complete-import")
    );
    fireEvent.press(completeButton);

    // Should call createIngredients
    await waitFor(() => {
      expect(mockCreateIngredients).toHaveBeenCalledWith([
        expect.objectContaining({
          name: "Custom Yeast",
          type: "yeast",
          attenuation: 75,
        }),
      ]);
    });

    // Should navigate to import review
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith({
        pathname: "/(modals)/(beerxml)/importReview",
        params: expect.objectContaining({
          filename: "test-recipe.xml",
          createdIngredientsCount: "1",
        }),
      });
    });

    // Should invalidate ingredient queries
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["ingredients"],
    });
  });
});
